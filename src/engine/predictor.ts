import { Draw } from '../data/lottoData';

function normalize(r: Record<number, number>): Record<number, number> {
  const vals = Object.values(r);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const out: Record<number, number> = {};
  for (const k in r) out[k] = (r[k] - min) / range;
  return out;
}

export interface PredictionSet {
  numbers: number[];
  setNo: number;
}

export interface GeneratedSets {
  sets: PredictionSet[];
  reasons: string[];
  sumRange: { min: number; max: number };
}

const SCORE_WEIGHTS = {
  frequency: 0.22,
  recentFrequency: 0.40,
  gap: 0.08,
  pairAffinity: 0.25,
  season: 0.05,
};

const MAX_SET_OVERLAP = 1;
const MAX_NUMBER_REUSE = 2;

interface ComputedScores {
  scoreMap: Record<number, number>;
  recentFreq: Record<number, number>;
  gap: Record<number, number>;
  sumMin: number;
  sumMax: number;
  reasons: string[];
}

function computeScores(draws: Draw[]): ComputedScores {
  const total = draws.length;
  const nextDrwNo = draws[draws.length - 1].drwNo + 1;

  // 전체 빈도
  const freq: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) freq[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => freq[n]++));

  // 최근 50회 빈도
  const recentFreq: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) recentFreq[n] = 0;
  draws.slice(-50).forEach(d => d.numbers.forEach(n => recentFreq[n]++));

  // 미출현 기간
  const lastSeen: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) lastSeen[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => { lastSeen[n] = d.drwNo; }));
  const gap: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) gap[n] = nextDrwNo - lastSeen[n];

  // 조합 친밀도 (최근 10회 기준)
  const pairFreq: Record<string, number> = {};
  draws.forEach(d => {
    for (let i = 0; i < d.numbers.length; i++)
      for (let j = i + 1; j < d.numbers.length; j++) {
        const key = `${Math.min(d.numbers[i], d.numbers[j])}_${Math.max(d.numbers[i], d.numbers[j])}`;
        pairFreq[key] = (pairFreq[key] || 0) + 1;
      }
  });
  const recent = new Set(draws.slice(-10).flatMap(d => d.numbers));
  const pair: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) pair[n] = 0;
  recent.forEach(rn => {
    for (let n = 1; n <= 45; n++) {
      if (n === rn) continue;
      const key = `${Math.min(rn, n)}_${Math.max(rn, n)}`;
      pair[n] += pairFreq[key] || 0;
    }
  });

  // 계절 빈도
  const month = new Date().getMonth() + 1;
  const currentSeason = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'fall' : 'winter';
  const seasonFreq: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) seasonFreq[n] = 0;
  draws.forEach(d => {
    const m = parseInt(d.drwNoDate.split('.')[1]);
    const s = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'fall' : 'winter';
    if (s === currentSeason) d.numbers.forEach(n => seasonFreq[n]++);
  });

  const nFreq = normalize(freq);
  const nRecent = normalize(recentFreq);
  const nGap = normalize(gap);
  const nPair = normalize(pair);
  const nSeason = normalize(seasonFreq);

  const scoreMap: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) {
    scoreMap[n] =
      (nFreq[n] || 0) * SCORE_WEIGHTS.frequency +
      (nRecent[n] || 0) * SCORE_WEIGHTS.recentFrequency +
      (nGap[n] || 0) * SCORE_WEIGHTS.gap +
      (nPair[n] || 0) * SCORE_WEIGHTS.pairAffinity +
      (nSeason[n] || 0) * SCORE_WEIGHTS.season;
  }

  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
  const sumMin = sums[Math.floor(total * 0.25)];
  const sumMax = sums[Math.floor(total * 0.75)];

  const reasons = [
    '최근 출현 흐름과 전체 누적 빈도를 함께 분석',
    '번호 간 동반 출현 패턴(페어) 고려',
    '오래 안 나온 번호와 계절별 흐름 보조 참고',
    '연속 번호 흐름 자연스럽게 반영',
    '직전 회차 번호는 가볍게 회피',
    '번호대·홀짝·합계 분포의 균형 유지',
    '5세트는 서로 다른 관점으로 구성, 중복 최소화',
  ];

  return { scoreMap, recentFreq, gap, sumMin, sumMax, reasons };
}

function bandOf(n: number): number {
  if (n <= 9) return 0;
  if (n <= 19) return 1;
  if (n <= 29) return 2;
  if (n <= 39) return 3;
  return 4;
}

