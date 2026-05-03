import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { distanceKm, LuckyStore, LuckyStoreMode, LuckyStoreWithDistance, luckyStorePayload, luckyStores, nationalLuckyStores, nearbyLuckyStores, StoreLocation, storeSummary } from '../data/luckyStores';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A', green: '#137A4A' };
const KOREA_REGION = { latitude: 36.4203004, longitude: 128.31796, latitudeDelta: 5.2, longitudeDelta: 4.2 };
const MARKER_LIMIT = 650;
const API_BASE = 'https://www.dhlottery.co.kr';

const MODES: { label: string; value: LuckyStoreMode }[] = [
  { label: '판매점', value: 'nearbyRetail' },
  { label: '내 주변 명당', value: 'nearbyLucky' },
  { label: '전국 명당', value: 'nationalLucky' },
];

const LOCAL_VIEWS: { label: string; value: Exclude<LuckyStoreMode, 'nationalLucky'> }[] = [
  { label: '내 주변 판매점', value: 'nearbyRetail' },
  { label: '내 주변 명당', value: 'nearbyLucky' },
];

type NationalView = 'rank' | 'regional' | 'recent';
const NATIONAL_VIEWS: { label: string; value: NationalView }[] = [
  { label: '전국 순위', value: 'rank' },
  { label: '지역별 명당', value: 'regional' },
  { label: '최근 회차 판매점', value: 'recent' },
];

const REGION_FULL: Record<string, string> = {
  강원: '강원도',
  경기: '경기도',
  경남: '경상남도',
  경북: '경상북도',
  광주: '광주광역시',
  대구: '대구광역시',
  대전: '대전광역시',
  부산: '부산광역시',
  서울: '서울특별시',
  세종: '세종특별자치시',
  울산: '울산광역시',
  인천: '인천광역시',
  전남: '전라남도',
  전북: '전라북도',
  제주: '제주특별자치도',
  충남: '충청남도',
  충북: '충청북도',
};

type DisplayStore = (LuckyStore | LuckyStoreWithDistance) & { sellsLotto645?: boolean };

interface RetailApiStore {
  ltShpId: string;
  conmNm: string;
  shpTelno?: string | null;
  tm1BplcLctnAddr?: string;
  tm2BplcLctnAddr?: string;
  bplcRdnmDaddr: string;
  l645LtNtslYn: string;
  shpLat: number;
  shpLot: number;
}

function modeTitle(mode: LuckyStoreMode, hasLocation: boolean) {
  if (mode === 'nearbyRetail') return hasLocation ? '내 주변 로또 판매점' : '내 주변 로또 판매점 찾기';
  if (mode === 'nearbyLucky') return hasLocation ? '내 주변 명당' : '내 주변 명당 찾기';
  return '전국 명당';
}

