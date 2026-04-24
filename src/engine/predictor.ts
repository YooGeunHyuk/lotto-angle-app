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

function computeScores(draws: Draw[]): { scoreMap: Record<number, number>; sumMin: number; sumMax: number; reasons: string[] } {
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
      (nFreq[n] || 0) * 0.15 +
      (nRecent[n] || 0) * 0.25 +
      (nGap[n] || 0) * 0.20 +
      (nPair[n] || 0) * 0.20 +
      (nSeason[n] || 0) * 0.20;
  }

  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
  const sumMin = sums[Math.floor(total * 0.25)];
  const sumMax = sums[Math.floor(total * 0.75)];

  // 대표 이유
  const topByGap = Object.entries(gap).sort((a, b) => +b[1] - +a[1]).slice(0, 3).map(([n]) => `${n}번`);
  const topByRecent = Object.entries(recentFreq).sort((a, b) => +b[1] - +a[1]).slice(0, 3).map(([n]) => `${n}번`);
  const seasonNames: Record<string, string> = { spring: '봄', summer: '여름', fall: '가을', winter: '겨울' };

  const reasons = [
    `미출현 기간 가중 (상위: ${topByGap.join(', ')})`,
    `최근 50회 핫 번호 반영 (${topByRecent.join(', ')})`,
    `${seasonNames[currentSeason]}철 강세 번호 반영`,
    `조합 친밀도 + 전체 빈도 종합`,
    `합계 범위 ${sumMin}~${sumMax} 내 최적화`,
  ];

  return { scoreMap, sumMin, sumMax, reasons };
}

function pickOne(pool: number[], scoreMap: Record<number, number>, sumMin: number, sumMax: number, excludeSets: number[][]): number[] {
  const excludeAll = new Set(excludeSets.flat());
  const freshPool = [...new Set(pool.filter(n => !excludeAll.has(n)))];
  const usePool = freshPool.length >= 8 ? freshPool : [...new Set(pool)];

  let best: number[] = usePool.slice(0, 6);
  let bestScore = -1;

  for (let i = 0; i < 800; i++) {
    // Fisher-Yates로 중복 없이 6개 선택
    const arr = [...usePool];
    for (let j = arr.length - 1; j >= arr.length - 6 && j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [arr[j], arr[k]] = [arr[k], arr[j]];
    }
    const picked = arr.slice(arr.length - 6);
    if (new Set(picked).size !== 6) continue;

    const sum = picked.reduce((a, b) => a + b, 0);
    if (sum >= sumMin && sum <= sumMax) {
      const sc = picked.reduce((a, n) => a + (scoreMap[n] || 0), 0);
      if (sc > bestScore) { bestScore = sc; best = picked; }
    }
  }
  return best.sort((a, b) => a - b);
}

export function generateFiveSets(draws: Draw[]): GeneratedSets {
  if (draws.length < 20) return { sets: [], reasons: [], sumRange: { min: 0, max: 0 } };

  const { scoreMap, sumMin, sumMax, reasons } = computeScores(draws);

  // 상위 25개 후보 풀
  const pool = Object.entries(scoreMap)
    .sort((a, b) => +b[1] - +a[1])
    .slice(0, 25)
    .map(e => +e[0]);

  const sets: PredictionSet[] = [];
  for (let i = 0; i < 5; i++) {
    const numbers = pickOne(pool, scoreMap, sumMin, sumMax, sets.map(s => s.numbers));
    sets.push({ numbers, setNo: i + 1 });
  }

  return { sets, reasons, sumRange: { min: sumMin, max: sumMax } };
}

// 고정번호를 포함한 추천: 사용자가 선택한 fixed 번호를 포함해서 나머지 자리를 추천 엔진으로 채움
export function generateFixedSets(draws: Draw[], fixed: number[], count: number = 5): GeneratedSets {
  if (draws.length < 20) return { sets: [], reasons: [], sumRange: { min: 0, max: 0 } };
  const fixedUniq = Array.from(new Set(fixed.filter(n => n >= 1 && n <= 45)));
  if (fixedUniq.length > 5) return { sets: [], reasons: ['고정 번호는 최대 5개'], sumRange: { min: 0, max: 0 } };

  const { scoreMap, sumMin, sumMax, reasons } = computeScores(draws);
  const need = 6 - fixedUniq.length;

  // 고정번호 제외한 상위 풀
  const pool = Object.entries(scoreMap)
    .filter(([n]) => !fixedUniq.includes(+n))
    .sort((a, b) => +b[1] - +a[1])
    .slice(0, 25)
    .map(e => +e[0]);

  const fixedSum = fixedUniq.reduce((a, b) => a + b, 0);
  const restMin = Math.max(0, sumMin - fixedSum);
  const restMax = sumMax - fixedSum;

  const sets: PredictionSet[] = [];
  for (let i = 0; i < count; i++) {
    const excluded = sets.map(s => s.numbers.filter(n => !fixedUniq.includes(n)));
    const picked = need > 0 ? pickN(pool, scoreMap, restMin, restMax, excluded, need) : [];
    const numbers = [...fixedUniq, ...picked].sort((a, b) => a - b);
    sets.push({ numbers, setNo: i + 1 });
  }

  const fixReason = fixedUniq.length > 0
    ? `고정 번호 ${fixedUniq.join(', ')} 포함`
    : '고정 번호 없음 (전체 추천)';
  return { sets, reasons: [fixReason, ...reasons], sumRange: { min: sumMin, max: sumMax } };
}

// need개 만큼 점수 기반으로 뽑기 (합계 범위 제한)
function pickN(pool: number[], scoreMap: Record<number, number>, sumMin: number, sumMax: number, excludeSets: number[][], need: number): number[] {
  const excludeAll = new Set(excludeSets.flat());
  const freshPool = [...new Set(pool.filter(n => !excludeAll.has(n)))];
  const usePool = freshPool.length >= need + 2 ? freshPool : [...new Set(pool)];
  if (usePool.length < need) return usePool.slice(0, need);

  let best: number[] = usePool.slice(0, need);
  let bestScore = -1;

  for (let i = 0; i < 800; i++) {
    const arr = [...usePool];
    for (let j = arr.length - 1; j >= arr.length - need && j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [arr[j], arr[k]] = [arr[k], arr[j]];
    }
    const picked = arr.slice(arr.length - need);
    if (new Set(picked).size !== need) continue;
    const sum = picked.reduce((a, b) => a + b, 0);
    if (sum >= sumMin && sum <= sumMax) {
      const sc = picked.reduce((a, n) => a + (scoreMap[n] || 0), 0);
      if (sc > bestScore) { bestScore = sc; best = picked; }
    }
  }
  return best;
}
