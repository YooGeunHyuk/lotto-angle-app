// 로또 분석 엔진 - 롤링 방식으로 패턴을 학습하고 예측

export interface Draw {
  drwNo: number;
  drwNoDate: string;
  numbers: number[];
  bonus: number;
}

export interface NumberScore {
  number: number;
  totalScore: number;
  breakdown: {
    frequency: number;      // 전체 등장 빈도
    recentFrequency: number; // 최근 50회 빈도
    gap: number;            // 안 나온 기간 (오래될수록 높음)
    pairAffinity: number;   // 최근 당첨 번호와의 조합 친밀도
    deltaPattern: number;   // 번호 간격 패턴
    sumBalance: number;     // 합계 범위 기여도
  };
}

export interface Prediction {
  drwNo: number;           // 예측 대상 회차
  predictedNumbers: number[];
  scores: NumberScore[];
  reasoning: string[];     // 예측 이유 설명
  actualNumbers?: number[]; // 실제 결과 (백테스팅용)
  hitCount?: number;        // 맞춘 개수
}

export interface EngineStats {
  totalPredictions: number;
  avgHitCount: number;
  hitDistribution: Record<number, number>; // 0개~6개 맞춘 횟수
  bestFeatures: string[];
}

// ─── 핵심 분석 함수들 ───────────────────────────────────────

function calcFrequency(draws: Draw[]): Record<number, number> {
  const freq: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) freq[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => freq[n]++));
  return freq;
}

function calcGap(draws: Draw[], targetDrw: number): Record<number, number> {
  // 각 번호가 마지막으로 나온 이후 몇 회가 지났는지
  const lastSeen: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) lastSeen[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => {
    lastSeen[n] = d.drwNo;
  }));
  const gap: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) {
    gap[n] = targetDrw - lastSeen[n];
  }
  return gap;
}

