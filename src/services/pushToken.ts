import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase';

// Expo 푸시 토큰을 발급받아 Supabase `push_tokens` 테이블에 업서트한다.
// CI(GitHub Actions)가 새 회차 gist 갱신 시 이 토큰들로 푸시를 보낸다.
// 권한/설정 미비 또는 실패 시 앱 동작에 지장 없게 조용히 무시.
export async function registerPushToken(): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;

    const perm = await Notifications.getPermissionsAsync();
    const granted = perm.granted || perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    // SECURITY DEFINER RPC로 등록 — anon은 이 함수만 호출 가능(테이블 직접 접근 X).
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_push_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_token: token, p_platform: Platform.OS }),
    });
  } catch {
    // 토큰 등록 실패는 앱 사용에 영향 없음 — 무시
  }
}
