import AsyncStorage from '@react-native-async-storage/async-storage';
import rawData from '../../data/lucky_stores.json';

export interface LuckyStore {
  id: string;
  name: string;
  address: string;
  region: string;
  phone: string;
  lat: number;
  lng: number;
  firstWins: number;
  secondWins: number;
  autoWins: number;
  manualWins: number;
  semiAutoWins: number;
  lastRound: number;
  lastRank: number;
  totalWins: number;
  score: number;
}

export interface LuckyStorePayload {
  source: string;
  generatedAt: string;
  latestRound: number;
  startRound: number;
  roundsIncluded: number;
  maxStores?: number;
  periodLabel: string;
  stores: LuckyStore[];
}

export type StoreRankFilter = 'all' | 'first' | 'second';
export type LuckyStoreMode = 'nearbyRetail' | 'nearbyLucky' | 'nationalLucky';

export interface StoreLocation {
  lat: number;
  lng: number;
}

export interface LuckyStoreWithDistance extends LuckyStore {
  distanceKm: number;
}

const REMOTE_LUCKY_STORES_URL =
  'https://raw.githubusercontent.com/YooGeunHyuk/lotto-angle-app/main/data/lucky_stores.json';
const CACHE_KEY = '@lotto/luckyStores.v1';
const FETCH_TIMEOUT_MS = 15000;

// 모듈 변수로 두면 함수들이 매번 최신 데이터를 참조할 수 있고,
// 화면이 import한 export 도 mutate된 값을 보게 된다.
export let luckyStorePayload: LuckyStorePayload = rawData as LuckyStorePayload;
export let luckyStores: LuckyStore[] = luckyStorePayload.stores;

const listeners = new Set<() => void>();

export function subscribeLuckyStores(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setPayload(p: LuckyStorePayload): void {
  luckyStorePayload = p;
  luckyStores = p.stores;
  listeners.forEach(l => {
    try { l(); } catch { /* swallow */ }
  });
}

function isValidPayload(p: unknown): p is LuckyStorePayload {
  if (!p || typeof p !== 'object') return false;
  const x = p as Record<string, unknown>;
  return Array.isArray(x.stores) && typeof x.latestRound === 'number';
}

let initialized = false;

export async function loadLuckyStores(): Promise<void> {
  // 1) 첫 호출일 때 AsyncStorage 캐시 적용
  if (!initialized) {
    initialized = true;
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (isValidPayload(parsed) && parsed.latestRound > luckyStorePayload.latestRound) {
          setPayload(parsed);
        }
      }
    } catch {
      // ignore corrupted cache
    }
  }

  // 2) 원격에서 최신 데이터 시도. 실패해도 조용히 fallback.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`${REMOTE_LUCKY_STORES_URL}?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-cache',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return;
    const data = await res.json();
    if (isValidPayload(data) && data.latestRound > luckyStorePayload.latestRound) {
      setPayload(data);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
    }
  } catch {
    // 네트워크 실패 — 현재 표시 중인 데이터(번들 또는 캐시) 유지
  }
}

export function filterLuckyStores(filter: StoreRankFilter): LuckyStore[] {
  if (filter === 'first') return luckyStores.filter(store => store.firstWins > 0);
  if (filter === 'second') return luckyStores.filter(store => store.secondWins > 0);
  return luckyStores;
}

export function distanceKm(from: StoreLocation, to: StoreLocation): number {
  const earthRadiusKm = 6371;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearbyLuckyStores(location: StoreLocation, filter: StoreRankFilter, radiusKm = 35): LuckyStoreWithDistance[] {
  const stores = filterLuckyStores(filter)
    .map(store => ({
      ...store,
      distanceKm: distanceKm(location, { lat: store.lat, lng: store.lng }),
    }));

  const nearby = stores.filter(store => store.distanceKm <= radiusKm);
  const useStores = nearby.length >= 8 ? nearby : stores.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 40);

  return useStores.sort((a, b) => b.score - a.score || b.totalWins - a.totalWins || a.distanceKm - b.distanceKm);
}

export function nationalLuckyStores(): LuckyStore[] {
  return [...luckyStores].sort((a, b) =>
    b.firstWins - a.firstWins ||
    b.secondWins - a.secondWins ||
    b.totalWins - a.totalWins ||
    b.lastRound - a.lastRound
  );
}

export function storeSummary(store: LuckyStore): string {
  return `1등 ${store.firstWins}회 · 2등 ${store.secondWins}회`;
}
