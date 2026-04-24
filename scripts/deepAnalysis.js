const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/lotto_history.json'), 'utf8'));

const total = data.length;

// ─── 1. 전체 빈도 분석 ────────────────────────────────────
const freq = {};
for (let n = 1; n <= 45; n++) freq[n] = 0;
data.forEach(d => d.numbers.forEach(n => freq[n]++));

const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
console.log('━━━━━━━━ 1. 전체 출현 빈도 TOP 10 / BOTTOM 10 ━━━━━━━━');
console.log('가장 많이 나온 번호:');
sorted.slice(0, 10).forEach(([n, c]) => {
  console.log(`  ${String(n).padStart(2)}번: ${c}회 (${(c/total*100).toFixed(1)}%)`);
});
console.log('가장 적게 나온 번호:');
sorted.slice(-10).reverse().forEach(([n, c]) => {
  console.log(`  ${String(n).padStart(2)}번: ${c}회 (${(c/total*100).toFixed(1)}%)`);
});

// ─── 2. 계절별 분석 ──────────────────────────────────────
const seasons = { spring: [], summer: [], fall: [], winter: [] };
data.forEach(d => {
  const month = parseInt(d.drwNoDate.split('.')[1]);
  if (month >= 3 && month <= 5) seasons.spring.push(d);
  else if (month >= 6 && month <= 8) seasons.summer.push(d);
  else if (month >= 9 && month <= 11) seasons.fall.push(d);
  else seasons.winter.push(d);
});

console.log('\n━━━━━━━━ 2. 계절별 TOP 5 번호 ━━━━━━━━');
const seasonNames = { spring: '봄(3~5월)', summer: '여름(6~8월)', fall: '가을(9~11월)', winter: '겨울(12~2월)' };
for (const [s, draws] of Object.entries(seasons)) {
  const sf = {};
  for (let n = 1; n <= 45; n++) sf[n] = 0;
  draws.forEach(d => d.numbers.forEach(n => sf[n]++));
  const top5 = Object.entries(sf).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`${seasonNames[s]} (${draws.length}회): ${top5.map(([n,c]) => `${n}번(${c}회)`).join(', ')}`);
}

// ─── 3. 연속 번호 분석 ───────────────────────────────────
let consecutiveCount = 0;
const consecutivePairs = {};
data.forEach(d => {
  const sorted = [...d.numbers].sort((a, b) => a - b);
  let hasConsec = false;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i-1] === 1) {
      hasConsec = true;
      const pair = `${sorted[i-1]}-${sorted[i]}`;
      consecutivePairs[pair] = (consecutivePairs[pair] || 0) + 1;
    }
  }
  if (hasConsec) consecutiveCount++;
});

console.log('\n━━━━━━━━ 3. 연속 번호 분석 ━━━━━━━━');
console.log(`연속 번호 포함 회차: ${consecutiveCount}회 / ${total}회 (${(consecutiveCount/total*100).toFixed(1)}%)`);
const topPairs = Object.entries(consecutivePairs).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log('자주 나온 연속 쌍 TOP 5:');
topPairs.forEach(([pair, c]) => console.log(`  ${pair}: ${c}회`));

// ─── 4. 홀짝 분포 ────────────────────────────────────────
const oddEven = {};
data.forEach(d => {
  const odd = d.numbers.filter(n => n % 2 !== 0).length;
  const key = `홀${odd}짝${6-odd}`;
  oddEven[key] = (oddEven[key] || 0) + 1;
});
console.log('\n━━━━━━━━ 4. 홀수/짝수 분포 ━━━━━━━━');
Object.entries(oddEven).sort((a, b) => b[1] - a[1]).forEach(([k, c]) => {
  console.log(`  ${k}: ${c}회 (${(c/total*100).toFixed(1)}%)`);
});

// ─── 5. 구간 분포 (1-15 / 16-30 / 31-45) ─────────────────
const rangePatterns = {};
data.forEach(d => {
  const low = d.numbers.filter(n => n <= 15).length;
  const mid = d.numbers.filter(n => n >= 16 && n <= 30).length;
  const high = d.numbers.filter(n => n >= 31).length;
  const key = `저${low}중${mid}고${high}`;
  rangePatterns[key] = (rangePatterns[key] || 0) + 1;
});
console.log('\n━━━━━━━━ 5. 구간 분포 TOP 8 (저:1-15 / 중:16-30 / 고:31-45) ━━━━━━━━');
Object.entries(rangePatterns).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, c]) => {
  console.log(`  ${k}: ${c}회 (${(c/total*100).toFixed(1)}%)`);
});

// ─── 6. 합계 분포 ────────────────────────────────────────
const sums = data.map(d => d.numbers.reduce((a, b) => a + b, 0));
const avgSum = Math.round(sums.reduce((a, b) => a + b, 0) / total);
sums.sort((a, b) => a - b);
console.log('\n━━━━━━━━ 6. 당첨번호 합계 분석 ━━━━━━━━');
console.log(`  평균 합계: ${avgSum}`);
console.log(`  최솟값: ${sums[0]} / 최댓값: ${sums[sums.length-1]}`);
console.log(`  중간 80% 범위: ${sums[Math.floor(total*0.1)]} ~ ${sums[Math.floor(total*0.9)]}`);

// ─── 7. 최근 미출현 번호 ─────────────────────────────────
const lastSeen = {};
for (let n = 1; n <= 45; n++) lastSeen[n] = 0;
data.forEach(d => d.numbers.forEach(n => { lastSeen[n] = d.drwNo; }));
const latestDrw = data[data.length-1].drwNo;
const gaps = Object.entries(lastSeen).map(([n, last]) => ({ n: parseInt(n), gap: latestDrw - last }));
gaps.sort((a, b) => b.gap - a.gap);

console.log('\n━━━━━━━━ 7. 현재 가장 오래 미출현 번호 ━━━━━━━━');
gaps.slice(0, 10).forEach(({ n, gap }) => {
  console.log(`  ${String(n).padStart(2)}번: ${gap}회째 미출현`);
});

// ─── 8. 연도별 많이 나온 번호 ────────────────────────────
const yearFreq = {};
data.forEach(d => {
  const year = d.drwNoDate.split('.')[0];
  if (!yearFreq[year]) { yearFreq[year] = {}; for (let n=1;n<=45;n++) yearFreq[year][n]=0; }
  d.numbers.forEach(n => yearFreq[year][n]++);
});
console.log('\n━━━━━━━━ 8. 연도별 TOP 3 번호 ━━━━━━━━');
Object.entries(yearFreq).sort().forEach(([year, f]) => {
  const top3 = Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,c])=>`${n}번(${c}회)`);
  console.log(`  ${year}년: ${top3.join(', ')}`);
});
