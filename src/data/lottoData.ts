import AsyncStorage from '@react-native-async-storage/async-storage';
import rawData from '../../data/lotto_history.json';

const REMOTE_LOTTO_URLS = [
  'https://raw.githubusercontent.com/YooGeunHyuk/lotto-angle-app/main/data/lotto_history.json',
  'https://gist.githubusercontent.com/YooGeunHyuk/c43d9902c513e986c4a9ee2bd78eee33/raw/lotto.json',
];
const OFFICIAL_LOTTO_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber';
const REMOTE_DRAWS_CACHE_KEY = 'remote_lotto_draws_cache';
const MAX_OFFICIAL_LOOKAHEAD = 20;

export interface Draw {
  drwNo: number;
  drwNoDate: string;
  numbers: number[];
  bonus: number;
  isAuto?: boolean; // 🌟 이 줄을 꼭 추가해야 합니다! (?는 있을수도 있고 없을수도 있다는 뜻이에요)
}

export const allDraws: Draw[] = rawData as Draw[];

function normalizeDate(date: unknown): string {
  return typeof date === 'string' ? date.replace(/-/g, '.') : '';
}

function normalizeDraw(raw: unknown): Draw | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<Draw>;
  const drwNo = Number(item.drwNo);
  const numbers = Array.isArray(item.numbers) ? item.numbers.map(Number) : [];
  const bonus = Number(item.bonus);

  if (!Number.isInteger(drwNo) || drwNo < 1) return null;
  if (numbers.length !== 6 || numbers.some(n => !Number.isInteger(n) || n < 1 || n > 45)) return null;
  if (new Set(numbers).size !== 6) return null;
  if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45 || numbers.includes(bonus)) return null;

  return {
    drwNo,
    drwNoDate: normalizeDate(item.drwNoDate),
    numbers: numbers.slice().sort((a, b) => a - b),
    bonus,
  };
}

function normalizeOfficialDraw(raw: unknown): Draw | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  if (item.returnValue !== 'success') return null;

  const numbers = [1, 2, 3, 4, 5, 6].map(index => Number(item[`drwtNo${index}`]));
  return normalizeDraw({
    drwNo: item.drwNo,
    drwNoDate: item.drwNoDate,
    numbers,
    bonus: item.bnusNo,
  });
}

function normalizeDraws(raw: unknown): Draw[] {
  const draws = Array.isArray(raw) ? raw : (raw as { draws?: unknown[] })?.draws;
  if (!Array.isArray(draws)) return [];
  return draws
    .map(normalizeDraw)
    .filter((draw): draw is Draw => Boolean(draw))
    .sort((a, b) => a.drwNo - b.drwNo);
}

function parseRemoteDrawsPayload(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return JSON.parse(payload.trim().replace(/\]\s*\[/g, ','));
  }
}

async function fetchOfficialDraw(drawNo: number): Promise<Draw | null> {
  try {
    const response = await fetch(`${OFFICIAL_LOTTO_URL}&drwNo=${drawNo}`, {
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: 'https://www.dhlottery.co.kr/gameResult.do?method=byWin',
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    if (!response.ok) return null;

    const text = await response.text();
    return normalizeOfficialDraw(JSON.parse(text));
  } catch {
    return null;
  }
}

async function getOfficialUpdates(): Promise<Draw[]> {
  const updates: Draw[] = [];
  const latestLocalDrawNo = allDraws[allDraws.length - 1]?.drwNo ?? 0;

  for (let drawNo = latestLocalDrawNo + 1; drawNo <= latestLocalDrawNo + MAX_OFFICIAL_LOOKAHEAD; drawNo += 1) {
    const draw = await fetchOfficialDraw(drawNo);
    if (!draw) break;
    updates.push(draw);
  }

  return updates;
}

export async function getRemoteDraws(): Promise<Draw[]> {
  try {
    const officialUpdates = await getOfficialUpdates();
    if (officialUpdates.length > 0) {
      await AsyncStorage.setItem(REMOTE_DRAWS_CACHE_KEY, JSON.stringify(officialUpdates));
      return officialUpdates;
    }

    const remoteCandidates: Draw[][] = [];
    for (const url of REMOTE_LOTTO_URLS) {
      const response = await fetch(`${url}?t=${Date.now()}`);
      if (!response.ok) continue;

      const draws = normalizeDraws(parseRemoteDrawsPayload(await response.text()));
      if (draws.length > 0) {
        remoteCandidates.push(draws);
      }
    }

    const newestRemoteDraws = remoteCandidates
      .sort((a, b) => (b[b.length - 1]?.drwNo ?? 0) - (a[a.length - 1]?.drwNo ?? 0))[0];
    if (newestRemoteDraws) {
      await AsyncStorage.setItem(REMOTE_DRAWS_CACHE_KEY, JSON.stringify(newestRemoteDraws));
      return newestRemoteDraws;
    }

    throw new Error('Remote lotto data was not available');
  } catch {
    try {
      const cached = await AsyncStorage.getItem(REMOTE_DRAWS_CACHE_KEY);
      return cached ? normalizeDraws(JSON.parse(cached)) : [];
    } catch {
      return [];
    }
  }
}

export function getFrequency(draws = allDraws): Record<number, number> {
  const freq: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) freq[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => freq[n]++));
  return freq;
}

export function getGaps(draws = allDraws): Record<number, number> {
  const lastSeen: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) lastSeen[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => { lastSeen[n] = d.drwNo; }));
  const latest = draws[draws.length - 1].drwNo;
  const gaps: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) gaps[n] = latest - lastSeen[n];
  return gaps;
}

export function getSeasonalFrequency(draws = allDraws): Record<string, Record<number, number>> {
  const seasons: Record<string, Record<number, number>> = { spring: {}, summer: {}, fall: {}, winter: {} };
  for (const s of Object.keys(seasons)) for (let n = 1; n <= 45; n++) seasons[s][n] = 0;
  draws.forEach(d => {
    const month = parseInt(d.drwNoDate.split('.')[1]);
    let s = 'winter';
    if (month >= 3 && month <= 5) s = 'spring';
    else if (month >= 6 && month <= 8) s = 'summer';
    else if (month >= 9 && month <= 11) s = 'fall';
    d.numbers.forEach(n => seasons[s][n]++);
  });
  return seasons;
}

export function getSumStats(draws = allDraws) {
  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
  const total = sums.length;
  return {
    avg: Math.round(sums.reduce((a, b) => a + b, 0) / total),
    min: sums[0],
    max: sums[total - 1],
    p10: sums[Math.floor(total * 0.25)],
    p90: sums[Math.floor(total * 0.75)],
  };
}

export function getConsecutiveRate(draws = allDraws): number {
  let count = 0;
  draws.forEach(d => {
    const s = [...d.numbers].sort((a, b) => a - b);
    for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] === 1) { count++; break; }
  });
  return count / draws.length;
}

export function getOddEvenDistribution(draws = allDraws): Record<string, number> {
  const dist: Record<string, number> = {};
  draws.forEach(d => {
    const odd = d.numbers.filter(n => n % 2 !== 0).length;
    const key = `${odd}:${6 - odd}`;
    dist[key] = (dist[key] || 0) + 1;
  });
  return dist;
}

export const SEASON_NAMES: Record<string, string> = {
  spring: '봄', summer: '여름', fall: '가을', winter: '겨울',
};
