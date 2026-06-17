import type { Draw } from '../data/lottoData';
import { getEnsembleScores } from '../engine/predictor';

// 로또사주 엔진 — 결정적(deterministic) 규칙 기반. 외부 데이터/API 없이 로컬 계산.
// 같은 생년월일 + 같은 날 = 항상 같은 결과 (신뢰의 핵심. 랜덤 금지).
//
// 원리: 생년월일의 '일간(日干)'을 나로 보고, 오늘 일진(日辰)의 기운과의
// 상생·상극 관계로 "오늘의 로또운"을 점수화한다. 엔터테인먼트 톤(예측 아님).

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
export const ELEMENTS = ['목', '화', '토', '금', '수'] as const;

export type Element = (typeof ELEMENTS)[number];
export type Grade = 'GO' | '보통' | '패스';

// 천간 → 오행 (갑을=목, 병정=화, 무기=토, 경신=금, 임계=수)
function stemElement(stem: number): number {
  return Math.floor(stem / 2);
}

// 지지 → 오행 (자=수, 축=토, 인묘=목, 진=토, 사오=화, 미=토, 신유=금, 술=토, 해=수)
const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

// 그레고리력 → 율리우스적일(JDN, 정오 기준). 일 단위 간지 계산에 사용.
function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// 해당 날짜의 일진(60갑자) 인덱스. (JDN+49)%60, 0=갑자. (2000-01-07 = 갑자로 검증)
export function dayGanji(date: Date): { index: number; stem: number; branch: number } {
  const jdn = julianDayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const index = ((jdn + 49) % 60 + 60) % 60;
  return { index, stem: index % 10, branch: index % 12 };
}

// 오행 관계: a가 b에 대해 어떤 관계인가 (a 기준)
// 0 비화(같음) 1 생(a→b, a가 b를 생) 2 설(b→a, b가 a를 생=내가 받음)
// 3 극(a→b, a가 b를 이김=재물) 4 살(b→a, b가 a를 이김=압박)
function elementRelation(mine: number, other: number): number {
  if (mine === other) return 0;
  if ((mine + 1) % 5 === other) return 1; // 내가 생함 (식상)
  if ((other + 1) % 5 === mine) return 2; // 나를 생함 (인성)
  if ((mine + 2) % 5 === other) return 3; // 내가 극함 (재성=재물운)
  return 4; // 나를 극함 (관성=압박)
}

// 관계별 기본 로또운 점수 (재성=재물이 최고, 관성=압박이 최저)
const RELATION_SCORE = [58, 64, 70, 86, 46];
const RELATION_LABEL = ['비슷한 기운', '활동·표현의 날', '도움받는 날', '재물운 상승일', '신중해야 할 날'];

export interface DailyFortune {
  score: number; // 0~100
  grade: Grade;
  myStem: string; // 일간 (예: '갑')
  myElement: Element; // 내 오행
  todayStem: string; // 오늘 일진 천간
  todayElement: Element; // 오늘 오행
  relationLabel: string; // 사주 한 줄 이유
  luckyDigit: number; // 오늘 행운 끝자리 (0~9)
  hasTime: boolean; // 출생시 반영 여부
  hourStem?: string; // 시주 천간
  hourElement?: Element; // 시주 오행
}

// 태어난 시(0~23) → 시지 인덱스. 자시 = 23~01시.
function hourBranch(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}
// 시간(時干) — 오서둔(五鼠遁): 일간 기준 자시 천간 + 시지 진행.
function hourStem(dayStem: number, hourBr: number): number {
  return ((dayStem % 5) * 2 + hourBr) % 10;
}

// 생년월일(+선택 출생시·분) + 오늘 → 오늘의 로또운(사주 레이어). 통계 결합 전 단계.
// 분은 시주(2시간 단위)를 바꾸진 않고 미세 변동에만 반영(개인화).
export function getDailyFortune(birth: Date, today: Date, birthHour?: number | null, birthMin?: number | null): DailyFortune {
  const birthGz = dayGanji(birth);
  const todayGz = dayGanji(today);
  const myEl = stemElement(birthGz.stem);
  const todayEl = stemElement(todayGz.stem);

  const relation = elementRelation(myEl, todayEl);
  let score = RELATION_SCORE[relation];

  // 오늘 일진 지지 오행과의 보조 관계로 ±
  const branchRel = elementRelation(myEl, BRANCH_ELEMENT[todayGz.branch]);
  score += [0, 2, 4, 7, -4][branchRel];

  // 시주(時柱) — 출생시 있으면 내 차트 보조 오행으로 점수에 반영
  let hStem: number | null = null;
  let hEl: number | null = null;
  if (birthHour != null) {
    hStem = hourStem(birthGz.stem, hourBranch(birthHour));
    hEl = stemElement(hStem);
    const secRel = elementRelation(hEl, todayEl);
    score += Math.round((RELATION_SCORE[secRel] - 60) * 0.3);
  }

  // 결정적 jitter (-4~+4) — 같은 관계라도 날마다 미묘하게 다르게
  const seedExtra = (hStem != null ? hStem * 3 : 0) + (birthMin ?? 0);
  const jitter = ((birthGz.index * 7 + todayGz.index * 13 + seedExtra) % 9) - 4;
  score = Math.max(1, Math.min(99, score + jitter));

  const grade: Grade = score >= 75 ? 'GO' : score >= 55 ? '보통' : '패스';
  const luckyDigit = (birthGz.stem + (hStem ?? 0) + todayGz.index) % 10;

  return {
    score,
    grade,
    myStem: STEMS[birthGz.stem],
    myElement: ELEMENTS[myEl],
    todayStem: STEMS[todayGz.stem],
    todayElement: ELEMENTS[todayEl],
    relationLabel: RELATION_LABEL[relation],
    luckyDigit,
    hasTime: birthHour != null,
    hourStem: hStem != null ? STEMS[hStem] : undefined,
    hourElement: hEl != null ? ELEMENTS[hEl] : undefined,
  };
}

