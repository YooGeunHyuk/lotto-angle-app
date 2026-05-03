import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { LuckyStore, LuckyStoreMode, luckyStorePayload, nationalLuckyStores, storeSummary } from '../data/luckyStores';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A' };
const MODES: { label: string; value: LuckyStoreMode }[] = [
  { label: '판매점', value: 'nearbyRetail' },
  { label: '내 주변 명당', value: 'nearbyLucky' },
  { label: '전국 명당', value: 'nationalLucky' },
];
type NationalView = 'rank' | 'regional' | 'recent';
const NATIONAL_VIEWS: { label: string; value: NationalView }[] = [
  { label: '전국 순위', value: 'rank' },
  { label: '지역별 명당', value: 'regional' },
  { label: '최근 회차 판매점', value: 'recent' },
];

function openMap(store: LuckyStore) {
  const query = encodeURIComponent(`${store.name} ${store.address}`);
  Linking.openURL(`https://map.naver.com/p/search/${query}`);
}

function modeTitle(mode: LuckyStoreMode) {
  if (mode === 'nearbyRetail') return '내 주변 로또 판매점 찾기';
  if (mode === 'nearbyLucky') return '내 주변 명당 찾기';
  return '전국 명당';
}

function regionalLuckyStores(stores: LuckyStore[]) {
  const bestByRegion = new Map<string, LuckyStore>();
  stores.forEach(store => {
    const region = store.address.split(/\s+/)[0] || store.region || '기타';
    if (!bestByRegion.has(region)) bestByRegion.set(region, store);
  });
  return Array.from(bestByRegion.values());
}

