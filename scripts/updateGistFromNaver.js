// 최신 로또 회차를 가져와 Gist를 자동 업데이트.
// CI(GitHub Actions 데이터센터 IP)에선 네이버가 403으로 막혀서 dhlottery 공식 API를 1순위로,
// 네이버 검색 파싱을 fallback으로 쓴다. (반대로 앱/로컬 주거용 IP에선 네이버가 잘 됨)
//
// 환경변수:
//   GIST_TOKEN  — GitHub PAT (gist scope)
//   GIST_ID     — 업데이트할 Gist ID (기본값: 사용자 기본 Gist)
//   GIST_FILE   — Gist 안의 파일명 (기본값: lotto.json)

const GIST_ID = process.env.GIST_ID || 'c43d9902c513e986c4a9ee2bd78eee33';
const GIST_FILE = process.env.GIST_FILE || 'lotto.json';
const TOKEN = process.env.GIST_TOKEN;

if (!TOKEN) {
  console.error('GIST_TOKEN 환경변수 필요');
  process.exit(1);
}

const NAVER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

async function fetchNaver(query) {
  const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': NAVER_UA } });
  if (!res.ok) throw new Error(`Naver HTTP ${res.status}`);
  return res.text();
}

function parseLottoFromHtml(html) {
  const mRound = html.match(/(\d{3,4})회차\s*\((\d{4})\.(\d{2})\.(\d{2})\.\)/);
  if (!mRound) return null;
  const drwNo = Number(mRound[1]);
  const drwNoDate = `${mRound[2]}-${mRound[3]}-${mRound[4]}`;

  const balls = [...html.matchAll(/<span class="ball type\d+">(\d+)<\/span>/g)].map(m => Number(m[1]));
  if (balls.length < 7) return null;
  return {
    drwNo,
    drwNoDate,
    numbers: balls.slice(0, 6),
    bonus: balls[6],
  };
}

const DH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.dhlottery.co.kr/gameResult.do?method=byWin',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
};

// dhlottery 공식 API. GitHub Actions(데이터센터 IP)에선 동작하지만 네이버는 거기서 403 → CI에선 이걸 1순위로.
async function fetchDhlottery(drw) {
  try {
    const res = await fetch(`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drw}`, { headers: DH_HEADERS });
    const text = await res.text();
    if (text.trim().startsWith('<')) return null;
    const data = JSON.parse(text);
    if (data.returnValue !== 'success') return null;
    return {
      drwNo: Number(data.drwNo),
      drwNoDate: String(data.drwNoDate),
      numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6].map(Number),
      bonus: Number(data.bnusNo),
    };
  } catch {
    return null;
  }
}

// 특정 회차를 dhlottery → 네이버 순으로 시도. 둘 다 실패/미발표면 null.
async function fetchDrawAny(drw) {
  const dh = await fetchDhlottery(drw);
  if (dh && isValidDraw(dh)) return dh;
  try {
    const d = parseLottoFromHtml(await fetchNaver(`로또 ${drw}회`));
    if (d && isValidDraw(d) && d.drwNo === drw) return d;
  } catch {
    // 네이버 차단(403 등) — CI 데이터센터 IP에선 흔함. 무시하고 null.
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

async function getGistContent() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`Gist GET 실패: HTTP ${res.status}`);
  const gist = await res.json();
  const file = gist.files[GIST_FILE];
  if (!file) throw new Error(`Gist 파일 없음: ${GIST_FILE}`);
  return JSON.parse(file.content);
}

async function updateGist(newContent) {
  const body = {
    files: {
      [GIST_FILE]: {
        content: JSON.stringify(newContent, null, 2) + '\n',
      },
    },
  };
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gist PATCH 실패: HTTP ${res.status} — ${errText}`);
  }
}

async function main() {
  console.log('1) 기존 Gist 조회...');
  const existing = await getGistContent();
  if (!Array.isArray(existing)) throw new Error('Gist 내용 배열 아님');
  const lastDrw = existing.reduce((max, d) => Math.max(max, Number(d.drwNo) || 0), 0);
  console.log(`   Gist 최신 회차: ${lastDrw}`);

  console.log('2) 다음 회차부터 조회 (dhlottery 우선, 네이버 fallback)...');
  const newDraws = [];
  const MAX_LOOKAHEAD = 10;
  for (let drw = lastDrw + 1; drw <= lastDrw + MAX_LOOKAHEAD; drw++) {
    const d = await fetchDrawAny(drw);
    if (!d) {
      console.log(`   ${drw}회 없음(미발표/소스차단) — 중단`);
      break;
    }
    newDraws.push(d);
    console.log(`   ${drw}회: ${d.numbers.join(', ')} + ${d.bonus}`);
    await new Promise(r => setTimeout(r, 400));
  }

  if (newDraws.length === 0) {
    console.log('업데이트 불필요 — Gist가 이미 최신.');
    return;
  }

  const merged = [...existing, ...newDraws].sort((a, b) => a.drwNo - b.drwNo);
  console.log(`3) Gist 업데이트 — 총 ${merged.length}회차 (${newDraws.length}개 추가)`);
  await updateGist(merged);
  // 새 회차가 실제로 추가된 이 실행에서만 신호 → CI가 푸시 1회만 발송(중복 방지).
  if (process.env.GITHUB_OUTPUT) {
    const latestAdded = newDraws[newDraws.length - 1].drwNo;
    require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `added=true\nlatest=${latestAdded}\n`);
  }
  console.log('완료!');
}

main().catch(err => {
  console.error('에러:', err.message || err);
  process.exit(1);
});
