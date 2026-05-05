import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { LuckyStore, luckyStorePayload, nationalLuckyStores, storeSummary } from '../data/luckyStores';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A' };

type MainMode = 'local' | 'national';
type LocalView = 'nearbyRetail' | 'nearbyLucky';
type NationalView = 'rank' | 'regional' | 'recent';

const MAIN_MODES: { label: string; value: MainMode }[] = [
  { label: '판매점', value: 'local' },
  { label: '전국 명당', value: 'national' },
];

const LOCAL_VIEWS: { label: string; value: LocalView }[] = [
  { label: '내 주변 판매점', value: 'nearbyRetail' },
  { label: '내 주변 명당', value: 'nearbyLucky' },
];

const NATIONAL_VIEWS: { label: string; value: NationalView }[] = [
  { label: '전국 순위', value: 'rank' },
  { label: '지역별 명당', value: 'regional' },
  { label: '최근 회차 당첨점', value: 'recent' },
];

const REGION_ORDER = ['서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종', '전북', '전남', '광주', '경북', '경남', '대구', '울산', '부산', '제주'];

interface RegionSummary {
  key: string;
  label: string;
  count: number;
  firstWins: number;
  secondWins: number;
  totalWins: number;
  topStore: LuckyStore;
}

interface DistrictSummary extends RegionSummary {
  region: string;
}

type LuckyListItem =
  | { type: 'store'; store: LuckyStore }
  | { type: 'region'; region: RegionSummary }
  | { type: 'district'; district: DistrictSummary };

function openMap(store: LuckyStore) {
  const query = encodeURIComponent(`${store.name} ${store.address}`);
  Linking.openURL(`https://map.naver.com/p/search/${query}`);
}

function addressParts(store: Pick<LuckyStore, 'address' | 'region'>) {
  const parts = store.address.split(/\s+/).filter(Boolean);
  const region = parts[0] || store.region || '기타';
  const second = parts[1];
  const third = parts[2];
  let district = second || '기타';

  if (second?.endsWith('시') && (third?.endsWith('구') || third?.endsWith('군'))) {
    district = `${second} ${third}`;
  }

  return { region, district };
}

function sortStores(stores: LuckyStore[]) {
  return [...stores].sort((a, b) =>
    b.firstWins - a.firstWins ||
    b.secondWins - a.secondWins ||
    b.totalWins - a.totalWins ||
    b.lastRound - a.lastRound
  );
}

function regionSort(a: string, b: string) {
  const ai = REGION_ORDER.indexOf(a);
  const bi = REGION_ORDER.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b, 'ko');
}

function summarize(key: string, stores: LuckyStore[]): RegionSummary {
  const sorted = sortStores(stores);
  const firstWins = stores.reduce((sum, store) => sum + store.firstWins, 0);
  const secondWins = stores.reduce((sum, store) => sum + store.secondWins, 0);

  return {
    key,
    label: key,
    count: stores.length,
    firstWins,
    secondWins,
    totalWins: firstWins + secondWins,
    topStore: sorted[0],
  };
}

function buildRegions(stores: LuckyStore[]) {
  const groups = new Map<string, LuckyStore[]>();
  stores.forEach(store => {
    const { region } = addressParts(store);
    groups.set(region, [...(groups.get(region) ?? []), store]);
  });

  return Array.from(groups.entries())
    .map(([region, groupedStores]) => summarize(region, groupedStores))
    .sort((a, b) => regionSort(a.label, b.label));
}

