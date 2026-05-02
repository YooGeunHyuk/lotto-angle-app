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
  maxStores: number;
  periodLabel: string;
  stores: LuckyStore[];
}

export type StoreRankFilter = 'all' | 'first' | 'second';

export const luckyStorePayload = rawData as LuckyStorePayload;
export const luckyStores = luckyStorePayload.stores;

export function filterLuckyStores(filter: StoreRankFilter): LuckyStore[] {
  if (filter === 'first') return luckyStores.filter(store => store.firstWins > 0);
  if (filter === 'second') return luckyStores.filter(store => store.secondWins > 0);
  return luckyStores;
}

export function storeSummary(store: LuckyStore): string {
  return `1등 ${store.firstWins}회 · 2등 ${store.secondWins}회`;
}
