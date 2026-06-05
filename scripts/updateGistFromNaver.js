// 네이버 검색에서 최신 로또 회차를 가져와 Gist를 자동 업데이트.
// dhlottery 공식 API는 차단이 잦아서 네이버 검색 결과 파싱을 사용.
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

  console.log('2) 네이버에서 최신 회차 조회...');
  const html = await fetchNaver('로또 당첨번호');
  const latest = parseLottoFromHtml(html);
  if (!latest || !isValidDraw(latest)) {
    console.log('   네이버에서 유효한 데이터 못 가져옴. 종료.');
    process.exit(0);
  }
  console.log(`   네이버 최신: ${latest.drwNo}회 (${latest.drwNoDate})`);

  if (latest.drwNo <= lastDrw) {
    console.log('업데이트 불필요 — Gist가 이미 최신.');
    return;
  }

  console.log(`3) ${lastDrw + 1}회 ~ ${latest.drwNo}회 사이 회차 채우기...`);
  const newDraws = [];
  for (let drw = lastDrw + 1; drw <= latest.drwNo; drw++) {
    if (drw === latest.drwNo) {
      newDraws.push(latest);
      console.log(`   ${drw}회 (네이버 직접): ${latest.numbers.join(', ')} + ${latest.bonus}`);
      continue;
    }
    const h = await fetchNaver(`로또 ${drw}회`);
    const d = parseLottoFromHtml(h);
    if (d && isValidDraw(d) && d.drwNo === drw) {
      newDraws.push(d);
      console.log(`   ${drw}회 (네이버 검색): ${d.numbers.join(', ')} + ${d.bonus}`);
    } else {
      console.log(`   ${drw}회 못 가져옴 — 스킵`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (newDraws.length === 0) {
    console.log('새 회차 없음. 종료.');
    return;
  }

  const merged = [...existing, ...newDraws].sort((a, b) => a.drwNo - b.drwNo);
  console.log(`4) Gist 업데이트 — 총 ${merged.length}회차 (${newDraws.length}개 추가)`);
  await updateGist(merged);
  console.log('완료!');
}

main().catch(err => {
  console.error('에러:', err.message || err);
  process.exit(1);
});
