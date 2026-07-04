// 분할 회피 엔진 (Split Avoidance)
// ─────────────────────────────────────────────────────────────
// ⚠️ 이 엔진은 '당첨 확률'을 높이지 않는다 — 로또는 독립 무작위라 불가능하다.
// 대신 '사람이 많이 고르는 조합'을 피한다. 목적은 단 하나:
//   혹시 1등이 되면 '나눠 가질 인원'을 줄여서 실수령액 기대값을 올리는 것.
// 모든 조합의 당첨 확률은 동일하다. 바뀌는 건 '겹칠 사람 수'뿐이다.
//
// 근거가 되는 사람들의 인기 픽 패턴(당첨 확률과 무관하게 많이 찍는 조합):
//   1) 생일 편중 — 1~31, 특히 1~12(달)에 몰림. 고번호(32~45)를 잘 안 씀.
//   2) 연속수 — 1-2-3-4-5-6 같은 줄긋기.
//   3) 등차수열 — 5-10-15-20 처럼 일정 간격.
//   4) 5의 배수 과다 — 5,10,15… '깔끔한' 번호 선호.
//   5) 럭키번호 — 7 등 특정 번호 과다 선택.
// popularity(0~1)가 높을수록 남들과 겹칠 위험이 큰 조합이다.

export interface PopularityBreakdown {
  highDeficit: number;   // 고번호(32~45) 편성 이탈 (생일 편중 척도)
  consecutive: number;   // 연속수 런
  arithmetic: number;    // 등차수열 패턴
  roundCluster: number;  // 5의 배수 과다
  luckyBias: number;     // 7 등 인기 번호
}

export interface ScoredCombo {
  setNo: number;
  numbers: number[];
  sum: number;
  popularity: number;        // 0(비인기·좋음) ~ 1(인기·나쁨)
  breakdown: PopularityBreakdown;
  reasons: string[];         // 왜 덜 겹치는지 사람이 읽을 설명
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// 정렬된 6개에서 가장 긴 연속수 런 길이 (예: 3-4-5 → 3)
function longestRun(sorted: number[]): number {
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    cur = sorted[i] === sorted[i - 1] + 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return best;
}

// 등차수열 부분집합(길이 ≥3, 간격 일정)이 있으면 그 최대 길이
function longestArithmetic(sorted: number[]): number {
  const set = new Set(sorted);
  let best = 1;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const step = sorted[j] - sorted[i];
      let len = 2;
      let next = sorted[j] + step;
      while (set.has(next)) {
        len++;
        next += step;
      }
      if (len > best) best = len;
    }
  }
  return best;
}

// 인기(겹침) 점수 계산 — 낮을수록 남들과 덜 겹친다
export function popularityScore(numbers: number[]): {
  score: number;
  breakdown: PopularityBreakdown;
} {
  const sorted = [...numbers].sort((a, b) => a - b);

  // 1) 고번호 편성: 32~45가 2~3개일 때가 '정상이면서 비인기'인 스윗스팟.
  //    너무 적으면(생일 편중) 인기↑, 너무 많으면(전부 고번호) 그 자체로 이상 → 양쪽 다 벌점.
  const highCount = sorted.filter(n => n >= 32).length;
  let highDeficit: number;
  if (highCount < 2) highDeficit = (2 - highCount) / 2;          // 0개→1, 1개→0.5
  else if (highCount > 3) highDeficit = ((highCount - 3) / 3) * 0.5; // 4개↑ 완만한 벌점
  else highDeficit = 0;                                          // 2~3개 = 최적
  highDeficit = clamp01(highDeficit);

  // 2) 연속수: 2연속까진 흔하고 자연스러움, 3연속부터 '줄긋기'로 인기.
  const consecutive = clamp01((longestRun(sorted) - 2) / 4);     // run2→0, run3→0.25, run6→1

  // 3) 등차수열: 길이 3부터 패턴 픽으로 인기.
  const arithmetic = clamp01((longestArithmetic(sorted) - 2) / 3); // len2→0, len3→0.33, len5→1

  // 4) 5의 배수: 무작위 기대 ≈1.2개. 3개 이상이면 '깔끔한 번호' 편향.
  const mult5 = sorted.filter(n => n % 5 === 0).length;
  const roundCluster = clamp01((mult5 - 2) / 3);                 // 2개까진 0, 5개→1

  // 5) 럭키 편향: 7·17·27(끝자리 7)·행운의 3 과다. 약한 가중.
  const lucky = sorted.filter(n => n === 7 || n === 3 || n % 10 === 7).length;
  const luckyBias = clamp01((lucky - 1) / 3);

  const breakdown: PopularityBreakdown = {
    highDeficit,
    consecutive,
    arithmetic,
    roundCluster,
    luckyBias,
  };

  const score =
    highDeficit * 0.40 +
    consecutive * 0.25 +
    arithmetic * 0.20 +
    roundCluster * 0.10 +
    luckyBias * 0.05;

  return { score: clamp01(score), breakdown };
}

