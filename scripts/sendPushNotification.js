// 새 회차 gist 갱신 후 호출. Supabase의 push_tokens를 읽어 Expo Push로
// "새 회차 업데이트" 알림을 전 기기에 발송한다.
// 환경변수: SUPABASE_URL, SUPABASE_SERVICE_KEY, LATEST_DRAW(선택)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const LATEST_DRAW = (process.env.LATEST_DRAW || '').trim();

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('Supabase 환경변수 없음 — 푸시 건너뜀');
    return;
  }

  // 1) 토큰 조회
  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?select=token`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    console.error('토큰 조회 실패:', res.status, await res.text());
    return;
  }
  const rows = await res.json();
  const tokens = [...new Set(rows.map(r => r.token).filter(Boolean))];
  console.log(`토큰 ${tokens.length}개`);
  if (tokens.length === 0) return;

  // 2) Expo Push 발송 (100개씩 청크)
  const title = '🎯 새 회차 업데이트';
  const body = LATEST_DRAW
    ? `${LATEST_DRAW}회차 당첨번호가 업데이트되었습니다.`
    : '새 회차 당첨번호가 업데이트되었습니다.';

  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const messages = chunk.map(to => ({
      to,
      title,
      body,
      sound: 'default',
      data: { screen: 'tickets' },
    }));
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (r.ok) sent += chunk.length;
    else console.error('청크 발송 실패:', r.status, await r.text());
  }
  console.log(`발송 완료: ${sent}/${tokens.length}`);
}

main().catch(err => {
  console.error('푸시 발송 에러:', err.message || err);
  // 푸시 실패가 워크플로 전체를 죽이지 않도록 정상 종료
});
