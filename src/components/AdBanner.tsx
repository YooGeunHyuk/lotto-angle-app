import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const C = { card: '#F9F9F9', border: '#E5E5E5' };
const IOS_BANNER_ID = 'ca-app-pub-5697680589501542/9546128236';
const ANDROID_BANNER_ID = 'ca-app-pub-5697680589501542/4373173083';

export default function AdBanner() {
  const unitId = __DEV__
    ? TestIds.BANNER
    : Platform.OS === 'ios'
      ? IOS_BANNER_ID
      : ANDROID_BANNER_ID;

  return (
    <View style={s.container}>
      <View style={s.slot}>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 24, paddingHorizontal: 16, alignItems: 'center' },
  slot: {
    width: '100%',
    minHeight: 120,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
