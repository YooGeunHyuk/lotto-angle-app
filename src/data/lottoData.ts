import AsyncStorage from '@react-native-async-storage/async-storage';
import rawData from '../../data/lotto_history.json';

const REMOTE_LOTTO_URLS = [
  'https://gist.githubusercontent.com/YooGeunHyuk/c43d9902c513e986c4a9ee2bd78eee33/raw/lotto.json',
];
const REMOTE_DRAWS_CACHE_KEY = 'remote_lotto_draws_cache';

// dhlottery 공식 API는 세션/IP 차단이 심해(getLottoNumber 호출 시 홈으로 302) 앱에서 직접 못 씀.
// 대신 네이버 검색 결과를 파싱해 최신 회차를 가져온다. (CI의 updateGistFromNaver.js와 동일 방식)
const NAVER_SEARCH_URL = 'https://search.naver.com/search.naver?query=';
const NAVER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
// gist가 비었을 때 네이버로 메꿀 수 있는 최대 회차 수(폭주 방지).
const MAX_NAVER_GAP_FILL = 10;

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

function parseNaverDraw(html: string): Draw | null {
  const mRound = html.match(/(\d{3,4})회차\s*\((\d{4})\.(\d{2})\.(\d{2})\.\)/);
  if (!mRound) return null;
  const balls = [...html.matchAll(/<span class="ball type\d+">(\d+)<\/span>/g)].map(m => Number(m[1]));
  if (balls.length < 7) return null;
  return normalizeDraw({
    drwNo: Number(mRound[1]),
    drwNoDate: `${mRound[2]}-${mRound[3]}-${mRound[4]}`,
    numbers: balls.slice(0, 6),
    bonus: balls[6],
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

// round 지정 시 그 회차를, 미지정 시 최신 회차를 네이버에서 가져온다.
async function fetchNaverDraw(round?: number): Promise<Draw | null> {
  try {
    const query = round ? `로또 ${round}회 당첨번호` : '로또 당첨번호';
    const response = await fetch(`${NAVER_SEARCH_URL}${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': NAVER_UA },
    });
    if (!response.ok) return null;

    const draw = parseNaverDraw(await response.text());
    // 특정 회차를 요청했는데 파싱된 회차가 다르면(아직 미발표 등) 무효 처리.
    if (draw && round && draw.drwNo !== round) return null;
    return draw;
  } catch {
    return null;
  }
}

async function fetchGistDraws(): Promise<Draw[]> {
  for (const url of REMOTE_LOTTO_URLS) {
    try {
      const response = await fetch(`${url}?t=${Date.now()}`);
      if (!response.ok) continue;

      const draws = normalizeDraws(parseRemoteDrawsPayload(await response.text()));
      if (draws.length > 0) return draws;
    } catch {
      // 다음 URL 시도
    }
  }
  return [];
}

export async function getRemoteDraws(): Promise<Draw[]> {
  try {
    // 1) gist에서 전체 회차 이력 확보 (CI가 주기적으로 갱신).
    const gistDraws = await fetchGistDraws();

    // 2) 기준 최신 회차 = gist 최신 vs 내장 데이터 최신 중 큰 값.
    const bundledLatest = allDraws[allDraws.length - 1]?.drwNo ?? 0;
    const gistLatest = gistDraws[gistDraws.length - 1]?.drwNo ?? 0;
    const baseLatest = Math.max(bundledLatest, gistLatest);

    // 3) 네이버로 "방금 발표된" 최신 회차를 직접 확인 → CI/gist가 늦어도 앱이 스스로 최신화.
    const merged = [...gistDraws];
    const naverLatest = await fetchNaverDraw();
    if (naverLatest && naverLatest.drwNo > baseLatest) {
      for (let n = baseLatest + 1; n <= naverLatest.drwNo && n <= baseLatest + MAX_NAVER_GAP_FILL; n += 1) {
        const draw = n === naverLatest.drwNo ? naverLatest : await fetchNaverDraw(n);
        if (draw) merged.push(draw);
      }
    }

    // 4) 회차 기준 중복 제거 + 정렬.
    const byDrawNo = new Map<number, Draw>();
    for (const draw of merged) byDrawNo.set(draw.drwNo, draw);
    const result = Array.from(byDrawNo.values()).sort((a, b) => a.drwNo - b.drwNo);

    if (result.length > 0) {
      await AsyncStorage.setItem(REMOTE_DRAWS_CACHE_KEY, JSON.stringify(result));
      return result;
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