// 조합이 '왜 덜 겹치는지' 사람이 읽을 이유 (인기 요인이 낮은 항목만 칭찬)
function buildReasons(numbers: number[], b: PopularityBreakdown): string[] {
  const sorted = [...numbers].sort((a, b) => a - b);
  const highCount = sorted.filter(n => n >= 32).length;
  const r: string[] = [];
  if (highCount >= 2) r.push(`고번호(32~45) ${highCount}개 포함 — 생일 위주 조합과 덜 겹침`);
  if (b.consecutive === 0) r.push('3연속 이상 없음 — 흔한 줄긋기 회피');
  if (b.arithmetic === 0) r.push('등차수열 패턴 없음');
  if (b.roundCluster === 0) r.push('5의 배수 과다 없음');
  if (r.length === 0) r.push('전반적으로 인기 패턴이 적은 조합');
  return r;
}

function randomCombo(): number[] {
  const s = new Set<number>();
  while (s.size < 6) s.add(Math.floor(Math.random() * 45) + 1);
  return Array.from(s).sort((a, b) => a - b);
}

/**
 * 분할 회피 조합 생성.
 * 무작위 후보를 대량 생성 → 인기(겹침) 점수 오름차순 정렬 → 가장 덜 겹치는 count개 반환.
 * sumMin/sumMax를 주면 그 합계 범위 안에서만 고른다(추가 제약, 당첨 확률과 무관).
 *
 * @returns 인기 점수가 낮은 순으로 정렬된 서로 다른 조합 count개
 */
export function generateSplitAvoidSets(
  count = 5,
  sumMin?: number,
  sumMax?: number,
  poolSize = 1500,
): ScoredCombo[] {
  const seen = new Set<string>();
  const pool: { numbers: number[]; sum: number; popularity: number; breakdown: PopularityBreakdown }[] = [];

  for (let i = 0; i < poolSize; i++) {
    const numbers = randomCombo();
    const sum = numbers.reduce((a, b) => a + b, 0);
    if (sumMin != null && sum < sumMin) continue;
    if (sumMax != null && sum > sumMax) continue;
    const key = numbers.join('-');
    if (seen.has(key)) continue;
    seen.add(key);
    const { score, breakdown } = popularityScore(numbers);
    pool.push({ numbers, sum, popularity: score, breakdown });
  }

  // 합계 제약이 너무 좁아 후보가 부족하면 제약 없이 보충
  if (pool.length < count) {
    for (let i = 0; i < poolSize && pool.length < count * 3; i++) {
      const numbers = randomCombo();
      const key = numbers.join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      const { score, breakdown } = popularityScore(numbers);
      pool.push({ numbers, sum: numbers.reduce((a, b) => a + b, 0), popularity: score, breakdown });
    }
  }

  pool.sort((a, b) => a.popularity - b.popularity);

  return pool.slice(0, count).map((c, i) => ({
    setNo: i + 1,
    numbers: c.numbers,
    sum: c.sum,
    popularity: c.popularity,
    breakdown: c.breakdown,
    reasons: buildReasons(c.numbers, c.breakdown),
  }));
}

// 인기 점수 → 사람이 읽을 겹침 위험 라벨
export function overlapLabel(popularity: number): string {
  if (popularity < 0.15) return '겹침 위험 낮음';
  if (popularity < 0.35) return '겹침 위험 보통';
  return '겹침 위험 높음';
}