function diversityScore(numbers: number[]): number {
  const bands = new Set(numbers.map(bandOf));
  const oddCount = numbers.filter(n => n % 2 !== 0).length;
  const oddEvenBalance = oddCount >= 2 && oddCount <= 4 ? 0.35 : -0.25;
  return bands.size * 0.28 + oddEvenBalance;
}

// 연속 번호 1쌍을 자연스럽게 포함하도록 유도 (역대 약 50% 회차에 1쌍 포함).
function consecutiveBonus(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  let pairs = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) pairs++;
  }
  if (pairs === 1) return 0.06;   // 권장
  if (pairs === 0) return -0.02;  // 약한 디스카운트
  return -0.04;                   // 2쌍 이상은 부자연스러움
}

// 직전 회차 번호는 약 5% 가중치로 가볍게 회피.
function previousDrawPenalty(numbers: number[], lastNumbers: number[]): number {
  const overlap = numbers.filter(n => lastNumbers.includes(n)).length;
  return overlap * 0.04;
}

function scoreSet(
  numbers: number[],
  scoreMap: Record<number, number>,
  previousSets: number[][],
  lastDrawNumbers: number[],
): number {
  const baseScore = numbers.reduce((a, n) => a + (scoreMap[n] || 0), 0);
  const similarityPenalty = previousSets.reduce((penalty, prev) => {
    const overlap = numbers.filter(n => prev.includes(n)).length;
    return penalty + overlap * 0.18 + Math.max(0, overlap - MAX_SET_OVERLAP) * 0.6;
  }, 0);
  const reusePenalty = numbers.reduce((penalty, n) => {
    const usedCount = previousSets.filter(prev => prev.includes(n)).length;
    return penalty + usedCount * 0.12;
  }, 0);
  return baseScore
    + diversityScore(numbers)
    + consecutiveBonus(numbers)
    - previousDrawPenalty(numbers, lastDrawNumbers)
    - similarityPenalty
    - reusePenalty;
}

function isSameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

function isDiverseEnough(numbers: number[], previousSets: number[][], maxOverlap: number, maxReuse: number): boolean {
  const usedCounts = new Map<number, number>();
  previousSets.flat().forEach(n => usedCounts.set(n, (usedCounts.get(n) || 0) + 1));

  if (numbers.some(n => (usedCounts.get(n) || 0) >= maxReuse)) {
    return false;
  }

  return previousSets.every(prev => numbers.filter(n => prev.includes(n)).length <= maxOverlap);
}

function pickOne(
  pool: number[],
  scoreMap: Record<number, number>,
  sumMin: number,
  sumMax: number,
  previousSets: number[][],
  lastDrawNumbers: number[],
): number[] {
  const usePool = [...new Set(pool)];

  let best: number[] = usePool.slice(0, 6);
  let bestScore = -Infinity;

  const search = (maxOverlap: number, maxReuse: number, iterations: number) => {
    for (let i = 0; i < iterations; i++) {
      const arr = [...usePool];
      for (let j = arr.length - 1; j >= arr.length - 6 && j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [arr[j], arr[k]] = [arr[k], arr[j]];
      }
      const picked = arr.slice(arr.length - 6).sort((a, b) => a - b);
      if (new Set(picked).size !== 6) continue;
      if (previousSets.some(prev => isSameSet(picked, prev))) continue;
      if (!isDiverseEnough(picked, previousSets, maxOverlap, maxReuse)) continue;

      const sum = picked.reduce((a, b) => a + b, 0);
      if (sum < sumMin || sum > sumMax) continue;

      const sc = scoreSet(picked, scoreMap, previousSets, lastDrawNumbers);
      if (sc > bestScore) { bestScore = sc; best = picked; }
    }
  };

  search(MAX_SET_OVERLAP, MAX_NUMBER_REUSE, 1400);
  if (bestScore === -Infinity) {
    search(2, 3, 600);
  }

  return best.sort((a, b) => a - b);
}

