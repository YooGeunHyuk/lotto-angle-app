const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../data/lotto_history.json');
const LUCKY_STORES_PATH = path.join(__dirname, '../data/lucky_stores.json');
const DELAY_MS = Number(process.env.LOTTO_FETCH_DELAY_MS || 350);
const LOOKAHEAD = Number(process.env.LOTTO_LOOKAHEAD || 20);

// 동행복권 회차 API가 응답하지 않을 때 사용하는 사용자 Gist fallback.
// LOTTO_GIST_URL 환경변수로 덮어쓸 수 있음.
const FALLBACK_GIST_URL = process.env.LOTTO_GIST_URL
  || 'https://gist.githubusercontent.com/YooGeunHyuk/c43d9902c513e986c4a9ee2bd78eee33/raw/lotto.json';

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

// Gist 응답이 깨져있어도 [...] 블록을 모두 추출해 합쳐서 살린다.
function parseLenientJson(text) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // strict parse 실패 — chunk 모드로
  }
  const draws = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          const arr = JSON.parse(text.slice(start, i + 1));
          if (Array.isArray(arr)) draws.push(...arr);
        } catch {
          // 한 청크 깨져도 다른 청크는 살림
        }
        start = -1;
      }
    }
  }
  return draws;
}

async function fetchFromGist() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(FALLBACK_GIST_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.log(`Gist fallback 실패: HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    const raw = parseLenientJson(text);
    return raw
      .map(d => ({
        drwNo: Number(d?.drwNo),
        drwNoDate: typeof d?.drwNoDate === 'string' ? d.drwNoDate.replace(/-/g, '.') : '',
        numbers: Array.isArray(d?.numbers) ? d.numbers.map(Number) : [],
        bonus: Number(d?.bonus),
      }))
      .filter(isValidDraw);
  } catch (e) {
    console.log(`Gist fallback 에러: ${e.message || e}`);
    return [];
  }
}

// 명당 데이터에 latestRound가 있으면, 그걸로 "최소 어디까지 시도해야 하는지" 알 수 있다.
function readLuckyStoresLatestRound() {
  try {
    if (!fs.existsSync(LUCKY_STORES_PATH)) return 0;
    const json = JSON.parse(fs.readFileSync(LUCKY_STORES_PATH, 'utf8'));
    return Number(json?.latestRound) || 0;
  } catch {
    return 0;
  }
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
  // 명당 데이터가 "이미 더 최신을 안다" 면 그 회차까지는 반드시 시도.
  const luckyLatest = readLuckyStoresLatestRound();
  const stopAt = Math.max(latestExisting + LOOKAHEAD, luckyLatest);
  console.log(`기존 데이터: ${existing.length}개, 최신 ${latestExisting || '없음'}회`);
  if (luckyLatest > latestExisting) {
    console.log(`명당 데이터는 ${luckyLatest}회까지 알고 있음 — 거기까지는 반드시 시도합니다.`);
  }
  console.log(`${startFrom}회차부터 최대 ${stopAt}회차까지 확인합니다.`);

  const results = [...existing];
  const known = new Set(existing.map(d => d.drwNo));
  let added = 0;

  // 1) 동행복권 API에서 받기
  for (let i = startFrom; i <= stopAt; i++) {
    const draw = await fetchDraw(i);
    if (draw && isValidDraw(draw)) {
      results.push(draw);
      known.add(i);
      added += 1;
      console.log(`${i}회 동행복권에서 추가: ${draw.numbers.join(', ')} + ${draw.bonus}`);
    } else {
      console.log(`${i}회 동행복권 API에서는 아직 없음.`);
      // 명당 데이터의 latestRound까지는 일단 break하지 않고 계속 (Gist에 있을 수 있음)
      if (i >= luckyLatest) break;
    }
    await sleep(DELAY_MS);
  }

  // 2) 동행복권에서 못 받은 회차는 사용자 Gist에서 보완 시도
  const missingFromBundle = [];
  for (let i = startFrom; i <= stopAt; i++) {
    if (!known.has(i)) missingFromBundle.push(i);
  }
  if (missingFromBundle.length > 0) {
    console.log(`Gist fallback 시도... 누락된 회차: ${missingFromBundle.join(', ')}`);
    const gistDraws = await fetchFromGist();
    let gistAdded = 0;
    for (const draw of gistDraws) {
      if (!known.has(draw.drwNo) && missingFromBundle.includes(draw.drwNo)) {
        results.push(draw);
        known.add(draw.drwNo);
        added += 1;
        gistAdded += 1;
        console.log(`${draw.drwNo}회 Gist에서 추가: ${draw.numbers.join(', ')} + ${draw.bonus}`);
      }
    }
    if (gistAdded === 0) {
      console.log('Gist에서도 보완할 회차가 없습니다.');
    }
  }

  const merged = mergeDraws(results);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`완료! ${added}개 추가, 총 ${merged.length}회차 저장 → ${OUTPUT_PATH}`);
}

main().catch(console.error);
