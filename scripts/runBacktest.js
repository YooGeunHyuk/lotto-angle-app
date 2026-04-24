// 백테스팅 스크립트 - 엔진 정확도 검증
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/lotto_history.json'), 'utf8'));

// ─── 엔진 로직 (lottoEngine.ts 와 동일) ────────────────────

function calcFrequency(draws) {
  const freq = {};
  for (let n = 1; n <= 45; n++) freq[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => freq[n]++));
  return freq;
}

function calcGap(draws, targetDrw) {
  const lastSeen = {};
  for (let n = 1; n <= 45; n++) lastSeen[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => { lastSeen[n] = d.drwNo; }));
  const gap = {};
  for (let n = 1; n <= 45; n++) gap[n] = targetDrw - lastSeen[n];
  return gap;
}

function calcPairAffinity(draws, recentCount = 10) {
  if (draws.length < recentCount + 1) return {};
  const recentDraws = draws.slice(-recentCount);
  const recentNumbers = new Set(recentDraws.flatMap(d => d.numbers));
  const pairFreq = {};
  draws.forEach(d => {
    const nums = d.numbers;
    for (let i = 0; i < nums.length; i++)
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${Math.min(nums[i], nums[j])}_${Math.max(nums[i], nums[j])}`;
        pairFreq[key] = (pairFreq[key] || 0) + 1;
      }
  });
  const affinity = {};
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

function calcDeltaPattern(draws) {
  const deltaFreq = {};
  draws.forEach(d => {
    const sorted = [...d.numbers].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i] - sorted[i - 1];
      deltaFreq[delta] = (deltaFreq[delta] || 0) + 1;
    }
  });
  const topDeltas = Object.entries(deltaFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => parseInt(e[0]));
  const score = {};
  for (let n = 1; n <= 45; n++) score[n] = 0;
  const lastDraw = draws[draws.length - 1];
  lastDraw.numbers.forEach(base => {
    topDeltas.forEach(delta => {
      const c = base + delta;
      if (c >= 1 && c <= 45) score[c] = (score[c] || 0) + deltaFreq[delta];
    });
  });
  return score;
}

function calcSumBalance(draws) {
  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
  return { targetMin: sums[Math.floor(sums.length * 0.1)], targetMax: sums[Math.floor(sums.length * 0.9)] };
}

function normalize(record) {
  const values = Object.values(record);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const result = {};
  for (const k in record) result[k] = (record[k] - min) / range;
  return result;
}

function predict(draws, targetDrwNo) {
  if (draws.length < 10) return [];
  const freq = normalize(calcFrequency(draws));
  const recentFreq = normalize(calcFrequency(draws.slice(-50)));
  const gap = normalize(calcGap(draws, targetDrwNo));
  const pair = normalize(calcPairAffinity(draws, 10));
  const delta = normalize(calcDeltaPattern(draws));
  const { targetMin, targetMax } = calcSumBalance(draws);

  const scores = [];
  for (let n = 1; n <= 45; n++) {
    scores.push({
      n,
      score: (freq[n] || 0) * 0.15 + (recentFreq[n] || 0) * 0.25 +
             (gap[n] || 0) * 0.20 + (pair[n] || 0) * 0.20 + (delta[n] || 0) * 0.20
    });
  }
  scores.sort((a, b) => b.score - a.score);

  const pool = scores.slice(0, 15).map(s => s.n);
  const scoreMap = {};
  scores.forEach(s => scoreMap[s.n] = s.score);

  let best = pool.slice(0, 6), bestScore = -1;
  for (let iter = 0; iter < 300; iter++) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
    const sum = shuffled.reduce((a, b) => a + b, 0);
    if (sum >= targetMin && sum <= targetMax) {
      const sc = shuffled.reduce((a, n) => a + scoreMap[n], 0);
      if (sc > bestScore) { bestScore = sc; best = shuffled; }
    }
  }
  return best.sort((a, b) => a - b);
}

// ─── 백테스팅 실행 ────────────────────────────────────────

const START = 100;
const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
let totalHits = 0;
const total = data.length - START;

console.log(`백테스팅 시작: ${START}회차 ~ ${data.length}회차 (총 ${total}회 예측)\n`);

for (let i = START; i < data.length; i++) {
  const past = data.slice(0, i);
  const actual = new Set(data[i].numbers);
  const predicted = predict(past, data[i].drwNo);
  const hits = predicted.filter(n => actual.has(n)).length;
  dist[hits]++;
  totalHits += hits;
  if (i % 100 === 0) process.stdout.write(`\r진행: ${i}/${data.length}회차`);
}

console.log('\n\n━━━━━━━━ 백테스팅 결과 ━━━━━━━━');
console.log(`총 예측 횟수: ${total}회`);
console.log(`평균 적중 개수: ${(totalHits / total).toFixed(3)}개 / 6개`);
console.log(`\n번호별 적중 분포:`);
for (let k = 0; k <= 6; k++) {
  const pct = ((dist[k] / total) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(dist[k] / total * 30));
  console.log(`  ${k}개 적중: ${String(dist[k]).padStart(4)}회 (${pct}%) ${bar}`);
}

// 완전 랜덤 기댓값 비교
const randomExpected = 6 * 6 / 45;
console.log(`\n완전 랜덤 기댓값: ${randomExpected.toFixed(3)}개`);
console.log(`엔진 성능 향상: +${((totalHits / total) - randomExpected).toFixed(3)}개`);

// 최신 회차 예측
const latest = predict(data, data[data.length - 1].drwNo + 1);
console.log(`\n━━━━━━━━ ${data[data.length - 1].drwNo + 1}회차 예측 번호 ━━━━━━━━`);
console.log(`  ${latest.join('  ')}`);
console.log(`  (${data[data.length - 1].drwNoDate} 다음 회차)`);
