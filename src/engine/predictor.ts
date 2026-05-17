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

export type RecommendMode = 'safe' | 'aggressive' | 'experimental';

interface ModeConfig {
  weights: { frequency: number; recentFrequency: number; gap: number; pairAffinity: number; season: number };
  sumLowPercentile: number;   // 0~1 (0.25 = 하위 25%)
  sumHighPercentile: number;
  prevDrawPenalty: number;
  consecutiveEnabled: boolean;
  iterations: number;
}

const MODE_CONFIGS: Record<RecommendMode, ModeConfig> = {
  // 안정: 최근 핫 트렌드 추종 + 페어/전체빈도 균형 (현재 기본)
  safe: {
    weights: { frequency: 0.22, recentFrequency: 0.40, gap: 0.08, pairAffinity: 0.25, season: 0.05 },
    sumLowPercentile: 0.25,
    sumHighPercentile: 0.75,
    prevDrawPenalty: 0.04,
    consecutiveEnabled: true,
    iterations: 1400,
  },
  // 공격: 오래 안 나온 콜드 번호 강조 + 직전 회차 강하게 회피 + 합계 범위 넓게
  aggressive: {
    weights: { frequency: 0.10, recentFrequency: 0.15, gap: 0.45, pairAffinity: 0.15, season: 0.15 },
    sumLowPercentile: 0.10,
    sumHighPercentile: 0.90,
    prevDrawPenalty: 0.08,
    consecutiveEnabled: true,
    iterations: 1400,
  },
  // 실험: 거의 균등 (편향 최소) + 합계 제약 없음 + 직전회차/연속 보너스 무시
  experimental: {
    weights: { frequency: 0.20, recentFrequency: 0.20, gap: 0.20, pairAffinity: 0.20, season: 0.20 },
    sumLowPercentile: 0.0,
    sumHighPercentile: 1.0,
    prevDrawPenalty: 0.0,
    consecutiveEnabled: false,
    iterations: 800,
  },
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

function computeScores(draws: Draw[], mode: RecommendMode = 'safe'): ComputedScores {
  const total = draws.length;
  const nextDrwNo = draws[draws.length - 1].drwNo + 1;
  const config = MODE_CONFIGS[mode];
  const W = config.weights;

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
      (nFreq[n] || 0) * W.frequency +
      (nRecent[n] || 0) * W.recentFrequency +
      (nGap[n] || 0) * W.gap +
      (nPair[n] || 0) * W.pairAffinity +
      (nSeason[n] || 0) * W.season;
  }

  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
  const sumMin = sums[Math.floor(total * config.sumLowPercentile)];
  const sumMax = sums[Math.min(total - 1, Math.floor(total * config.sumHighPercentile))];

  const modeReasons: Record<RecommendMode, string[]> = {
    safe: [
      '최근 출현 흐름을 최우선으로 추종',
      '페어 친화도와 전체 누적 빈도를 함께 분석',
      '직전 회차 번호는 가볍게 회피, 연속 번호 흐름 자연스럽게 반영',
      '번호대·홀짝·합계 분포의 균형 유지',
    ],
    aggressive: [
      '오래 안 나온 번호를 강하게 반영 (평균 회귀 가설)',
      '직전 회차 번호는 강하게 회피',
      '합계 범위를 넓혀 일반적이지 않은 조합도 허용',
      '계절·페어는 보조 신호로 약하게 반영',
    ],
    experimental: [
      '모든 통계 신호를 균등 비중으로 반영 (편향 최소)',
      '합계 제약 없음 — 1부터 45 전체에서 자유롭게',
      '직전 회차 회피·연속 번호 보너스 모두 꺼짐',
      '실제 무작위에 가까운 추천',
    ],
  };

  return { scoreMap, recentFreq, gap, sumMin, sumMax, reasons: modeReasons[mode] };
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
  // 홀짝은 한쪽 극단(6:0 / 5:1 등)만 살짝 디스카운트, 그 외엔 중립
  const oddEvenBalance = oddCount >= 2 && oddCount <= 4 ? 0.05 : -0.20;
  // 번호대 다양성: 한 구간에만 몰려있을 때만 감점, 충분히 흩어져 있으면 가산 없음.
  // 5개 구간을 다 채우라는 강한 인센티브가 40-45 구간을 강제로 끌어오던 문제 제거.
  let bandPenalty = 0;
  if (bands.size <= 1) bandPenalty = -0.40;
  else if (bands.size === 2) bandPenalty = -0.10;
  return bandPenalty + oddEvenBalance;
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

// 직전 회차 번호는 mode 가중치만큼 회피.
function previousDrawPenalty(numbers: number[], lastNumbers: number[], weight: number): number {
  if (weight <= 0) return 0;
  const overlap = numbers.filter(n => lastNumbers.includes(n)).length;
  return overlap * weight;
}

function scoreSet(
  numbers: number[],
  scoreMap: Record<number, number>,
  previousSets: number[][],
  lastDrawNumbers: number[],
  config: ModeConfig,
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
  const consec = config.consecutiveEnabled ? consecutiveBonus(numbers) : 0;
  return baseScore
    + diversityScore(numbers)
    + consec
    - previousDrawPenalty(numbers, lastDrawNumbers, config.prevDrawPenalty)
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
  config: ModeConfig,
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

      const sc = scoreSet(picked, scoreMap, previousSets, lastDrawNumbers, config);
      if (sc > bestScore) { bestScore = sc; best = picked; }
    }
  };

  search(MAX_SET_OVERLAP, MAX_NUMBER_REUSE, config.iterations);
  if (bestScore === -Infinity) {
    search(2, 3, 600);
  }

  return best.sort((a, b) => a - b);
}