function calcPairAffinity(draws: Draw[], recentCount = 10): Record<number, number> {
  // 최근 N회차에 나온 번호들과 자주 함께 나왔던 번호 점수
  if (draws.length < recentCount + 1) return {};
  const recentDraws = draws.slice(-recentCount);
  const recentNumbers = new Set(recentDraws.flatMap(d => d.numbers));

  const pairFreq: Record<string, number> = {};
  draws.forEach(d => {
    const nums = d.numbers;
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${Math.min(nums[i], nums[j])}_${Math.max(nums[i], nums[j])}`;
        pairFreq[key] = (pairFreq[key] || 0) + 1;
      }
    }
  });

  const affinity: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) affinity[n] = 0;

  recentNumbers.forEach(rn => {
    for (let n = 1; n <= 45; n++) {
      if (n === rn) continue;
      const key = `${Math.min(rn, n)}_${Math.max(rn, n)}`;
      affinity[n] = (affinity[n] || 0) + (pairFreq[key] || 0);
    }
  });
  return affinity;
}

function calcDeltaPattern(draws: Draw[]): Record<number, number> {
  // 역대 당첨번호의 인접 번호 간격(delta) 분포를 학습
  // delta가 자주 나오는 패턴의 번호에 높은 점수
  const deltaFreq: Record<number, number> = {};
  draws.forEach(d => {
    const sorted = [...d.numbers].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i] - sorted[i - 1];
      deltaFreq[delta] = (deltaFreq[delta] || 0) + 1;
    }
  });

  // 가장 빈번한 delta 상위 3개
  const topDeltas = Object.entries(deltaFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(e => parseInt(e[0]));

  // 최근 당첨번호 기준으로 delta 패턴에 맞는 번호들에 점수
  const score: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) score[n] = 0;

  const lastDraw = draws[draws.length - 1];
  lastDraw.numbers.forEach(base => {
    topDeltas.forEach(delta => {
      const candidate = base + delta;
      if (candidate >= 1 && candidate <= 45) {
        score[candidate] = (score[candidate] || 0) + deltaFreq[delta];
      }
    });
  });
  return score;
}

function calcSumBalance(draws: Draw[]): { targetMin: number; targetMax: number } {
  // 역대 당첨번호 합계의 중앙 80% 범위 계산
  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0));
  sums.sort((a, b) => a - b);
  const lo = Math.floor(sums.length * 0.1);
  const hi = Math.floor(sums.length * 0.9);
  return { targetMin: sums[lo], targetMax: sums[hi] };
}

function normalize(record: Record<number, number>): Record<number, number> {
  const values = Object.values(record);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const result: Record<number, number> = {};
  for (const k in record) {
    result[k] = (record[k] - min) / range;
  }
  return result;
}

// ─── 메인 예측 함수 ─────────────────────────────────────────

export function predictNextDraw(draws: Draw[], targetDrwNo: number): Prediction {
  if (draws.length < 10) {
    return { drwNo: targetDrwNo, predictedNumbers: [], scores: [], reasoning: ['데이터 부족'] };
  }

  const freq = calcFrequency(draws);
  const recentFreq = calcFrequency(draws.slice(-50));
  const gap = calcGap(draws, targetDrwNo);
  const pairAffinity = calcPairAffinity(draws, 10);
  const deltaScore = calcDeltaPattern(draws);
  const { targetMin, targetMax } = calcSumBalance(draws);

  const normFreq = normalize(freq);
  const normRecentFreq = normalize(recentFreq);
  const normGap = normalize(gap);
  const normPair = normalize(pairAffinity);
  const normDelta = normalize(deltaScore);

  // 가중치 (백테스팅으로 최적화 가능)
  const W = {
    frequency: 0.15,
    recentFrequency: 0.25,
    gap: 0.20,
    pairAffinity: 0.20,
    deltaPattern: 0.20,
  };

  const scores: NumberScore[] = [];
  for (let n = 1; n <= 45; n++) {
    const breakdown = {
      frequency: normFreq[n] || 0,
      recentFrequency: normRecentFreq[n] || 0,
      gap: normGap[n] || 0,
      pairAffinity: normPair[n] || 0,
      deltaPattern: normDelta[n] || 0,
      sumBalance: 0,
    };
    const total =
      breakdown.frequency * W.frequency +
      breakdown.recentFrequency * W.recentFrequency +
      breakdown.gap * W.gap +
      breakdown.pairAffinity * W.pairAffinity +
      breakdown.deltaPattern * W.deltaPattern;

    scores.push({ number: n, totalScore: total, breakdown });
  }

  // 합계 범위를 맞추는 조합으로 최종 6개 선택
  scores.sort((a, b) => b.totalScore - a.totalScore);
  const topCandidates = scores.slice(0, 20).map(s => s.number);

  const predicted = selectBalancedSix(topCandidates, scores, targetMin, targetMax);

  const reasoning = buildReasoning(predicted, scores, draws, gap, freq, recentFreq);

  return {
    drwNo: targetDrwNo,
    predictedNumbers: predicted.sort((a, b) => a - b),
    scores,
    reasoning,
  };
}

function selectBalancedSix(
  candidates: number[],
  scores: NumberScore[],
  targetMin: number,
  targetMax: number
): number[] {
  // 상위 후보 중 합계 범위 안에 드는 조합 탐색
  const scoreMap: Record<number, number> = {};
  scores.forEach(s => scoreMap[s.number] = s.totalScore);

  let best: number[] = candidates.slice(0, 6);
  let bestScore = -1;

  // 탐욕적 접근: 상위 15개에서 조합 탐색
  const pool = candidates.slice(0, 15);
  for (let iter = 0; iter < 200; iter++) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
    const sum = shuffled.reduce((a, b) => a + b, 0);
    if (sum >= targetMin && sum <= targetMax) {
      const sc = shuffled.reduce((a, n) => a + scoreMap[n], 0);
      if (sc > bestScore) {
        bestScore = sc;
        best = shuffled;
      }
    }
  }
  return best;
}

function buildReasoning(
  predicted: number[],
  scores: NumberScore[],
  draws: Draw[],
  gap: Record<number, number>,
  freq: Record<number, number>,
  recentFreq: Record<number, number>
): string[] {
  const reasons: string[] = [];
  const total = draws.length;

  predicted.forEach(n => {
    const s = scores.find(x => x.number === n)!;
    const freqPct = ((freq[n] / total) * 100).toFixed(1);
    const gapVal = gap[n];
    const parts: string[] = [];

    if (s.breakdown.recentFrequency > 0.6) parts.push(`최근 50회 내 자주 등장`);
    if (s.breakdown.gap > 0.7) parts.push(`${gapVal}회째 미출현 (출현 임박)`);
    if (s.breakdown.pairAffinity > 0.6) parts.push(`최근 당첨번호와 조합 빈도 높음`);
    if (s.breakdown.deltaPattern > 0.6) parts.push(`번호 간격 패턴과 일치`);

    reasons.push(`${n}번: 전체 출현율 ${freqPct}% | ${parts.join(', ') || '종합 점수 상위'}`);
  });

  const sum = predicted.reduce((a, b) => a + b, 0);
  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0));
  const avgSum = Math.round(sums.reduce((a, b) => a + b, 0) / sums.length);
  reasons.push(`예측 번호 합계: ${sum} (역대 평균 합계: ${avgSum})`);

  const oddCount = predicted.filter(n => n % 2 !== 0).length;
  reasons.push(`홀수 ${oddCount}개 / 짝수 ${6 - oddCount}개`);

  return reasons;
}

// ─── 백테스팅 ───────────────────────────────────────────────

export function runBacktest(
  allDraws: Draw[],
  startFrom = 50
): { predictions: Prediction[]; stats: EngineStats } {
  const predictions: Prediction[] = [];
  const hitDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (let i = startFrom; i < allDraws.length; i++) {
    const pastDraws = allDraws.slice(0, i);
    const actual = allDraws[i];
    const pred = predictNextDraw(pastDraws, actual.drwNo);
    pred.actualNumbers = actual.numbers;
    const hitSet = new Set(actual.numbers);
    pred.hitCount = pred.predictedNumbers.filter(n => hitSet.has(n)).length;
    hitDist[pred.hitCount]++;
    predictions.push(pred);
  }

  const totalPred = predictions.length;
  const totalHits = predictions.reduce((a, p) => a + (p.hitCount || 0), 0);

  return {
    predictions,
    stats: {
      totalPredictions: totalPred,
      avgHitCount: totalHits / totalPred,
      hitDistribution: hitDist,
      bestFeatures: ['recentFrequency', 'gap', 'pairAffinity', 'deltaPattern'],
    },
  };
}

// ─── 최신 회차 예측 ─────────────────────────────────────────

export function predictLatest(allDraws: Draw[]): Prediction {
  const nextDrwNo = allDraws[allDraws.length - 1].drwNo + 1;
  return predictNextDraw(allDraws, nextDrwNo);
}
