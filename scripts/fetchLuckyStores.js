const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../data/lucky_stores.json');
const LATEST_ROUNDS_TO_SCAN = 260;
const MAX_STORES = 180;
const DELAY_MS = 80;

const BASE_URL = 'https://www.dhlottery.co.kr';
const HEADERS = {
  Accept: 'application/json, text/javascript, */*; q=0.01',
  Referer: 'https://www.dhlottery.co.kr/wnprchsplcsrch/home',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function storeKey(item) {
  return item.ltShpId || `${normalizeText(item.shpNm)}|${normalizeText(item.shpAddr)}`;
}

function isOfflineStore(item) {
  const name = normalizeText(item.shpNm);
  const address = normalizeText(item.shpAddr);
  return !name.includes('인터넷') && !address.includes('dhlottery.co.kr');
}

async function fetchJson(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}

async function getLatestRound() {
  const json = await fetchJson(`${BASE_URL}/lt645/selectLtEpsdInfo.do`);
  const latest = json?.data?.list?.[0]?.ltEpsd;
  if (!Number.isInteger(latest)) throw new Error('Latest round was not found');
  return latest;
}

async function fetchRoundStores(round) {
  const url = `${BASE_URL}/wnprchsplcsrch/selectLtWnShp.do?srchWnShpRnk=all&srchLtEpsd=${round}&srchShpLctn=`;
  const json = await fetchJson(url);
  return Array.isArray(json?.data?.list) ? json.data.list : [];
}

function applyWin(store, item, round) {
  const rank = Number(item.wnShpRnk);
  if (rank === 1) store.firstWins += 1;
  if (rank === 2) store.secondWins += 1;

  const method = item.atmtPsvYnTxt;
  if (method === '자동') store.autoWins += 1;
  else if (method === '수동') store.manualWins += 1;
  else if (method === '반자동') store.semiAutoWins += 1;

  if (round > store.lastRound) {
    store.lastRound = round;
    store.lastRank = rank;
  }
}

async function main() {
  const latestRound = await getLatestRound();
  const startRound = Math.max(1, latestRound - LATEST_ROUNDS_TO_SCAN + 1);
  const byStore = new Map();

  console.log(`Fetching lucky stores from ${startRound} to ${latestRound}`);

  for (let round = latestRound; round >= startRound; round--) {
    const items = await fetchRoundStores(round);
    items.forEach(item => {
      if (!isOfflineStore(item)) return;

      const lat = Number(item.shpLat);
      const lng = Number(item.shpLot);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const key = storeKey(item);
      if (!byStore.has(key)) {
        byStore.set(key, {
          id: key,
          name: normalizeText(item.shpNm),
          address: normalizeText(item.shpAddr),
          region: normalizeText(item.region || item.tm1ShpLctnAddr),
          phone: normalizeText(item.shpTelno),
          lat,
          lng,
          firstWins: 0,
          secondWins: 0,
          autoWins: 0,
          manualWins: 0,
          semiAutoWins: 0,
          lastRound: 0,
          lastRank: 0,
        });
      }

      applyWin(byStore.get(key), item, round);
    });

    if (round % 20 === 0 || round === startRound) {
      process.stdout.write(`\r${round}/${startRound} processed, stores: ${byStore.size}`);
    }
    await sleep(DELAY_MS);
  }

  const stores = Array.from(byStore.values())
    .map(store => ({
      ...store,
      totalWins: store.firstWins + store.secondWins,
      score: store.firstWins * 4 + store.secondWins,
    }))
    .sort((a, b) => b.score - a.score || b.totalWins - a.totalWins || b.lastRound - a.lastRound)
    .slice(0, MAX_STORES);

  const payload = {
    source: 'https://www.dhlottery.co.kr/wnprchsplcsrch/home',
    generatedAt: new Date().toISOString(),
    latestRound,
    startRound,
    roundsIncluded: latestRound - startRound + 1,
    maxStores: MAX_STORES,
    periodLabel: `최근 ${latestRound - startRound + 1}회`,
    stores,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nSaved ${stores.length} stores to ${OUTPUT_PATH}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
