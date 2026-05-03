const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../data/lotto_history.json');
const DELAY_MS = Number(process.env.LOTTO_FETCH_DELAY_MS || 350);
const LOOKAHEAD = Number(process.env.LOTTO_LOOKAHEAD || 20);

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
        drwNo: Number(data.drwNo),
        drwNoDate: String(data.drwNoDate).replace(/-/g, '.'),
        numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6].map(Number),
        bonus: Number(data.bnusNo),
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

function isValidDraw(draw) {
  return Number.isInteger(draw?.drwNo)
    && typeof draw.drwNoDate === 'string'
    && Array.isArray(draw.numbers)
    && draw.numbers.length === 6
    && draw.numbers.every(n => Number.isInteger(n) && n >= 1 && n <= 45)
    && new Set(draw.numbers).size === 6
    && Number.isInteger(draw.bonus)
    && draw.bonus >= 1
    && draw.bonus <= 45
    && !draw.numbers.includes(draw.bonus);
}

function mergeDraws(draws) {
  const byRound = new Map();
  draws.filter(isValidDraw).forEach(draw => {
    byRound.set(draw.drwNo, {
      drwNo: draw.drwNo,
      drwNoDate: draw.drwNoDate.replace(/-/g, '.'),
      numbers: [...draw.numbers].sort((a, b) => a - b),
      bonus: draw.bonus,
    });
  });
  return Array.from(byRound.values()).sort((a, b) => a.drwNo - b.drwNo);
}

async function main() {
  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  let existing = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    existing = mergeDraws(JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')));
  }

  const latestExisting = existing[existing.length - 1]?.drwNo ?? 0;
  const startFrom = latestExisting + 1;
  const stopAt = latestExisting + LOOKAHEAD;
  console.log(`기존 데이터: ${existing.length}개, 최신 ${latestExisting || '없음'}회`);
  console.log(`${startFrom}회차부터 최대 ${stopAt}회차까지 확인합니다.`);

  const results = [...existing];
  let added = 0;
  for (let i = startFrom; i <= stopAt; i++) {
    const draw = await fetchDraw(i);
    if (draw) {
      results.push(draw);
      added += 1;
      console.log(`${i}회 추가: ${draw.numbers.join(', ')} + ${draw.bonus}`);
    } else {
      console.log(`${i}회 데이터가 아직 없습니다.`);
      break;
    }
    await sleep(DELAY_MS);
  }

  const merged = mergeDraws(results);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`완료! ${added}개 추가, 총 ${merged.length}회차 저장 → ${OUTPUT_PATH}`);
}

main().catch(console.error);