function StoreCard({ store }: { store: LuckyStore }) {
  return (
    <View style={s.storeCard}>
      <View style={s.storeHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={s.storeMeta}>{store.region} · 최근 {store.lastRound}회 {store.lastRank}등</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{store.totalWins}회</Text>
        </View>
      </View>
      <Text style={s.storeWins}>{storeSummary(store)}</Text>
      <View style={s.addressRow}>
        <Text style={s.storeAddress} numberOfLines={2}>{store.address}</Text>
        <TouchableOpacity style={s.mapLink} onPress={() => openMap(store)} activeOpacity={0.75}>
          <Ionicons name="map-outline" size={14} color={C.black} />
          <Text style={s.mapLinkText}>위치 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LuckyMapContent({ isActive = true }: { isActive?: boolean }) {
  const [mode, setMode] = useState<LuckyStoreMode>('nearbyRetail');
  const [nationalView, setNationalView] = useState<NationalView>('rank');
  const [showMap, setShowMap] = useState(false);
  const nationalStores = useMemo(() => nationalLuckyStores(), []);
  const stores = mode !== 'nationalLucky'
    ? []
    : nationalView === 'regional'
      ? regionalLuckyStores(nationalStores)
      : nationalView === 'recent'
        ? nationalStores.filter(store => store.lastRound === luckyStorePayload.latestRound)
        : nationalStores;
  const showLocationNotice = isActive && mode !== 'nationalLucky';

  const header = (
    <>
      <ScreenHeader title="명당지도" subtitle={`${luckyStorePayload.periodLabel} · ${luckyStorePayload.startRound}~${luckyStorePayload.latestRound}회`} right={<HeaderInfo />} />

      <View style={s.modeRow}>
        {MODES.map(item => (
          <TouchableOpacity key={item.value} style={[s.modeBtn, mode === item.value && s.modeBtnActive]} onPress={() => { setMode(item.value); setShowMap(false); }}>
            <Text style={[s.modeText, mode === item.value && s.modeTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.subControlRow}>
        <View style={s.subTabs}>
          {mode === 'nationalLucky' ? NATIONAL_VIEWS.map(item => (
            <TouchableOpacity key={item.value} style={[s.subTab, nationalView === item.value && s.subTabActive]} onPress={() => setNationalView(item.value)}>
              <Text style={[s.subTabText, nationalView === item.value && s.subTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )) : (
            <>
              <TouchableOpacity style={[s.subTab, mode === 'nearbyRetail' && s.subTabActive]} onPress={() => setMode('nearbyRetail')}>
                <Text style={[s.subTabText, mode === 'nearbyRetail' && s.subTabTextActive]}>내 주변 판매점</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.subTab, mode === 'nearbyLucky' && s.subTabActive]} onPress={() => setMode('nearbyLucky')}>
                <Text style={[s.subTabText, mode === 'nearbyLucky' && s.subTabTextActive]}>내 주변 명당</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        <TouchableOpacity style={[s.mapToggleBtn, showMap && s.mapToggleBtnActive]} onPress={() => setShowMap(prev => !prev)}>
          <Ionicons name={showMap ? 'list-outline' : 'map-outline'} size={14} color={showMap ? '#FFFFFF' : C.black} />
          <Text style={[s.mapToggleText, showMap && s.mapToggleTextActive]}>{showMap ? '리스트' : '지도'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.webMapNotice}>
        <Ionicons name={showLocationNotice ? 'locate-outline' : 'map-outline'} size={28} color={C.dim} />
        <Text style={s.noticeTitle}>{showLocationNotice ? '앱에서는 자동으로 위치 권한을 요청합니다' : showMap ? '앱에서는 이 목록이 지도에 표시됩니다' : '전국에서 1등을 많이 배출한 순서입니다'}</Text>
        <Text style={s.noticeText}>웹 미리보기에서는 리스트와 외부 지도 링크를 먼저 확인할 수 있습니다.</Text>
      </View>

      <View style={s.listHead}>
        <Text style={s.sectionTitle}>{modeTitle(mode)}</Text>
        <Text style={s.dim}>{stores.length}곳</Text>
      </View>
    </>
  );

  return (
    <View style={s.safe}>
      <FlatList
        data={stores}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <StoreCard store={item} />}
        ListHeaderComponent={header}
        ListFooterComponent={<><AdBanner /><View style={{ height: 40 }} /></>}
        ListEmptyComponent={<Text style={s.emptyText}>실기기 앱에서 위치 확인을 누르면 내 주변 목록이 표시됩니다.</Text>}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={8}
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  modeBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  modeBtnActive: { backgroundColor: C.black, borderColor: C.black },
  modeText: { fontSize: 12, fontWeight: '800', color: C.gray, textAlign: 'center' },
  modeTextActive: { color: '#FFFFFF' },
  subControlRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 16, marginTop: 8, padding: 6, borderWidth: 1, borderColor: C.border, backgroundColor: '#FBFBFB', borderRadius: 18 },
  subTabs: { flex: 1, flexDirection: 'row', gap: 6 },
  subTab: { flex: 1, minHeight: 32, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  subTabActive: { backgroundColor: C.black, borderColor: C.black },
  subTabText: { fontSize: 10.5, fontWeight: '800', color: C.gray, textAlign: 'center' },
  subTabTextActive: { color: '#FFFFFF' },
  mapToggleBtn: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10 },
  mapToggleBtnActive: { backgroundColor: C.black, borderColor: C.black },
  mapToggleText: { fontSize: 10.5, fontWeight: '800', color: C.black },
  mapToggleTextActive: { color: '#FFFFFF' },
  webMapNotice: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, minHeight: 150, justifyContent: 'center', alignItems: 'center', padding: 20 },
  noticeTitle: { fontSize: 14, fontWeight: '800', color: C.black, marginTop: 8, textAlign: 'center' },
  noticeText: { fontSize: 11, color: C.gray, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 14, marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  dim: { fontSize: 10, color: C.gray },
  emptyText: { marginHorizontal: 16, marginTop: 8, padding: 16, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.card, fontSize: 12, color: C.gray, textAlign: 'center' },
  storeCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 8 },
  storeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeName: { fontSize: 14, fontWeight: '800', color: C.black },
  storeMeta: { fontSize: 10, color: C.gray, marginTop: 2 },
  scoreBadge: { borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 4 },
  scoreText: { fontSize: 11, fontWeight: '800', color: C.accent },
  storeWins: { fontSize: 12, fontWeight: '700', color: C.black, marginTop: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  storeAddress: { flex: 1, fontSize: 11, color: C.gray, lineHeight: 16 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  mapLinkText: { fontSize: 11, fontWeight: '700', color: C.black },
});