// 결정적 LCG — 같은 시드 = 같은 수열 (랜덤 금지, 하루 동안 번호 고정)
function makeRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface SajuNumberSet {
  numbers: number[];
  tag: string;
}

// 분포 품질: 3개 이상 연속 금지(4연속 같은 비현실 조합 차단) + 최소 3개 번호대 사용(한 구간 몰림 방지).
function isWellDistributed(sorted: number[]): boolean {
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) { run++; maxRun = Math.max(maxRun, run); }
    else run = 1;
  }
  if (maxRun >= 3) return false;
  const bands = new Set(sorted.map(n => Math.floor(n / 10))); // 0~4 (1-9,10-19,20-29,30-39,40-45)
  return bands.size >= 3;
}

// 사주 가중(행운 끝자리·오행 구간) + 통계(출현빈도) 결합으로 5세트 생성.
// (birth, today)로 시드 고정 → 같은 날 같은 사람은 항상 같은 5세트.
export function generateSajuNumbers(birth: Date, today: Date, draws: Draw[], birthHour?: number | null, birthMin?: number | null): SajuNumberSet[] {
  const b = dayGanji(birth);
  const t = dayGanji(today);
  const fortune = getDailyFortune(birth, today, birthHour, birthMin);
  const luckyDigit = fortune.luckyDigit;
  const myEl = ELEMENTS.indexOf(fortune.myElement);
  const hourSeed = (birthHour != null ? (hourStem(b.stem, hourBranch(birthHour)) + 1) * 17 : 0) + (birthMin ?? 0) * 3;

  // 통계 레이어 = 앙상블 추천 점수(결정적). 부족 시 단순 출현빈도로 폴백.
  const ensemble = getEnsembleScores(draws);
  const hasEnsemble = Object.keys(ensemble).length > 0;
  const freq = new Array(46).fill(0);
  draws.forEach(d => d.numbers.forEach(n => { if (n >= 1 && n <= 45) freq[n]++; }));
  const maxFreq = Math.max(1, ...freq.slice(1));
  const maxScore = hasEnsemble ? Math.max(1e-6, ...Object.values(ensemble)) : 1;
  // 번호별 통계 가중 0~1
  function statW(n: number): number {
    return hasEnsemble ? (ensemble[n] || 0) / maxScore : freq[n] / maxFreq;
  }

  function baseWeight(n: number): number {
    let w = 1;
    w += statW(n) * 1.5;                        // 통계: 앙상블 점수
    if (n % 10 === luckyDigit) w += 1.2;        // 사주: 행운 끝자리
    if (Math.floor((n - 1) / 9) === myEl) w += 0.6; // 사주: 내 오행 숫자대(1~45 5등분)
    return w;
  }

  // 사주 강세 3세트 + 사주×통계 2세트
  const TAGS = ['사주 강세', '사주 강세', '사주 강세', '사주×통계', '사주×통계'];
  const sets: SajuNumberSet[] = [];
  for (let si = 0; si < 5; si++) {
    const sajuHeavy = si < 3;
    let chosen: number[] = [];
    // 분포 조건 만족할 때까지 시드 바꿔 재시도(결정적). 못 찾으면 마지막 것 사용.
    for (let attempt = 0; attempt < 40; attempt++) {
      const rng = makeRng(b.index * 1000 + t.index * 37 + si * 101 + hourSeed + 1 + attempt * 7919);
      const picked = new Set<number>();
      while (picked.size < 6) {
        const pool: number[] = [];
        for (let n = 1; n <= 45; n++) {
          if (picked.has(n)) continue;
          let w = baseWeight(n);
          if (sajuHeavy) {
            // 사주 강세: 행운수·내 오행 가중 강화
            if (n % 10 === luckyDigit) w += 1.4;
            if (Math.floor((n - 1) / 9) === myEl) w += 0.8;
          } else {
            // 사주×통계(앙상블): 추천엔진 점수 더 반영
            w += statW(n) * 1.0;
            if (n % 10 === luckyDigit) w += 0.4;
          }
          const reps = Math.max(1, Math.round(w * 3));
          for (let r = 0; r < reps; r++) pool.push(n);
        }
        picked.add(pool[Math.floor(rng() * pool.length)]);
      }
      chosen = [...picked].sort((a, b2) => a - b2);
      if (isWellDistributed(chosen)) break;
    }
    sets.push({ numbers: chosen, tag: TAGS[si] });
  }
  return sets;
}

export interface DayFortune {
  date: Date;
  label: string; // 월~일
  isToday: boolean;
  fortune: DailyFortune;
}

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// ref가 속한 주(월~일) 7일의 로또운. 가장 좋은 날 고르기에 사용.
export function getWeekFortunes(birth: Date, ref: Date, birthHour?: number | null, birthMin?: number | null): DayFortune[] {
  const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ((ref.getDay() + 6) % 7));
  const todayKey = ref.toDateString();
  const out: DayFortune[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    out.push({
      date,
      label: WEEKDAY_LABELS[i],
      isToday: date.toDateString() === todayKey,
      fortune: getDailyFortune(birth, date, birthHour, birthMin),
    });
  }
  return out;
}

// 7일 중 가장 점수 높은 날의 인덱스
export function bestDayIndex(days: DayFortune[]): number {
  let best = 0;
  for (let i = 1; i < days.length; i++) {
    if (days[i].fortune.score > days[best].fortune.score) best = i;
  }
  return best;
}
