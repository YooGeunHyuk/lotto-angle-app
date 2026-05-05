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

type MainMode = 'local' | 'national';
type LocalView = Exclude<LuckyStoreMode, 'nationalLucky'>;
type NationalView = 'rank' | 'regional' | 'recent';
type NearbySort = 'distance' | 'wins';

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

const SORT_OPTIONS: { label: string; value: NearbySort }[] = [
  { label: '거리순', value: 'distance' },
  { label: '당첨순', value: 'wins' },
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
  | { type: 'store'; store: DisplayStore }
  | { type: 'region'; region: RegionSummary }
  | { type: 'district'; district: DistrictSummary };

function localModeTitle(mode: LocalView, hasLocation: boolean) {
  if (mode === 'nearbyRetail') return hasLocation ? '내 주변 로또 판매점' : '내 주변 로또 판매점 찾기';
  return hasLocation ? '내 주변 명당' : '내 주변 명당 찾기';
}

function sectionTitle(
  mainMode: MainMode,
  localView: LocalView,
  nationalView: NationalView,
  hasLocation: boolean,
  selectedRegion?: string,
  selectedDistrict?: string,
) {
  if (mainMode === 'local') return localModeTitle(localView, hasLocation);
  if (nationalView === 'regional') {
    if (selectedRegion && selectedDistrict) return `${selectedRegion} ${selectedDistrict} 명당`;
    if (selectedRegion) return `${selectedRegion} 명당`;
    return '지역별 명당';
  }
  if (nationalView === 'recent') return `${luckyStorePayload.latestRound}회 당첨점`;
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

function inferArea(location: StoreLocation) {
  const nearest = luckyStores
    .map(store => ({ store, distance: distanceKm(location, { lat: store.lat, lng: store.lng }) }))
    .sort((a, b) => a.distance - b.distance)[0]?.store;

  const parts = nearest ? addressParts(nearest) : null;
  if (!parts?.region || !parts.district) return null;

  return {
    regionCode: parts.region,
    regionName: REGION_FULL[parts.region] ?? parts.region,
    district: parts.district,
  };
}

function distanceText(store: DisplayStore) {
  return 'distanceKm' in store ? `${store.distanceKm.toFixed(store.distanceKm < 10 ? 1 : 0)}km` : null;
}

function getDistance(store: DisplayStore) {
  return 'distanceKm' in store ? store.distanceKm : 999;
}

function sortStoresByWins<T extends LuckyStore>(stores: T[]) {
  return [...stores].sort((a, b) =>
    b.firstWins - a.firstWins ||
    b.secondWins - a.secondWins ||
    b.totalWins - a.totalWins ||
    b.lastRound - a.lastRound
  );
}

function sortRegions(a: string, b: string) {
  const ai = regionOrder.indexOf(a);
  const bi = regionOrder.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b, 'ko');
}

function summarizeGroup(key: string, stores: LuckyStore[]): RegionSummary {
  const sorted = sortStoresByWins(stores);
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

function buildRegionSummaries(stores: LuckyStore[]) {
  const groups = new Map<string, LuckyStore[]>();
  stores.forEach(store => {
    const { region } = addressParts(store);
    groups.set(region, [...(groups.get(region) ?? []), store]);
  });

  return Array.from(groups.entries())
    .map(([region, groupedStores]) => summarizeGroup(region, groupedStores))
    .sort((a, b) => sortRegions(a.label, b.label));
}

function buildDistrictSummaries(stores: LuckyStore[], region: string) {
  const groups = new Map<string, LuckyStore[]>();
  stores.forEach(store => {
    const parts = addressParts(store);
    if (parts.region !== region) return;
    groups.set(parts.district, [...(groups.get(parts.district) ?? []), store]);
  });

  return Array.from(groups.entries())
    .map(([district, groupedStores]) => ({ ...summarizeGroup(district, groupedStores), region }))
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

function RegionCard({
  item,
  selected,
  onPress,
}: {
  item: RegionSummary;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.storeCard, selected && s.storeCardSelected]} onPress={onPress} activeOpacity={0.82}>
      <View style={s.storeHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeName} numberOfLines={1}>{item.label}</Text>
          <Text style={s.storeMeta}>{item.count}곳 · 대표 {item.topStore.name}</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{item.totalWins}회</Text>
        </View>
      </View>
      <Text style={s.storeWins}>1등 {item.firstWins}회 · 2등 {item.secondWins}회</Text>
      <View style={s.navHintRow}>
        <Text style={s.storeAddress} numberOfLines={1}>{item.label} 시/군/구별 보기</Text>
        <Ionicons name="chevron-forward" size={14} color={C.gray} />
      </View>
    </TouchableOpacity>
  );
}

function DistrictCard({
  item,
  selected,
  onPress,
}: {
  item: DistrictSummary;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.storeCard, selected && s.storeCardSelected]} onPress={onPress} activeOpacity={0.82}>
      <View style={s.storeHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeName} numberOfLines={1}>{item.label}</Text>
          <Text style={s.storeMeta}>{item.region} · {item.count}곳 · 대표 {item.topStore.name}</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{item.totalWins}회</Text>
        </View>
      </View>
      <Text style={s.storeWins}>1등 {item.firstWins}회 · 2등 {item.secondWins}회</Text>
      <View style={s.navHintRow}>
        <Text style={s.storeAddress} numberOfLines={1}>{item.topStore.address}</Text>
        <Ionicons name="chevron-forward" size={14} color={C.gray} />
      </View>
    </TouchableOpacity>
  );
}