function buildDistricts(stores: LuckyStore[], region: string) {
  const groups = new Map<string, LuckyStore[]>();
  stores.forEach(store => {
    const parts = addressParts(store);
    if (parts.region !== region) return;
    groups.set(parts.district, [...(groups.get(parts.district) ?? []), store]);
  });

  return Array.from(groups.entries())
    .map(([district, groupedStores]) => ({ ...summarize(district, groupedStores), region }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ko'));
}

function storesInRegion(stores: LuckyStore[], region?: string, district?: string) {
  if (!region) return stores;
  return stores.filter(store => {
    const parts = addressParts(store);
    if (parts.region !== region) return false;
    return district ? parts.district === district : true;
  });
}

function sectionTitle(mainMode: MainMode, localView: LocalView, nationalView: NationalView, selectedRegion?: string, selectedDistrict?: string) {
  if (mainMode === 'local') return localView === 'nearbyRetail' ? '내 주변 로또 판매점 찾기' : '내 주변 명당 찾기';
  if (nationalView === 'regional') {
    if (selectedRegion && selectedDistrict) return `${selectedRegion} ${selectedDistrict} 명당`;
    if (selectedRegion) return `${selectedRegion} 명당`;
    return '지역별 명당';
  }
  if (nationalView === 'recent') return `${luckyStorePayload.latestRound}회 당첨점`;
  return '전국 명당 순위';
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

function RegionCard({ item, onPress }: { item: RegionSummary; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.storeCard} onPress={onPress} activeOpacity={0.82}>
      <View style={s.storeHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeName}>{item.label}</Text>
          <Text style={s.storeMeta}>{item.count}곳 · 대표 {item.topStore.name}</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{item.totalWins}회</Text>
        </View>
      </View>
      <Text style={s.storeWins}>1등 {item.firstWins}회 · 2등 {item.secondWins}회</Text>
      <View style={s.navHintRow}>
        <Text style={s.storeAddress}>{item.label} 시/군/구별 보기</Text>
        <Ionicons name="chevron-forward" size={14} color={C.gray} />
      </View>
    </TouchableOpacity>
  );
}

function DistrictCard({ item, onPress }: { item: DistrictSummary; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.storeCard} onPress={onPress} activeOpacity={0.82}>
      <View style={s.storeHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeName}>{item.label}</Text>
          <Text style={s.storeMeta}>{item.region} · {item.count}곳 · 대표 {item.topStore.name}</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{item.totalWins}회</Text>
        </View>
      </View>
      <Text style={s.storeWins}>1등 {item.firstWins}회 · 2등 {item.secondWins}회</Text>
      <View style={s.navHintRow}>
        <Text style={s.storeAddress}>{item.topStore.address}</Text>
        <Ionicons name="chevron-forward" size={14} color={C.gray} />
      </View>
    </TouchableOpacity>
  );
}

export default function LuckyMapContent({ isActive = true }: { isActive?: boolean }) {
  const [mainMode, setMainMode] = useState<MainMode>('local');
  const [localView, setLocalView] = useState<LocalView>('nearbyRetail');
  const [nationalView, setNationalView] = useState<NationalView>('rank');
  const [showMap, setShowMap] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>();
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>();
  const nationalStores = useMemo(() => nationalLuckyStores(), []);
  const regionSummaries = useMemo(() => buildRegions(nationalStores), [nationalStores]);
  const districtSummaries = useMemo(() => selectedRegion ? buildDistricts(nationalStores, selectedRegion) : [], [nationalStores, selectedRegion]);
  const regionalStores = useMemo(() => sortStores(storesInRegion(nationalStores, selectedRegion, selectedDistrict)), [nationalStores, selectedDistrict, selectedRegion]);
  const stores = mainMode !== 'national'
    ? []
    : nationalView === 'regional'
      ? regionalStores
      : nationalView === 'recent'
        ? nationalStores.filter(store => store.lastRound === luckyStorePayload.latestRound)
        : nationalStores;
  const listItems: LuckyListItem[] = mainMode === 'national' && nationalView === 'regional'
    ? selectedRegion
      ? selectedDistrict
        ? stores.map(store => ({ type: 'store', store }))
        : districtSummaries.map(district => ({ type: 'district', district }))
      : regionSummaries.map(region => ({ type: 'region', region }))
    : stores.map(store => ({ type: 'store', store }));
  const showLocationNotice = isActive && mainMode === 'local';
  const title = sectionTitle(mainMode, localView, nationalView, selectedRegion, selectedDistrict);

  function renderItem({ item }: { item: LuckyListItem }) {
    if (item.type === 'region') return <RegionCard item={item.region} onPress={() => { setSelectedRegion(item.region.label); setSelectedDistrict(undefined); }} />;
    if (item.type === 'district') return <DistrictCard item={item.district} onPress={() => setSelectedDistrict(item.district.label)} />;
    return <StoreCard store={item.store} />;
  }

  const header = (
    <>
      <ScreenHeader title="명당지도" subtitle={`${luckyStorePayload.periodLabel} · ${luckyStorePayload.startRound}~${luckyStorePayload.latestRound}회`} right={<HeaderInfo />} />

      <View style={s.modeRow}>
        {MAIN_MODES.map(item => (
          <TouchableOpacity key={item.value} style={[s.modeBtn, mainMode === item.value && s.modeBtnActive]} onPress={() => { setMainMode(item.value); setShowMap(false); }}>
            <Text style={[s.modeText, mainMode === item.value && s.modeTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.subControlRow}>
        <View style={s.subTabs}>
          {mainMode === 'national' ? NATIONAL_VIEWS.map(item => (
            <TouchableOpacity key={item.value} style={[s.subTab, nationalView === item.value && s.subTabActive]} onPress={() => { setNationalView(item.value); setShowMap(false); if (item.value !== 'regional') { setSelectedRegion(undefined); setSelectedDistrict(undefined); } }}>
              <Text style={[s.subTabText, nationalView === item.value && s.subTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )) : LOCAL_VIEWS.map(item => (
            <TouchableOpacity key={item.value} style={[s.subTab, localView === item.value && s.subTabActive]} onPress={() => setLocalView(item.value)}>
              <Text style={[s.subTabText, localView === item.value && s.subTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[s.mapToggleBtn, showMap && s.mapToggleBtnActive]} onPress={() => setShowMap(prev => !prev)}>
          <Ionicons name={showMap ? 'list-outline' : 'map-outline'} size={14} color={showMap ? '#FFFFFF' : C.black} />
          <Text style={[s.mapToggleText, showMap && s.mapToggleTextActive]}>{showMap ? '리스트' : '지도'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.webMapNotice}>
        <Ionicons name={showLocationNotice ? 'locate-outline' : 'map-outline'} size={28} color={C.dim} />
        <Text style={s.noticeTitle}>{showLocationNotice ? '앱에서는 자동으로 위치 권한을 요청합니다' : showMap ? '앱에서는 이 목록이 지도에 표시됩니다' : '전국 명당 목록을 확인할 수 있습니다'}</Text>
        <Text style={s.noticeText}>웹 미리보기에서는 리스트와 외부 지도 링크를 먼저 확인할 수 있습니다.</Text>
      </View>

      {mainMode === 'national' && nationalView === 'regional' && selectedRegion ? (
        <View style={s.pathRow}>
          <TouchableOpacity style={s.pathBtn} onPress={() => { setSelectedRegion(undefined); setSelectedDistrict(undefined); }} activeOpacity={0.75}>
            <Text style={s.pathText}>지역별</Text>
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={12} color={C.gray} />
          <TouchableOpacity style={s.pathBtn} onPress={() => setSelectedDistrict(undefined)} activeOpacity={0.75} disabled={!selectedDistrict}>
            <Text style={[s.pathText, !selectedDistrict && s.pathTextCurrent]}>{selectedRegion}</Text>
          </TouchableOpacity>
          {selectedDistrict ? (
            <>
              <Ionicons name="chevron-forward" size={12} color={C.gray} />
              <Text style={s.pathTextCurrent}>{selectedDistrict}</Text>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={s.listHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        <Text style={s.dim}>{listItems.length}곳</Text>
      </View>
    </>
  );

  return (
    <View style={s.safe}>
      <FlatList
        data={listItems}
        keyExtractor={item => {
          if (item.type === 'region') return `region-${item.region.key}`;
          if (item.type === 'district') return `district-${item.district.region}-${item.district.key}`;
          return item.store.id;
        }}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={<><AdBanner /><View style={{ height: 40 }} /></>}
        ListEmptyComponent={<Text style={s.emptyText}>실기기 앱에서 위치 권한을 허용하면 내 주변 목록이 표시됩니다.</Text>}
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
  modeRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 10 },
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
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 16, marginTop: 12 },
  pathBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: '#FFFFFF' },
  pathText: { fontSize: 10, fontWeight: '800', color: C.gray },
  pathTextCurrent: { fontSize: 10, fontWeight: '800', color: C.black },
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
  storeAddress: { flex: 1, fontSize: 11, color: C.gray, lineHeight: 16, marginTop: 4 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  mapLinkText: { fontSize: 11, fontWeight: '700', color: C.black },
  navHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
