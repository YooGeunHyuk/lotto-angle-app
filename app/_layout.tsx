import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { loadLuckyStores } from '@/src/data/luckyStores';
import { ensureNotificationPermission, registerBackgroundDrawCheck, scheduleDrawReminder } from '@/src/services/notifications';
import { registerPushToken } from '@/src/services/pushToken';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Jua: require('../assets/fonts/Jua-Regular.ttf'),
  });

  useEffect(() => {
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
