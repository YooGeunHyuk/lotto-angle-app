import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { Draw, getRemoteDraws } from '../data/lottoData';
import { getSavedTickets, rankGame, SavedTicket, TicketRank } from '../data/ticketStore';

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

const RANK_ORDER: TicketRank[] = ['1등', '2등', '3등', '4등', '5등'];

// 저장된 내 번호 중 이번 회차 것을 채점해 개인화된 알림 문구를 만든다.
// 내 번호가 없으면 기존처럼 일반 "새 회차" 알림으로 폴백.
function buildDrawNotification(latest: Draw, tickets: SavedTicket[]): { title: string; body: string } {
  const mine = tickets.filter(ticket => ticket.drawNo === latest.drwNo);
  if (mine.length === 0) {
    return {
      title: '🎯 새 회차 업데이트',
      body: `${latest.drwNo}회차 당첨번호가 업데이트되었습니다.`,
    };
  }

  const games = mine.flatMap(ticket => ticket.games.map(game => rankGame(game.numbers, latest)));
  const winning = games.filter(game => game.rank !== '낙첨' && game.rank !== '추첨전');

  if (winning.length > 0) {
    const best = RANK_ORDER.find(rank => winning.some(game => game.rank === rank));
    const extra = winning.length > 1 ? ` (${winning.length}게임 당첨)` : '';
    return {
      title: `🎉 ${latest.drwNo}회 당첨!`,
      body: `내 번호가 ${best}에 당첨됐어요${extra}. 지금 확인해보세요!`,
    };
  }

  const bestMatch = games.reduce((max, game) => Math.max(max, game.matchedNumbers.length), 0);
  const matchText = bestMatch >= 2 ? ` (최고 ${bestMatch}개 일치)` : '';
  return {
    title: `${latest.drwNo}회 결과 발표`,
    body: `이번엔 아쉽게 낙첨이에요${matchText}. 다음 회차도 화이팅! 🍀`,
  };
}

async function fireNewDrawNotification(latest: Draw): Promise<void> {
  const tickets = await getSavedTickets();
  const { title, body } = buildDrawNotification(latest, tickets);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { drwNo: latest.drwNo, screen: 'tickets' },
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
