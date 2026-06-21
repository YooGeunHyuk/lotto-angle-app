import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import 'react-native-reanimated';
import { loadLuckyStores } from '@/src/data/luckyStores';
import { ensureNotificationPermission, registerBackgroundDrawCheck, scheduleDrawReminder } from '@/src/services/notifications';
import { registerPushToken } from '@/src/services/pushToken';

// 시스템 글씨 크기(접근성 큰 글꼴)에 레이아웃이 깨지지 않게 폰트 스케일 고정.
type ScalableDefaults = { defaultProps?: { allowFontScaling?: boolean } };
const TextWithDefaults = RNText as unknown as ScalableDefaults;
TextWithDefaults.defaultProps = { ...(TextWithDefaults.defaultProps || {}), allowFontScaling: false };
const TextInputWithDefaults = RNTextInput as unknown as ScalableDefaults;
TextInputWithDefaults.defaultProps = { ...(TextInputWithDefaults.defaultProps || {}), allowFontScaling: false };

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Jua: require('../assets/fonts/Jua-Regular.ttf'),
  });

  useEffect(() => {
    // Google Mobile Ads SDK는 광고 로드 전 앱 시작 시 1회 초기화해야 함 (v16+ 필수).
    // Expo Go에는 네이티브 모듈이 없으므로 런타임 require로 가드.
    if (Constants.appOwnership !== 'expo') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mobileAds = require('react-native-google-mobile-ads').default;
        mobileAds().initialize().catch(() => {});
      } catch {
        // 네이티브 모듈 없음(Expo Go 등) — 무시.
      }
    }

    (async () => {
      await ensureNotificationPermission();
      await registerBackgroundDrawCheck();
      await scheduleDrawReminder();
      registerPushToken().catch(() => {});
      loadLuckyStores().catch(() => {});
    })();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
    </ThemeProvider>
  );
}