function recentRoundStores() {
  return luckyStores
    .filter(store => store.lastRound === luckyStorePayload.latestRound)
    .sort((a, b) => a.lastRank - b.lastRank || b.firstWins - a.firstWins || b.secondWins - a.secondWins);
}

export default function LuckyMapContent({ isActive = true }: { isActive?: boolean }) {
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<LuckyListItem>>(null);
  const [mainMode, setMainMode] = useState<MainMode>('local');
  const [localView, setLocalView] = useState<LocalView>('nearbyRetail');
  const [nationalView, setNationalView] = useState<NationalView>('rank');
  const [nearbySort, setNearbySort] = useState<NearbySort>('distance');
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>();
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>();
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState<StoreLocation | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [locating, setLocating] = useState(false);
  const [retailStores, setRetailStores] = useState<DisplayStore[]>([]);
  const [retailAreaLabel, setRetailAreaLabel] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const nearbyLuckyBase = useMemo(() => location ? nearbyLuckyStores(location, 'all') : [], [location]);
  const nearbyLucky = useMemo(() => {
    const sorted = [...nearbyLuckyBase];
    if (nearbySort === 'distance') {
      return sorted.sort((a, b) => a.distanceKm - b.distanceKm || b.score - a.score || b.totalWins - a.totalWins);
    }
    return sorted.sort((a, b) => b.score - a.score || b.totalWins - a.totalWins || a.distanceKm - b.distanceKm);
  }, [nearbyLuckyBase, nearbySort]);
  const nationalStores = useMemo(() => nationalLuckyStores(), []);
  const recentStores = useMemo(() => recentRoundStores(), []);
  const regionSummaries = useMemo(() => buildRegionSummaries(nationalStores), [nationalStores]);
  const districtSummaries = useMemo(() => selectedRegion ? buildDistrictSummaries(nationalStores, selectedRegion) : [], [nationalStores, selectedRegion]);
  const regionalStoreSelection = useMemo(() => sortStoresByWins(storesInRegion(nationalStores, selectedRegion, selectedDistrict)), [nationalStores, selectedDistrict, selectedRegion]);
  const activeStoreMode: LuckyStoreMode = mainMode === 'national' ? 'nationalLucky' : localView;
  const displayStores: DisplayStore[] = mainMode === 'local'
    ? localView === 'nearbyRetail'
      ? retailStores
      : nearbyLucky
    : nationalView === 'regional'
      ? regionalStoreSelection
      : nationalView === 'recent'
        ? recentStores
        : nationalStores;
  const listItems: LuckyListItem[] = mainMode === 'national' && nationalView === 'regional'
    ? selectedRegion
      ? selectedDistrict
        ? displayStores.map(store => ({ type: 'store', store }))
        : districtSummaries.map(district => ({ type: 'district', district }))
      : regionSummaries.map(region => ({ type: 'region', region }))
    : displayStores.map(store => ({ type: 'store', store }));
  const markerSource: DisplayStore[] = mainMode === 'national' && nationalView === 'regional'
    ? selectedRegion
      ? selectedDistrict
        ? displayStores
        : districtSummaries.map(item => item.topStore)
      : regionSummaries.map(item => item.topStore)
    : displayStores;
  const markerStores = markerSource.slice(0, MARKER_LIMIT);
  const selectedStore = markerSource.find(store => store.id === selectedId) ?? markerStores[0] ?? displayStores[0];
  const title = sectionTitle(mainMode, localView, nationalView, Boolean(location), selectedRegion, selectedDistrict);
  const needsLocation = mainMode === 'local';

  const locateMe = useCallback(async (targetView: LocalView = localView) => {
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

      if (targetView === 'nearbyRetail') {
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
  }, [localView]);

  useEffect(() => {
    if (isActive && needsLocation && !location && !locationRequested && !locating) {
      void locateMe(localView);
    }
  }, [isActive, localView, locateMe, locating, location, locationRequested, needsLocation]);

  function focusStore(store: DisplayStore) {
    setSelectedId(store.id);
    mapRef.current?.animateToRegion({
      latitude: store.lat,
      longitude: store.lng,
      latitudeDelta: 0.035,
      longitudeDelta: 0.035,
    }, 350);
  }

  function resetListPosition() {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function selectMainMode(nextMode: MainMode) {
    setMainMode(nextMode);
    setShowMap(false);
    setSelectedId(undefined);
    resetListPosition();
    if (nextMode === 'local' && !location && !locating) {
      void locateMe(localView);
    }
  }

  function selectLocalView(nextView: LocalView) {
    setLocalView(nextView);
    setShowMap(false);
    setSelectedId(undefined);
    resetListPosition();
    if (!location && !locating) {
      void locateMe(nextView);
    } else if (nextView === 'nearbyRetail' && retailStores.length === 0 && location) {
      void locateMe(nextView);
    }
  }

  function selectNationalView(nextView: NationalView) {
    setNationalView(nextView);
    setShowMap(false);
    setSelectedId(undefined);
    if (nextView !== 'regional') {
      setSelectedRegion(undefined);
      setSelectedDistrict(undefined);
    }
    resetListPosition();
  }

  function selectRegion(region: RegionSummary) {
    setSelectedRegion(region.label);
    setSelectedDistrict(undefined);
    setSelectedId(region.topStore.id);
    resetListPosition();
  }

  function selectDistrict(district: DistrictSummary) {
    setSelectedDistrict(district.label);
    setSelectedId(district.topStore.id);
    resetListPosition();
  }

  function toggleMap() {
    setShowMap(prev => !prev);
    if (needsLocation && !location && !locating) {
      void locateMe(localView);
    }
  }

  function focusMyLocation() {
    if (!location) {
      void locateMe(localView);
      return;
    }
    mapRef.current?.animateToRegion({
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    }, 350);
  }

  function renderListItem({ item }: { item: LuckyListItem }) {
    if (item.type === 'region') {
      return (
        <RegionCard
          item={item.region}
          selected={item.region.topStore.id === selectedStore?.id}
          onPress={() => selectRegion(item.region)}
        />
      );
    }

    if (item.type === 'district') {
      return (
        <DistrictCard
          item={item.district}
          selected={item.district.topStore.id === selectedStore?.id}
          onPress={() => selectDistrict(item.district)}
        />
      );
    }

    return (
      <StoreCard
        store={item.store}
        selected={item.store.id === selectedStore?.id}
        onPress={() => focusStore(item.store)}
      />
    );
  }

  const header = (
    <>
      <ScreenHeader title="명당지도" subtitle={`${luckyStorePayload.periodLabel} · ${luckyStorePayload.startRound}~${luckyStorePayload.latestRound}회`} right={<HeaderInfo />} />

      <View style={s.modeRow}>
        {MAIN_MODES.map(item => (
          <TouchableOpacity key={item.value} style={[s.modeBtn, mainMode === item.value && s.modeBtnActive]} onPress={() => selectMainMode(item.value)}>
            <Text style={[s.modeText, mainMode === item.value && s.modeTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.subControlRow}>
        <View style={s.subTabs}>
          {mainMode === 'national' ? NATIONAL_VIEWS.map(item => (
            <TouchableOpacity key={item.value} style={[s.subTab, nationalView === item.value && s.subTabActive]} onPress={() => selectNationalView(item.value)} activeOpacity={0.78}>
              <Text style={[s.subTabText, nationalView === item.value && s.subTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )) : LOCAL_VIEWS.map(item => (
            <TouchableOpacity key={item.value} style={[s.subTab, localView === item.value && s.subTabActive]} onPress={() => selectLocalView(item.value)} activeOpacity={0.78}>
              <Text style={[s.subTabText, localView === item.value && s.subTabTextActive]}>{item.label}</Text>
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

      {mainMode === 'national' && nationalView === 'regional' && selectedRegion ? (
        <View style={s.pathRow}>
          <TouchableOpacity style={s.pathBtn} onPress={() => { setSelectedRegion(undefined); setSelectedDistrict(undefined); setSelectedId(undefined); }} activeOpacity={0.75}>
            <Text style={s.pathText}>지역별</Text>
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={12} color={C.gray} />
          <TouchableOpacity
            style={s.pathBtn}
            onPress={() => { setSelectedDistrict(undefined); setSelectedId(undefined); }}
            activeOpacity={0.75}
            disabled={!selectedDistrict}
          >
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
        <View style={s.titleLine}>
          <Text style={s.sectionTitle}>{title}</Text>
          {mainMode === 'local' && localView === 'nearbyRetail' && retailAreaLabel ? <Text style={s.areaInline}>{retailAreaLabel}</Text> : null}
          {mainMode === 'local' && localView === 'nearbyLucky' ? (
            <View style={s.sortControl}>
              {SORT_OPTIONS.map(option => (
                <TouchableOpacity key={option.value} style={[s.sortBtn, nearbySort === option.value && s.sortBtnActive]} onPress={() => setNearbySort(option.value)} activeOpacity={0.75}>
                  <Text style={[s.sortText, nearbySort === option.value && s.sortTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        <Text style={s.dim}>{listItems.length}곳</Text>
      </View>
    </>
  );

  return (
    <View style={s.safe}>
      <FlatList
        ref={listRef}
        data={listItems}
        keyExtractor={item => {
          if (item.type === 'region') return `region-${item.region.key}`;
          if (item.type === 'district') return `district-${item.district.region}-${item.district.key}`;
          return item.store.id;
        }}
        renderItem={renderListItem}
        ListHeaderComponent={header}
        ListFooterComponent={<><AdBanner /><View style={{ height: 40 }} /></>}
        ListEmptyComponent={<Text style={s.emptyText}>{needsLocation ? '위치 권한을 허용하면 내 주변 목록이 표시됩니다.' : '표시할 명당이 없습니다.'}</Text>}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        maxToRenderPerBatch={12}
        windowSize={8}
        extraData={`${activeStoreMode}-${nationalView}-${nearbySort}-${selectedId}-${selectedRegion}-${selectedDistrict}`}
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
  mapCard: { height: 300, marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  map: { flex: 1 },
  mapLocateBtn: { position: 'absolute', right: 12, top: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  selectedCard: { marginTop: 12 },
  selectedTitle: { fontSize: 13, fontWeight: '800', color: C.black, marginHorizontal: 16 },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 16, marginTop: 12 },
  pathBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: '#FFFFFF' },
  pathText: { fontSize: 10, fontWeight: '800', color: C.gray },
  pathTextCurrent: { fontSize: 10, fontWeight: '800', color: C.black },
  listHead: { height: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginHorizontal: 16, marginTop: 14, marginBottom: 2 },
  titleLine: { flex: 1, height: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: C.black },
  dim: { fontSize: 10, lineHeight: 18, color: C.gray },
  areaInline: { flexShrink: 1, fontSize: 10, lineHeight: 18, color: C.gray },
  sortControl: { width: 86, height: 18, flexDirection: 'row', borderWidth: 1, borderColor: C.border, borderRadius: 999, overflow: 'hidden', backgroundColor: C.card },
  sortBtn: { width: 42, height: 16, paddingHorizontal: 0, paddingVertical: 0, alignItems: 'center', justifyContent: 'center' },
  sortBtnActive: { backgroundColor: C.black },
  sortText: { fontSize: 9, lineHeight: 10, fontWeight: '800', color: C.gray, textAlign: 'center', includeFontPadding: false },
  sortTextActive: { color: '#FFFFFF' },
  emptyText: { marginHorizontal: 16, marginTop: 8, padding: 16, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.card, fontSize: 12, color: C.gray, textAlign: 'center' },
  storeCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 8 },
  storeCardSelected: { borderColor: C.accent },
  storeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeName: { fontSize: 14, fontWeight: '800', color: C.black },
  storeMeta: { fontSize: 10, color: C.gray, marginTop: 2 },
  scoreBadge: { borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 4 },
  scoreText: { fontSize: 11, fontWeight: '800', color: C.accent },
  storeWins: { fontSize: 12, fontWeight: '700', color: C.black, marginTop: 8 },
  storeAddress: { flex: 1, fontSize: 11, color: C.gray, lineHeight: 16, marginTop: 4 },
  navHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
