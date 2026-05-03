const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../data/lotto_retail_stores.json');
const LUCKY_STORE_PATH = path.join(__dirname, '../data/lucky_stores.json');
const DELAY_MS = 40;
const BASE_URL = 'https://www.dhlottery.co.kr';
const HEADERS = {
  Accept: 'application/json, text/javascript, */*; q=0.01',
  Referer: 'https://www.dhlottery.co.kr/prchsplcsrch/home',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

const REGIONS = [
  ['강원도', '강원'],
  ['경기도', '경기'],
  ['경상남도', '경남'],
  ['경상북도', '경북'],
  ['광주광역시', '광주'],
  ['대구광역시', '대구'],
  ['대전광역시', '대전'],
  ['부산광역시', '부산'],
  ['서울특별시', '서울'],
  ['세종특별자치시', '세종'],
  ['울산광역시', '울산'],
  ['인천광역시', '인천'],
  ['전라남도', '전남'],
  ['전라북도', '전북'],
  ['제주특별자치도', '제주'],
  ['충청남도', '충남'],
  ['충청북도', '충북'],
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeAddress(value) {
  return normalizeText(value).replace(/\s/g, '');
}

function luckyKey(name, address) {
  return `${normalizeText(name)}|${normalizeAddress(address)}`;
}

async function fetchJson(pathname, params, retries = 6) {
  const url = new URL(pathname, BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

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

async function fetchDistricts(regionName) {
  const json = await fetchJson('/prchsplcsrch/selectAdmdst.do', { srchCtpvNm: regionName });
  return Array.isArray(json?.data?.list) ? json.data.list.map(item => normalizeText(item.sggNm)).filter(Boolean) : [];
}

async function fetchStorePage(regionCode, district, pageNum) {
  const json = await fetchJson('/prchsplcsrch/selectLtShp.do', {
    l645LtNtslYn: 'Y',
    l520LtNtslYn: 'N',
    st5LtNtslYn: 'N',
    st10LtNtslYn: 'N',
    st20LtNtslYn: 'N',
    cpexUsePsbltyYn: 'N',
    pageNum: String(pageNum),
    recordCountPerPage: '10',
    pageCount: '5',
    srchCtpvNm: regionCode,
    srchSggNm: district,
  });
  return json?.data ?? { total: 0, list: [] };
}

function readLuckyStats() {
  const luckyPayload = JSON.parse(fs.readFileSync(LUCKY_STORE_PATH, 'utf8'));
  const byId = new Map();
  const byNameAddress = new Map();

  luckyPayload.stores.forEach(store => {
    byId.set(String(store.id), store);
    byNameAddress.set(luckyKey(store.name, store.address), store);
  });

  return { payload: luckyPayload, byId, byNameAddress };
}

function writePayload(stores, luckyStats, skipped = []) {
  const payload = {
    source: 'https://www.dhlottery.co.kr/prchsplcsrch/home',
    generatedAt: new Date().toISOString(),
    linkedWinningStoreSource: luckyStats.payload.source,
    linkedWinningStoreLatestRound: luckyStats.payload.latestRound,
    count: stores.length,
    skipped,
    stores,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function statsFor(item, luckyStats) {
  const byId = luckyStats.byId.get(String(item.ltShpId));
  const byNameAddress = luckyStats.byNameAddress.get(luckyKey(item.conmNm, item.bplcRdnmDaddr));
  return byId || byNameAddress || null;
}

function normalizeStore(item, luckyStats) {
  const lat = Number(item.shpLat);
  const lng = Number(item.shpLot);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const stats = statsFor(item, luckyStats);
  const firstWins = stats?.firstWins ?? 0;
  const secondWins = stats?.secondWins ?? 0;

  return {
    id: String(item.ltShpId),
    name: normalizeText(item.conmNm),
    address: normalizeText(item.bplcRdnmDaddr),
    region: [item.tm1BplcLctnAddr, item.tm2BplcLctnAddr].map(normalizeText).filter(Boolean).join(' '),
    phone: normalizeText(item.shpTelno),
    lat,
    lng,
    firstWins,
    secondWins,
    totalWins: firstWins + secondWins,
    score: firstWins * 4 + secondWins,
    lastRound: stats?.lastRound ?? 0,
    lastRank: stats?.lastRank ?? 0,
    sellsLotto645: item.l645LtNtslYn === 'Y',
  };
}

async function main() {
  const luckyStats = readLuckyStats();
  const byStore = new Map();
  const skipped = [];

  for (const [regionName, regionCode] of REGIONS) {
    let districts = [];
    try {
      districts = await fetchDistricts(regionName);
    } catch (error) {
      skipped.push({ regionName, error: error.message });
      console.log(`\nSkipped ${regionName}: ${error.message}`);
      continue;
    }
    console.log(`${regionName}: ${districts.length} districts`);

    for (const district of districts) {
      let page = 1;
      let total = 0;

      try {
        while (true) {
          const data = await fetchStorePage(regionCode, district, page);
          const list = Array.isArray(data.list) ? data.list : [];
          total = Number(data.total) || total;

          list.map(item => normalizeStore(item, luckyStats)).filter(Boolean).forEach(store => {
            byStore.set(store.id, store);
          });

          const fetched = page * 10;
          process.stdout.write(`\r${regionCode} ${district} ${Math.min(fetched, total)}/${total} stores, total ${byStore.size}`);
          if (list.length === 0 || fetched >= total) break;
          page += 1;
          await sleep(DELAY_MS);
        }
      } catch (error) {
        skipped.push({ regionName, district, page, error: error.message });
        console.log(`\nSkipped ${regionCode} ${district} page ${page}: ${error.message}`);
      }
      await sleep(DELAY_MS);
    }
    process.stdout.write('\n');
    const partialStores = Array.from(byStore.values())
      .sort((a, b) => b.firstWins - a.firstWins || b.secondWins - a.secondWins || a.region.localeCompare(b.region, 'ko') || a.name.localeCompare(b.name, 'ko'));
    writePayload(partialStores, luckyStats, skipped);
  }

  const stores = Array.from(byStore.values())
    .sort((a, b) => b.firstWins - a.firstWins || b.secondWins - a.secondWins || a.region.localeCompare(b.region, 'ko') || a.name.localeCompare(b.name, 'ko'));

  writePayload(stores, luckyStats, skipped);
  console.log(`Saved ${stores.length} retail stores to ${OUTPUT_PATH}`);
  if (skipped.length > 0) console.log(`Skipped ${skipped.length} districts/regions`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