function sectionTitle(mode: LuckyStoreMode, nationalView: NationalView, hasLocation: boolean) {
  if (mode !== 'nationalLucky') return modeTitle(mode, hasLocation);
  if (nationalView === 'regional') return '지역별 명당';
  if (nationalView === 'recent') return `${luckyStorePayload.latestRound}회 판매점`;
  return '전국 명당 순위';
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeAddress(value: unknown) {
  return normalizeText(value).replace(/\s/g, '');
}

function storeKey(name: unknown, address: unknown) {
  return `${normalizeText(name)}|${normalizeAddress(address)}`;
}

function inferArea(location: StoreLocation) {
  const nearest = luckyStores
    .map(store => ({ store, distance: distanceKm(location, { lat: store.lat, lng: store.lng }) }))
    .sort((a, b) => a.distance - b.distance)[0]?.store;

  const parts = nearest?.address.split(/\s+/).filter(Boolean) ?? [];
  const regionCode = parts[0];
  const second = parts[1];
  const third = parts[2];
  const district = second?.endsWith('시') && third?.endsWith('구') ? `${second} ${third}` : second;

  if (!regionCode || !district) return null;
  return {
    regionCode,
    regionName: REGION_FULL[regionCode] ?? regionCode,
    district,
  };
}

function distanceText(store: DisplayStore) {
  return 'distanceKm' in store ? `${store.distanceKm.toFixed(store.distanceKm < 10 ? 1 : 0)}km` : null;
}

function getDistance(store: DisplayStore) {
  return 'distanceKm' in store ? store.distanceKm : 999;
}

const luckyById = new Map(luckyStores.map(store => [store.id, store]));
const luckyByNameAddress = new Map(luckyStores.map(store => [storeKey(store.name, store.address), store]));
const regionOrder = Object.keys(REGION_FULL);

function mergeRetailStore(item: RetailApiStore, location: StoreLocation): DisplayStore | null {
  const lat = Number(item.shpLat);
  const lng = Number(item.shpLot);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const matched = luckyById.get(String(item.ltShpId)) ?? luckyByNameAddress.get(storeKey(item.conmNm, item.bplcRdnmDaddr));
  const firstWins = matched?.firstWins ?? 0;
  const secondWins = matched?.secondWins ?? 0;

  return {
    id: String(item.ltShpId),
    name: normalizeText(item.conmNm),
    address: normalizeText(item.bplcRdnmDaddr),
    region: [item.tm1BplcLctnAddr, item.tm2BplcLctnAddr].map(normalizeText).filter(Boolean).join(' '),
    phone: normalizeText(item.shpTelno),
    lat,
    lng,
    firstWins,
    secondWins,
    autoWins: matched?.autoWins ?? 0,
    manualWins: matched?.manualWins ?? 0,
    semiAutoWins: matched?.semiAutoWins ?? 0,
    lastRound: matched?.lastRound ?? 0,
    lastRank: matched?.lastRank ?? 0,
    totalWins: firstWins + secondWins,
    score: firstWins * 4 + secondWins,
    distanceKm: distanceKm(location, { lat, lng }),
    sellsLotto645: item.l645LtNtslYn === 'Y',
  };
}

async function fetchRetailStores(location: StoreLocation): Promise<{ stores: DisplayStore[]; label: string }> {
  const area = inferArea(location);
  if (!area) throw new Error('현재 위치의 행정구역을 찾지 못했습니다');

  const stores: DisplayStore[] = [];
  let pageNum = 1;
  let total = 0;

  while (true) {
    const params = new URLSearchParams({
      l645LtNtslYn: 'Y',
      l520LtNtslYn: 'N',
      st5LtNtslYn: 'N',
      st10LtNtslYn: 'N',
      st20LtNtslYn: 'N',
      cpexUsePsbltyYn: 'N',
      pageNum: String(pageNum),
      recordCountPerPage: '10',
      pageCount: '5',
      srchCtpvNm: area.regionCode,
      srchSggNm: area.district,
    });
    const response = await fetch(`${API_BASE}/prchsplcsrch/selectLtShp.do?${params.toString()}`);
    if (!response.ok) throw new Error(`판매점 조회 실패: ${response.status}`);
    const json = await response.json();
    const list: RetailApiStore[] = Array.isArray(json?.data?.list) ? json.data.list : [];
    total = Number(json?.data?.total) || total;

    list.map(item => mergeRetailStore(item, location)).filter(Boolean).forEach(store => {
      stores.push(store as DisplayStore);
    });

    if (list.length === 0 || pageNum * 10 >= total) break;
    pageNum += 1;
  }

  return {
    label: `${area.regionCode} ${area.district}`,
    stores: stores.sort((a, b) => getDistance(a) - getDistance(b)),
  };
}

function StoreCard({
  store,
  selected,
  onPress,
}: {
  store: DisplayStore;
  selected: boolean;
  onPress: () => void;
}) {
  const distance = distanceText(store);
  const meta = store.lastRound > 0
    ? `${store.region} · 최근 ${store.lastRound}회 ${store.lastRank}등${distance ? ` · ${distance}` : ''}`
    : `${store.region || '로또6/45 판매점'}${distance ? ` · ${distance}` : ''}`;

  return (
    <TouchableOpacity style={[s.storeCard, selected && s.storeCardSelected]} onPress={onPress} activeOpacity={0.82}>
      <View style={s.storeHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={s.storeMeta}>{meta}</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{store.totalWins}회</Text>
        </View>
      </View>
      <Text style={s.storeWins}>{storeSummary(store)}</Text>
      <Text style={s.storeAddress} numberOfLines={2}>{store.address}</Text>
    </TouchableOpacity>
  );
}

function regionalLuckyStores() {
  const bestByRegion = new Map<string, LuckyStore>();
  nationalLuckyStores().forEach(store => {
    const region = store.address.split(/\s+/)[0] || store.region || '기타';
    if (!bestByRegion.has(region)) bestByRegion.set(region, store);
  });

  return Array.from(bestByRegion.entries())
    .sort(([a], [b]) => {
      const ai = regionOrder.indexOf(a);
      const bi = regionOrder.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b, 'ko');
    })
    .map(([, store]) => store);
}

function recentRoundStores() {
  return luckyStores
    .filter(store => store.lastRound === luckyStorePayload.latestRound)
    .sort((a, b) => a.lastRank - b.lastRank || b.firstWins - a.firstWins || b.secondWins - a.secondWins);
}

export default function LuckyMapContent({ isActive = true }: { isActive?: boolean }) {
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<DisplayStore>>(null);
  const [mode, setMode] = useState<LuckyStoreMode>('nearbyRetail');
  const [nationalView, setNationalView] = useState<NationalView>('rank');
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState<StoreLocation | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [locating, setLocating] = useState(false);
  const [retailStores, setRetailStores] = useState<DisplayStore[]>([]);
  const [retailAreaLabel, setRetailAreaLabel] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const nearbyLucky = useMemo(() => location ? nearbyLuckyStores(location, 'all') : [], [location]);
  const nationalStores = useMemo(() => nationalLuckyStores(), []);
  const regionalStores = useMemo(() => regionalLuckyStores(), []);
  const recentStores = useMemo(() => recentRoundStores(), []);
  const nationalViewStores = nationalView === 'regional' ? regionalStores : nationalView === 'recent' ? recentStores : nationalStores;
  const stores: DisplayStore[] = mode === 'nearbyRetail'
    ? retailStores
    : mode === 'nearbyLucky'
      ? nearbyLucky
      : nationalViewStores;
  const selectedStore = stores.find(store => store.id === selectedId) ?? stores[0];
  const markerStores = stores.slice(0, MARKER_LIMIT);
  const title = sectionTitle(mode, nationalView, Boolean(location));
  const needsLocation = mode !== 'nationalLucky';

  const locateMe = useCallback(async (targetMode: LuckyStoreMode = mode) => {
    setLocating(true);
    setLocationRequested(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextLocation = { lat: current.coords.latitude, lng: current.coords.longitude };
      setLocation(nextLocation);

      if (targetMode === 'nearbyRetail') {
        try {
          const retail = await fetchRetailStores(nextLocation);
          setRetailStores(retail.stores);
          setRetailAreaLabel(retail.label);
          setSelectedId(retail.stores[0]?.id);
        } catch {
          const fallbackStores = nearbyLuckyStores(nextLocation, 'all', 12);
          setRetailStores(fallbackStores);
          setRetailAreaLabel('당첨 이력 판매점');
          setSelectedId(fallbackStores[0]?.id);
        }
      } else {
        const nextLuckyStores = nearbyLuckyStores(nextLocation, 'all');
        setSelectedId(nextLuckyStores[0]?.id);
      }

      setMode(targetMode);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      mapRef.current?.animateToRegion({
        latitude: nextLocation.lat,
        longitude: nextLocation.lng,
        latitudeDelta: 0.25,
        longitudeDelta: 0.25,
      }, 350);
    } finally {
      setLocating(false);
    }
  }, [mode]);

  useEffect(() => {
    if (isActive && needsLocation && !location && !locationRequested && !locating) {
      void locateMe(mode);
    }
  }, [isActive, locateMe, locating, location, locationRequested, mode, needsLocation]);

  function focusStore(store: DisplayStore) {
    setSelectedId(store.id);
    mapRef.current?.animateToRegion({
      latitude: store.lat,
      longitude: store.lng,
      latitudeDelta: 0.035,
      longitudeDelta: 0.035,
    }, 350);
  }

  function selectMode(nextMode: LuckyStoreMode) {
    setMode(nextMode);
    setShowMap(false);
    setSelectedId(undefined);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    if (nextMode !== 'nationalLucky' && !location && !locating) {
      void locateMe(nextMode);
    }
  }

  function selectNationalView(nextView: NationalView) {
    setNationalView(nextView);
    setShowMap(false);
    setSelectedId(undefined);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function toggleMap() {
    setShowMap(prev => !prev);
    if (needsLocation && !location && !locating) {
      void locateMe(mode);
    }
  }

  function focusMyLocation() {
    if (!location) {
      void locateMe(mode);
      return;
    }
    mapRef.current?.animateToRegion({
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    }, 350);
  }

  function renderStore({ item }: { item: DisplayStore }) {
    return (
      <StoreCard
        store={item}
        selected={item.id === selectedStore?.id}
        onPress={() => focusStore(item)}
      />
    );
  }

  const header = (
    <>
      <ScreenHeader title="명당지도" subtitle={`${luckyStorePayload.periodLabel} · ${luckyStorePayload.startRound}~${luckyStorePayload.latestRound}회`} right={<HeaderInfo />} />

      <View style={s.modeRow}>
        {MODES.map(item => (
          <TouchableOpacity key={item.value} style={[s.modeBtn, mode === item.value && s.modeBtnActive]} onPress={() => selectMode(item.value)}>
            <Text style={[s.modeText, mode === item.value && s.modeTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.subControlRow}>
        <View style={s.subTabs}>
          {mode === 'nationalLucky' ? NATIONAL_VIEWS.map(item => (
            <TouchableOpacity key={item.value} style={[s.subTab, nationalView === item.value && s.subTabActive]} onPress={() => selectNationalView(item.value)} activeOpacity={0.78}>
              <Text style={[s.subTabText, nationalView === item.value && s.subTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )) : LOCAL_VIEWS.map(item => (
            <TouchableOpacity key={item.value} style={[s.subTab, mode === item.value && s.subTabActive]} onPress={() => selectMode(item.value)} activeOpacity={0.78}>
              <Text style={[s.subTabText, mode === item.value && s.subTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[s.mapToggleBtn, showMap && s.mapToggleBtnActive]} onPress={toggleMap} activeOpacity={0.78}>
          <Ionicons name={showMap ? 'list-outline' : 'map-outline'} size={14} color={showMap ? '#FFFFFF' : C.black} />
          <Text style={[s.mapToggleText, showMap && s.mapToggleTextActive]}>{showMap ? '리스트' : '지도'}</Text>
        </TouchableOpacity>
      </View>

      {showMap && (
        <>
          <View style={s.mapCard}>
            <MapView
              ref={mapRef}
              style={s.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={KOREA_REGION}
              showsUserLocation={Boolean(location)}
              showsMyLocationButton={false}
              showsCompass
            >
              {markerStores.map(store => (
                <Marker
                  key={store.id}
                  coordinate={{ latitude: store.lat, longitude: store.lng }}
                  title={store.name}
                  description={storeSummary(store)}
                  pinColor={store.firstWins > 0 ? C.accent : store.secondWins > 0 ? C.green : C.gray}
                  onPress={() => setSelectedId(store.id)}
                />
              ))}
            </MapView>
            <TouchableOpacity style={s.mapLocateBtn} onPress={focusMyLocation} activeOpacity={0.82}>
              <Ionicons name="locate" size={18} color={C.black} />
            </TouchableOpacity>
          </View>

          {selectedStore && (
            <View style={s.selectedCard}>
              <Text style={s.selectedTitle}>선택한 판매점</Text>
              <StoreCard store={selectedStore} selected onPress={() => focusStore(selectedStore)} />
            </View>
          )}
        </>
      )}

      <View style={s.listHead}>
        <View>
          <Text style={s.sectionTitle}>{title}</Text>
          {mode === 'nearbyRetail' && retailAreaLabel ? <Text style={s.subDim}>{retailAreaLabel}</Text> : null}
        </View>
        <Text style={s.dim}>{stores.length}곳</Text>
      </View>
    </>
  );

  return (
    <View style={s.safe}>
      <FlatList
        ref={listRef}
        data={stores}
        keyExtractor={item => item.id}
        renderItem={renderStore}
        ListHeaderComponent={header}
        ListFooterComponent={<><AdBanner /><View style={{ height: 40 }} /></>}
        ListEmptyComponent={<Text style={s.emptyText}>{needsLocation ? '위치 권한을 허용하면 내 주변 목록이 표시됩니다.' : '표시할 명당이 없습니다.'}</Text>}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        maxToRenderPerBatch={12}
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
  mapCard: { height: 300, marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  map: { flex: 1 },
  mapLocateBtn: { position: 'absolute', right: 12, top: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  selectedCard: { marginTop: 12 },
  selectedTitle: { fontSize: 13, fontWeight: '800', color: C.black, marginHorizontal: 16 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 14, marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  dim: { fontSize: 10, color: C.gray },
  subDim: { fontSize: 10, color: C.gray, marginTop: 2 },
  emptyText: { marginHorizontal: 16, marginTop: 8, padding: 16, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.card, fontSize: 12, color: C.gray, textAlign: 'center' },
  storeCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 8 },
  storeCardSelected: { borderColor: C.accent },
  storeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeName: { fontSize: 14, fontWeight: '800', color: C.black },
  storeMeta: { fontSize: 10, color: C.gray, marginTop: 2 },
  scoreBadge: { borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 4 },
  scoreText: { fontSize: 11, fontWeight: '800', color: C.accent },
  storeWins: { fontSize: 12, fontWeight: '700', color: C.black, marginTop: 8 },
  storeAddress: { fontSize: 11, color: C.gray, lineHeight: 16, marginTop: 4 },
});
