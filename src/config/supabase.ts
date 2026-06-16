// Supabase 설정.
// anon key는 클라이언트 공개용(RLS로 보호) + 이 repo는 private라 노출 위험 없음.
// 아래 두 값을 Supabase 프로젝트 값으로 채우면 푸시 토큰 등록이 활성화된다.
// 미설정(placeholder) 상태면 푸시 등록은 조용히 건너뛴다.
export const SUPABASE_URL = 'https://dldepqnvccnwqslmydos.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZGVwcW52Y2Nud3FzbG15ZG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDY5NTcsImV4cCI6MjA5NzE4Mjk1N30.ZUZ1Md8NDU79qXqhd4RIUt-EQrRj73z4AVcvXmDmnRc';

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('YOUR_PROJECT') &&
    SUPABASE_ANON_KEY.length > 0 &&
    !SUPABASE_ANON_KEY.startsWith('YOUR_');
}
