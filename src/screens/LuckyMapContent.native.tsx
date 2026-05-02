import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { LuckyStore, LuckyStoreMode, LuckyStoreWithDistance, luckyStorePayload, nearbyLuckyStores, StoreLocation, storesForLuckyMode, storeSummary } from '../data/luckyStores';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A', green: '#137A4A' };
const KOREA_REGION = { latitude: 36.4203004, longitude: 128.31796, latitudeDelta: 5.2, longitudeDelta: 4.2 };
const MARKER_LIMIT = 650;

const MODES: { label: string; value: LuckyStoreMode }[] = [
  { label: '내 주변', value: 'nearby' },
  { label: '1등', value: 'first' },
  { label: '2등', value: 'second' },
  { label: '전국', value: 'national' },
];

function modeTitle(mode: LuckyStoreMode, hasLocation: boolean) {
  if (mode === 'nearby') return hasLocation ? '내 주변 당첨 판매점' : '내 주변 로또 판매 매장 찾기';
  if (mode === 'first') return '1등 당첨 판매점';
  if (mode === 'second') return '2등 당첨 판매점';
  return '전국 명당 리스트';
}

function distanceText(store: LuckyStore | LuckyStoreWithDistance) {
  return 'distanceKm' in store ? `${store.distanceKm.toFixed(store.distanceKm < 10 ? 1 : 0)}km` : null;
}

function StoreCard({
  store,
  selected,
  onPress,
  actionLabel,
  onAction,
}: {
  store: LuckyStore | LuckyStoreWithDistance;
  selected: boolean;
  onPress: () => void;
  actionLabel: string;
  onAction: () => void;
}) {
  const distance = distanceText(store);

  return (
    <TouchableOpacity style={[s.storeCard, selected && s.storeCardSelected]} onPress={onPress} activeOpacity={0.82}>
      <View style={s.storeHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={s.storeMeta}>{store.region} · 최근 {store.lastRound}회 {store.lastRank}등{distance ? ` · ${distance}` : ''}</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{store.totalWins}회</Text>
        </View>
      </View>
      <Text style={s.storeWins}>{storeSummary(store)}</Text>
      <View style={s.addressRow}>
        <Text style={s.storeAddress} numberOfLines={2}>{store.address}</Text>
        <TouchableOpacity style={s.mapLink} onPress={onAction} activeOpacity={0.75}>
          <Ionicons name="map-outline" size={14} color={C.black} />
          <Text style={s.mapLinkText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function LuckyMapContent() {
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<LuckyStore | LuckyStoreWithDistance>>(null);
  const [mode, setMode] = useState<LuckyStoreMode>('nearby');
  const [location, setLocation] = useState<StoreLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState('위치 권한을 허용하면 가까운 당첨 판매점을 볼 수 있습니다');
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const stores = useMemo(() => storesForLuckyMode(mode, location), [mode, location]);
  const selectedStore = stores.find(store => store.id === selectedId) ?? stores[0];
  const markerStores = useMemo(() => {
    if (mode === 'national') return [];
    const topStores = stores.slice(0, MARKER_LIMIT);
    if (!selectedStore || topStores.some(store => store.id === selectedStore.id)) return topStores;
    return [selectedStore, ...topStores];
  }, [mode, selectedStore, stores]);
  const title = modeTitle(mode, Boolean(location));

  async function locateMe() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationMessage('위치 권한을 허용하면 내 주변 판매점을 볼 수 있습니다');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextLocation = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      };
      const nextStores = nearbyLuckyStores(nextLocation, 'all');
      setLocation(nextLocation);
      setMode('nearby');
      setSelectedId(nextStores[0]?.id);
      setLocationMessage('가까운 판매점 중 당첨 횟수가 많은 곳을 우선 표시합니다');
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
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

  function selectMode(nextMode: LuckyStoreMode) {
    setMode(nextMode);
    setSelectedId(undefined);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function showOnMap(store: LuckyStore) {
    const nextMode: LuckyStoreMode = store.firstWins > 0 ? 'first' : 'second';
    setMode(nextMode);
    setSelectedId(store.id);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setTimeout(() => focusStore(store), 250);
  }

  function renderStore({ item }: { item: LuckyStore | LuckyStoreWithDistance }) {
    const isNational = mode === 'national';
    return (
      <StoreCard
        store={item}
        selected={item.id === selectedStore?.id}
        onPress={() => isNational ? showOnMap(item) : focusStore(item)}
        actionLabel="위치 보기"
        onAction={() => isNational ? showOnMap(item) : focusStore(item)}
      />
    );
  }

  const header = (
    <>
      <ScreenHeader title="명당지도" subtitle={`${luckyStorePayload.periodLabel} · ${luckyStorePayload.startRound}~${luckyStorePayload.latestRound}회 · ${luckyStorePayload.stores.length}곳`} right={<HeaderInfo />} />

      <View style={s.modeGrid}>
        {MODES.map(item => (
          <TouchableOpacity key={item.value} style={[s.modeBtn, mode === item.value && s.modeBtnActive]} onPress={() => selectMode(item.value)}>
            <Text style={[s.modeText, mode === item.value && s.modeTextActive]}>{item.label}</Text>
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

      {mode !== 'national' && (
        <>
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
              <Text style={s.sectionTitle}>선택한 판매점</Text>
              <StoreCard store={selectedStore} selected onPress={() => focusStore(selectedStore)} actionLabel="위치 보기" onAction={() => focusStore(selectedStore)} />
            </View>
          )}
        </>
      )}

      <View style={s.listHead}>
        <Text style={s.sectionTitle}>{title}</Text>
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
        ListEmptyComponent={<Text style={s.emptyText}>위치 확인을 누르면 내 주변 판매점이 표시됩니다.</Text>}
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
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  modeBtn: { width: '48.8%', borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modeBtnActive: { backgroundColor: C.black, borderColor: C.black },
  modeText: { fontSize: 13, fontWeight: '800', color: C.gray },
  modeTextActive: { color: '#FFFFFF' },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },
  locationTitle: { fontSize: 12, fontWeight: '800', color: C.black },
  locationText: { fontSize: 11, color: C.gray, lineHeight: 16, marginTop: 3 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.black, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  locationBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  mapCard: { height: 300, marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  map: { flex: 1 },
  selectedCard: { marginHorizontal: 16, marginTop: 12 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 14, marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  dim: { fontSize: 10, color: C.gray },
  emptyText: { marginHorizontal: 16, marginTop: 8, padding: 16, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.card, fontSize: 12, color: C.gray, textAlign: 'center' },
  storeCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 8 },
  storeCardSelected: { borderColor: C.accent },
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