// 세트마다 다른 성격을 위한 풀 사양.
// 풀 자체뿐 아니라 합계 범위도 살짝 다르게 할 수 있다.
type SetSpec = {
  pool: 'hot' | 'cold' | 'balanced' | 'sumLow' | 'sumHigh' | 'random';
};

// count(요청 갯수)에 맞춰 다양한 성격의 세트 plan을 만든다.
// 5세트 = hot/cold/sumLow/sumHigh/balanced. 그 이상은 한 번 더 순환.
function buildSetPlan(count: number): SetSpec[] {
  const order: SetSpec['pool'][] = [
    'hot', 'cold', 'sumLow', 'sumHigh', 'balanced',
    'random', 'hot', 'cold', 'balanced', 'sumLow',
  ];
  const plan: SetSpec[] = [];
  for (let i = 0; i < count; i++) {
    plan.push({ pool: order[i % order.length] });
  }
  return plan;
}

export function generateSets(
  draws: Draw[],
  mode: RecommendMode = 'safe',
  count: number = 5,
): GeneratedSets {
  if (draws.length < 20) return { sets: [], reasons: [], sumRange: { min: 0, max: 0 } };

  const config = MODE_CONFIGS[mode];
  const lastDrawNumbers = draws[draws.length - 1].numbers;
  const { scoreMap, recentFreq, gap, sumMin, sumMax, reasons } = computeScores(draws, mode);

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
  const randomPool = Array.from({ length: 45 }, (_, i) => i + 1);

  const sumMid = Math.floor((sumMin + sumMax) / 2);
  const plan = buildSetPlan(count);

  const sets: PredictionSet[] = [];
  for (let i = 0; i < plan.length; i++) {
    const spec = plan[i];
    let pool: number[];
    let localMin = sumMin;
    let localMax = sumMax;
    switch (spec.pool) {
      case 'hot':
        pool = hotPool;
        break;
      case 'cold':
        pool = coldPool;
        break;
      case 'sumLow':
        pool = fullPool;
        localMax = sumMid;
        break;
      case 'sumHigh':
        pool = fullPool;
        localMin = sumMid;
        break;
      case 'random':
        pool = randomPool;
        // experimental 모드가 아니어도 random pool은 합계 제약 풀어둠
        localMin = Math.min(sumMin, 80);
        localMax = Math.max(sumMax, 200);
        break;
      case 'balanced':
      default:
        pool = fullPool;
        break;
    }
    const numbers = pickOne(
      pool,
      scoreMap,
      localMin,
      localMax,
      sets.map(s => s.numbers),
      lastDrawNumbers,
      config,
    );
    sets.push({ numbers, setNo: i + 1 });
  }

  return { sets, reasons, sumRange: { min: sumMin, max: sumMax } };
}

// 기존 호출 호환용 (5세트, safe 모드)
export function generateFiveSets(draws: Draw[]): GeneratedSets {
  return generateSets(draws, 'safe', 5);
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
      - previousDrawPenalty(fullSet, lastDrawNumbers, 0.04);
    if (sc > bestScore) { bestScore = sc; best = picked; }
  }
  return best;
}
