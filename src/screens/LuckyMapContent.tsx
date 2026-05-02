import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { filterLuckyStores, LuckyStore, luckyStorePayload, StoreRankFilter, storeSummary } from '../data/luckyStores';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A' };
type ViewMode = 'nearby' | 'national';
const MODES: { label: string; value: ViewMode }[] = [
  { label: '내 위치', value: 'nearby' },
  { label: '전국', value: 'national' },
];
const FILTERS: { label: string; value: StoreRankFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '1등', value: 'first' },
  { label: '2등', value: 'second' },
];

function openMap(store: LuckyStore) {
  const query = encodeURIComponent(`${store.name} ${store.address}`);
  Linking.openURL(`https://map.naver.com/p/search/${query}`);
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
      <Text style={s.storeAddress} numberOfLines={2}>{store.address}</Text>
      <TouchableOpacity style={s.mapLink} onPress={() => openMap(store)} activeOpacity={0.75}>
        <Ionicons name="navigate-outline" size={14} color={C.black} />
        <Text style={s.mapLinkText}>지도에서 보기</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function LuckyMapContent() {
  const [mode, setMode] = useState<ViewMode>('nearby');
  const [filter, setFilter] = useState<StoreRankFilter>('all');
  const stores = useMemo(() => filterLuckyStores(filter), [filter]);
  const listTitle = mode === 'nearby' ? '전국 명당' : '전국 명당';

  return (
    <View style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <ScreenHeader title="명당지도" subtitle={`${luckyStorePayload.periodLabel} · ${luckyStorePayload.startRound}~${luckyStorePayload.latestRound}회`} right={<HeaderInfo />} />

        <View style={s.modeRow}>
          {MODES.map(item => (
            <TouchableOpacity key={item.value} style={[s.modeBtn, mode === item.value && s.modeBtnActive]} onPress={() => setMode(item.value)}>
              <Text style={[s.modeText, mode === item.value && s.modeTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.filterRow}>
          {FILTERS.map(item => (
            <TouchableOpacity key={item.value} style={[s.filterBtn, filter === item.value && s.filterBtnActive]} onPress={() => setFilter(item.value)}>
              <Text style={[s.filterText, filter === item.value && s.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.webMapNotice}>
          <Ionicons name="map-outline" size={28} color={C.dim} />
          <Text style={s.noticeTitle}>{mode === 'nearby' ? '앱에서는 내 위치 기준으로 표시됩니다' : '앱에서는 전국 지도로 표시됩니다'}</Text>
          <Text style={s.noticeText}>웹 미리보기에서는 명당 리스트와 외부 지도 링크로 확인할 수 있습니다.</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.sectionTitle}>{listTitle} TOP {Math.min(stores.length, 40)}</Text>
            <Text style={s.dim}>{stores.length}곳</Text>
          </View>
          {stores.slice(0, 40).map(store => <StoreCard key={store.id} store={store} />)}
        </View>

        <AdBanner />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  modeBtn: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modeBtnActive: { backgroundColor: C.black, borderColor: C.black },
  modeText: { fontSize: 13, fontWeight: '800', color: C.gray },
  modeTextActive: { color: '#FFFFFF' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 8 },
  filterBtn: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  filterBtnActive: { backgroundColor: C.black, borderColor: C.black },
  filterText: { fontSize: 12, fontWeight: '700', color: C.gray },
  filterTextActive: { color: '#FFFFFF' },
  webMapNotice: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, minHeight: 160, justifyContent: 'center', alignItems: 'center', padding: 20 },
  noticeTitle: { fontSize: 14, fontWeight: '800', color: C.black, marginTop: 8 },
  noticeText: { fontSize: 11, color: C.gray, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  dim: { fontSize: 10, color: C.gray },
  storeCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginTop: 8 },
  storeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeName: { fontSize: 14, fontWeight: '800', color: C.black },
  storeMeta: { fontSize: 10, color: C.gray, marginTop: 2 },
  scoreBadge: { borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 4 },
  scoreText: { fontSize: 11, fontWeight: '800', color: C.accent },
  storeWins: { fontSize: 12, fontWeight: '700', color: C.black, marginTop: 8 },
  storeAddress: { fontSize: 11, color: C.gray, lineHeight: 16, marginTop: 4 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  mapLinkText: { fontSize: 11, fontWeight: '700', color: C.black },
});
