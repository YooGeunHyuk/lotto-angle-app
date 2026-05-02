import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { filterLuckyStores, LuckyStore, LuckyStoreWithDistance, luckyStorePayload, nearbyLuckyStores, StoreLocation, StoreRankFilter, storeSummary } from '../data/luckyStores';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A', green: '#137A4A' };
const KOREA_REGION = { latitude: 36.4203004, longitude: 128.31796, latitudeDelta: 5.2, longitudeDelta: 4.2 };

const FILTERS: { label: string; value: StoreRankFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '1등', value: 'first' },
  { label: '2등', value: 'second' },
];
const MODES: { label: string; value: ViewMode }[] = [
  { label: '내 위치', value: 'nearby' },
  { label: '전국', value: 'national' },
];
type ViewMode = 'nearby' | 'national';

function openMap(store: LuckyStore) {
  const query = encodeURIComponent(`${store.name} ${store.address}`);
  Linking.openURL(`https://map.naver.com/p/search/${query}`);
}

function StoreCard({ store, selected, onPress }: { store: LuckyStore | LuckyStoreWithDistance; selected: boolean; onPress: () => void }) {
  const distanceText = 'distanceKm' in store ? `${store.distanceKm.toFixed(store.distanceKm < 10 ? 1 : 0)}km` : null;

  return (
    <TouchableOpacity style={[s.storeCard, selected && s.storeCardSelected]} onPress={onPress} activeOpacity={0.82}>
      <View style={s.storeHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={s.storeMeta}>{store.region} · 최근 {store.lastRound}회 {store.lastRank}등{distanceText ? ` · ${distanceText}` : ''}</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{store.totalWins}회</Text>
        </View>
      </View>
      <Text style={s.storeWins}>{storeSummary(store)}</Text>
      <Text style={s.storeAddress} numberOfLines={2}>{store.address}</Text>
      <TouchableOpacity style={s.mapLink} onPress={() => openMap(store)} activeOpacity={0.75}>
        <Ionicons name="navigate-outline" size={14} color={C.black} />
        <Text style={s.mapLinkText}>길찾기</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function LuckyMapContent() {
  const mapRef = useRef<MapView>(null);
  const [mode, setMode] = useState<ViewMode>('nearby');
  const [filter, setFilter] = useState<StoreRankFilter>('all');
  const [location, setLocation] = useState<StoreLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState('내 주변 명당을 보려면 위치를 확인해주세요');
  const [locating, setLocating] = useState(false);
  const nationalStores = useMemo(() => filterLuckyStores(filter), [filter]);
  const nearbyStores = useMemo(() => location ? nearbyLuckyStores(location, filter) : [], [location, filter]);
  const stores = mode === 'nearby' && location ? nearbyStores : nationalStores;
  const [selectedId, setSelectedId] = useState(stores[0]?.id);
  const selectedStore = stores.find(store => store.id === selectedId) ?? stores[0];
  const markerStores = stores.slice(0, 120);
  const listTitle = mode === 'nearby' && location ? '내 주변 명당' : '전국 명당';

  async function locateMe() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationMessage('위치 권한을 허용하면 내 주변 명당을 볼 수 있습니다');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextLocation = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      };
      setLocation(nextLocation);
      setMode('nearby');
      setLocationMessage('가까운 명당 중 당첨 횟수가 많은 곳을 우선 표시합니다');
      const nextStores = nearbyLuckyStores(nextLocation, filter);
      setSelectedId(nextStores[0]?.id);
      mapRef.current?.animateToRegion({
        latitude: nextLocation.lat,
        longitude: nextLocation.lng,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35,
      }, 350);
    } finally {
      setLocating(false);
    }
  }

  function focusStore(store: LuckyStore) {
    setSelectedId(store.id);
    mapRef.current?.animateToRegion({
      latitude: store.lat,
      longitude: store.lng,
      latitudeDelta: 0.035,
      longitudeDelta: 0.035,
    }, 350);
  }

  return (
    <View style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <ScreenHeader title="명당지도" subtitle={`${luckyStorePayload.periodLabel} · ${luckyStorePayload.startRound}~${luckyStorePayload.latestRound}회`} right={<HeaderInfo />} />

        <View style={s.modeRow}>
          {MODES.map(item => (
            <TouchableOpacity key={item.value} style={[s.modeBtn, mode === item.value && s.modeBtnActive]} onPress={() => { setMode(item.value); setSelectedId((item.value === 'nearby' && location ? nearbyStores : nationalStores)[0]?.id); }}>
              <Text style={[s.modeText, mode === item.value && s.modeTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.filterRow}>
          {FILTERS.map(item => (
            <TouchableOpacity key={item.value} style={[s.filterBtn, filter === item.value && s.filterBtnActive]} onPress={() => { setFilter(item.value); setSelectedId(filterLuckyStores(item.value)[0]?.id); }}>
              <Text style={[s.filterText, filter === item.value && s.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'nearby' && (
          <View style={s.locationCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.locationTitle}>내 위치 기준</Text>
              <Text style={s.locationText}>{locationMessage}</Text>
            </View>
            <TouchableOpacity style={s.locationBtn} onPress={locateMe} disabled={locating} activeOpacity={0.75}>
              <Ionicons name="locate-outline" size={15} color="#FFFFFF" />
              <Text style={s.locationBtnText}>{locating ? '확인 중' : '위치 확인'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.mapCard}>
          <MapView
            ref={mapRef}
            style={s.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={KOREA_REGION}
            showsUserLocation={Boolean(location)}
            showsCompass
          >
            {location && (
              <Marker
                coordinate={{ latitude: location.lat, longitude: location.lng }}
                title="내 위치"
                pinColor={C.black}
              />
            )}
            {markerStores.map(store => (
              <Marker
                key={store.id}
                coordinate={{ latitude: store.lat, longitude: store.lng }}
                title={store.name}
                description={storeSummary(store)}
                pinColor={store.firstWins > 0 ? C.accent : C.green}
                onPress={() => setSelectedId(store.id)}
              />
            ))}
          </MapView>
        </View>

        {selectedStore && (
          <View style={s.selectedCard}>
            <Text style={s.sectionTitle}>선택한 명당</Text>
            <StoreCard store={selectedStore} selected onPress={() => focusStore(selectedStore)} />
          </View>
        )}

        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.sectionTitle}>{listTitle} TOP {Math.min(stores.length, 30)}</Text>
            <Text style={s.dim}>{stores.length}곳</Text>
          </View>
          {stores.slice(0, 30).map(store => (
            <StoreCard key={store.id} store={store} selected={store.id === selectedStore?.id} onPress={() => focusStore(store)} />
          ))}
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
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },
  locationTitle: { fontSize: 12, fontWeight: '800', color: C.black },
  locationText: { fontSize: 11, color: C.gray, lineHeight: 16, marginTop: 3 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.black, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  locationBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  mapCard: { height: 280, marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  map: { flex: 1 },
  selectedCard: { marginHorizontal: 16, marginTop: 12 },
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  dim: { fontSize: 10, color: C.gray },
  storeCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginTop: 8 },
  storeCardSelected: { borderColor: C.accent },
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