export function generateFiveSets(draws: Draw[]): GeneratedSets {
  if (draws.length < 20) return { sets: [], reasons: [], sumRange: { min: 0, max: 0 } };

  const lastDrawNumbers = draws[draws.length - 1].numbers;
  const { scoreMap, recentFreq, gap, sumMin, sumMax, reasons } = computeScores(draws);

  // 후보 풀: 전체(점수순), 최근 핫 22개, 장기 콜드 22개
  const fullPool = Object.entries(scoreMap)
    .sort((a, b) => +b[1] - +a[1])
    .map(e => +e[0]);
  const hotPool = Object.entries(recentFreq)
    .sort((a, b) => +b[1] - +a[1])
    .slice(0, 22)
    .map(e => +e[0]);
  const coldPool = Object.entries(gap)
    .sort((a, b) => +b[1] - +a[1])
    .slice(0, 22)
    .map(e => +e[0]);

  // 1세트=핫, 2세트=콜드, 3~5세트=균형
  const poolPlan = [hotPool, coldPool, fullPool, fullPool, fullPool];

  const sets: PredictionSet[] = [];
  for (let i = 0; i < 5; i++) {
    const numbers = pickOne(
      poolPlan[i],
      scoreMap,
      sumMin,
      sumMax,
      sets.map(s => s.numbers),
      lastDrawNumbers,
    );
    sets.push({ numbers, setNo: i + 1 });
  }

  return { sets, reasons, sumRange: { min: sumMin, max: sumMax } };
}

// 고정번호 추천: 사용자가 지정한 번호를 포함해 나머지 자리를 추천 엔진으로 채움.
export function generateFixedSets(draws: Draw[], fixed: number[], count: number = 5): GeneratedSets {
  if (draws.length < 20) return { sets: [], reasons: [], sumRange: { min: 0, max: 0 } };
  const fixedUniq = Array.from(new Set(fixed.filter(n => n >= 1 && n <= 45)));
  if (fixedUniq.length > 5) return { sets: [], reasons: ['고정 번호는 최대 5개'], sumRange: { min: 0, max: 0 } };

  const lastDrawNumbers = draws[draws.length - 1].numbers;
  const { scoreMap, sumMin, sumMax, reasons } = computeScores(draws);
  const need = 6 - fixedUniq.length;

  const pool = Object.entries(scoreMap)
    .filter(([n]) => !fixedUniq.includes(+n))
    .sort((a, b) => +b[1] - +a[1])
    .map(e => +e[0]);

  const fixedSum = fixedUniq.reduce((a, b) => a + b, 0);
  const restMin = Math.max(0, sumMin - fixedSum);
  const restMax = sumMax - fixedSum;

  const sets: PredictionSet[] = [];
  for (let i = 0; i < count; i++) {
    const excluded = sets.map(s => s.numbers.filter(n => !fixedUniq.includes(n)));
    const picked = need > 0
      ? pickN(pool, scoreMap, restMin, restMax, excluded, need, lastDrawNumbers, fixedUniq)
      : [];
    const numbers = [...fixedUniq, ...picked].sort((a, b) => a - b);
    sets.push({ numbers, setNo: i + 1 });
  }

  const fixReason = fixedUniq.length > 0
    ? `고정 번호 ${fixedUniq.join(', ')} 포함`
    : '고정 번호 없음 (전체 추천)';
  return { sets, reasons: [fixReason, ...reasons], sumRange: { min: sumMin, max: sumMax } };
}

// need개 만큼 점수 기반으로 뽑기 (합계 범위 + 연속/직전회차 보정 포함)
function pickN(
  pool: number[],
  scoreMap: Record<number, number>,
  sumMin: number,
  sumMax: number,
  excludeSets: number[][],
  need: number,
  lastDrawNumbers: number[],
  fixedNumbers: number[],
): number[] {
  const excludeAll = new Set(excludeSets.flat());
  const freshPool = [...new Set(pool.filter(n => !excludeAll.has(n)))];
  const usePool = freshPool.length >= need + 2 ? freshPool : [...new Set(pool)];
  if (usePool.length < need) return usePool.slice(0, need);

  let best: number[] = usePool.slice(0, need);
  let bestScore = -Infinity;

  for (let i = 0; i < 800; i++) {
    const arr = [...usePool];
    for (let j = arr.length - 1; j >= arr.length - need && j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [arr[j], arr[k]] = [arr[k], arr[j]];
    }
    const picked = arr.slice(arr.length - need);
    if (new Set(picked).size !== need) continue;
    const sum = picked.reduce((a, b) => a + b, 0);
    if (sum < sumMin || sum > sumMax) continue;

    // 고정 번호와 함께 평가해야 연속/직전회차 보정이 정확함
    const fullSet = [...fixedNumbers, ...picked];
    const sc = picked.reduce((a, n) => a + (scoreMap[n] || 0), 0)
      + diversityScore(fullSet)
      + consecutiveBonus(fullSet)
      - previousDrawPenalty(fullSet, lastDrawNumbers);
    if (sc > bestScore) { bestScore = sc; best = picked; }
  }
  return best;
}
