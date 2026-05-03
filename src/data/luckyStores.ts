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

export const luckyStorePayload = rawData as LuckyStorePayload;
export const luckyStores = luckyStorePayload.stores;

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
