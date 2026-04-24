const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../data/lotto_history.json');
const DELAY_MS = 150;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.dhlottery.co.kr/gameResult.do?method=byWin',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDraw(drawNo, retries = 3) {
  const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drawNo}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
      clearTimeout(timer);
      const text = await res.text();
      if (text.trim().startsWith('<')) return null;
      const data = JSON.parse(text);
      if (data.returnValue !== 'success') return null;
      return {
        drwNo: data.drwNo,
        drwNoDate: data.drwNoDate,
        numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
        bonus: data.bnusNo,
        firstWinamnt: data.firstWinamnt,
        firstPrzwnerCo: data.firstPrzwnerCo,
      };
    } catch (e) {
      if (attempt < retries - 1) {
        process.stdout.write(` [재시도 ${attempt + 1}]`);
        await sleep(1000 * (attempt + 1));
      }
    }
  }
  return null;
}

async function getLatestDrawNo() {
  let lo = 1100, hi = 1300;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const data = await fetchDraw(mid);
    if (data) lo = mid;
    else hi = mid - 1;
    await sleep(DELAY_MS);
  }
  return lo;
}

async function main() {
  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  let existing = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    console.log(`기존 데이터: ${existing.length}회차`);
  }

  const startFrom = existing.length > 0 ? existing[existing.length - 1].drwNo + 1 : 1;

  console.log('최신 회차 확인 중...');
  const latestNo = await getLatestDrawNo();
  console.log(`최신 회차: ${latestNo}회`);
  console.log(`${startFrom}회차부터 ${latestNo}회차까지 수집 시작...`);

  const results = [...existing];
  for (let i = startFrom; i <= latestNo; i++) {
    const draw = await fetchDraw(i);
    if (draw) {
      results.push(draw);
      if (i % 50 === 0 || i === latestNo) {
        process.stdout.write(`\r${i}/${latestNo}회차 완료`);
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
      }
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n완료! 총 ${results.length}회차 저장 → ${OUTPUT_PATH}`);
}

main().catch(console.error);
