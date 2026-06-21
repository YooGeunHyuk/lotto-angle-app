import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';

const C = { card: '#F9F9F9', border: '#E5E5E5' };
const IOS_BANNER_ID = 'ca-app-pub-9317493495237163/5686820379';
const ANDROID_BANNER_ID = 'ca-app-pub-9317493495237163/2303462800';
const STORE_SCREENSHOT_MODE = false;

// 광고 로드 실패 시 기기 화면에 에러코드를 직접 표시하는 임시 진단 플래그.
// 안정화 확인 끝나면 false로 바꿔서 다시 빌드.
const AD_DEBUG = true;

// 로드 실패 시 재시도 간격(초). 무한 재시도는 정책 위반/배터리 문제라 3회만.
const RETRY_DELAYS_MS = [4000, 12000, 30000];

export default function AdBanner() {
  if (STORE_SCREENSHOT_MODE) {
    return null;
  }

  // Expo Go에는 네이티브 AdMob 모듈이 없으므로 렌더 자체를 건너뜀.
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  return <AdBannerInner />;
}

function AdBannerInner() {
  // Runtime require keeps Expo Go from loading the native AdMob module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BannerAd, BannerAdSize, TestIds, useForeground } = require('react-native-google-mobile-ads');
  const bannerRef = useRef<{ load: () => void } | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [diag, setDiag] = useState<string | null>(null);

  // (iOS) WKWebView는 앱이 백그라운드(suspended)로 가면 종료될 수 있어,
  // 포그라운드 복귀 시 배너가 빈 채로 남음. 그래서 수동으로 다시 로드.
  useForeground(() => {
    if (Platform.OS === 'ios') {
      retryCount.current = 0;
      bannerRef.current?.load();
    }
  });

  // 안드로이드는 useForeground 미지원 → AppState로 동일 처리.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        retryCount.current = 0;
        bannerRef.current?.load();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const unitId = __DEV__
    ? TestIds.BANNER
    : Platform.OS === 'ios'
      ? IOS_BANNER_ID
      : ANDROID_BANNER_ID;

  return (
    <View style={s.container}>
      <View style={s.slot}>
        <BannerAd
          ref={bannerRef}
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={() => {
            retryCount.current = 0;
            setDiag(null);
          }}
          onAdFailedToLoad={(error: { code?: string | number; message?: string }) => {
            console.warn('[AdBanner] failed to load:', error?.code, error?.message);
            setDiag(`ad err ${error?.code ?? '?'}: ${error?.message ?? ''}`);
            // 빈 응답(no fill) 등 일시적 실패는 백오프로 재시도.
            const i = retryCount.current;
            if (i < RETRY_DELAYS_MS.length) {
              retryCount.current = i + 1;
              if (retryTimer.current) clearTimeout(retryTimer.current);
              retryTimer.current = setTimeout(() => {
                bannerRef.current?.load();
              }, RETRY_DELAYS_MS[i]);
            }
          }}
        />
        {AD_DEBUG && diag ? <Text style={s.diag}>{diag}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 24, paddingHorizontal: 16, alignItems: 'center' },
  slot: {
    width: '100%',
    minHeight: 56,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingVertical: 6,
  },
  diag: {
    fontSize: 10,
    color: '#B0B0B0',
    paddingHorizontal: 8,
    textAlign: 'center',
  },
});
