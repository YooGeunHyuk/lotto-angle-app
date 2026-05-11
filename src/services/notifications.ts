import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { Draw, getRemoteDraws } from '../data/lottoData';

const LAST_NOTIFIED_KEY = '@lotto/lastNotifiedDrwNo';
const BACKGROUND_TASK = 'lotto-new-draw-check';

// 알림이 foreground일 때도 배너로 보이도록 핸들러 등록
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getLastNotified(): Promise<number> {
  const raw = await AsyncStorage.getItem(LAST_NOTIFIED_KEY);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

async function setLastNotified(drwNo: number): Promise<void> {
  await AsyncStorage.setItem(LAST_NOTIFIED_KEY, String(drwNo));
}

async function hasPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.canAskAgain === false) return false;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return result.granted;
}

async function fireNewDrawNotification(latest: Draw): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎯 새 회차 업데이트',
      body: `${latest.drwNo}회차 당첨번호가 업데이트되었습니다.`,
      data: { drwNo: latest.drwNo },
    },
    trigger: null,
  });
}

// 화면에서 받은 합쳐진 draws로 새 회차 확인 후 알림. 첫 실행이면 알림 없이 기준선만 저장.
export async function checkAndNotifyForeground(draws: Draw[]): Promise<void> {
  if (draws.length === 0) return;
  const latest = draws[draws.length - 1];
  const lastNotified = await getLastNotified();
  if (lastNotified === 0) {
    await setLastNotified(latest.drwNo);
    return;
  }
  if (latest.drwNo > lastNotified) {
    if (await hasPermission()) {
      await fireNewDrawNotification(latest);
    }
    await setLastNotified(latest.drwNo);
  }
}

// iOS / Android 백그라운드에서 실행되는 task. 원격 데이터만 가져와 비교.
TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    const remote = await getRemoteDraws();
    if (remote.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;
    const latest = remote[remote.length - 1];
    const lastNotified = await getLastNotified();
    if (lastNotified === 0) {
      await setLastNotified(latest.drwNo);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    if (latest.drwNo > lastNotified) {
      if (await hasPermission()) {
        await fireNewDrawNotification(latest);
      }
      await setLastNotified(latest.drwNo);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundDrawCheck(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
    if (isRegistered) return;

    // Android는 15분 단위 정도까지 가능, iOS는 사실상 OS가 결정.
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
      minimumInterval: Platform.OS === 'android' ? 60 * 30 : 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // 권한 없음 / 이미 등록 등은 조용히 무시
  }
}
