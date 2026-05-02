import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { filterLuckyStores, LuckyStore, luckyStorePayload, StoreRankFilter, storeSummary } from '../data/luckyStores';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A', green: '#137A4A' };
const KOREA_REGION = { latitude: 36.4203004, longitude: 128.31796, latitudeDelta: 5.2, longitudeDelta: 4.2 };

const FILTERS: { label: string; value: StoreRankFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '1등', value: 'first' },
  { label: '2등', value: 'second' },
];

function openMap(store: LuckyStore) {
  const query = encodeURIComponent(`${store.name} ${store.address}`);
  Linking.openURL(`https://map.naver.com/p/search/${query}`);
}

function StoreCard({ store, selected, onPress }: { store: LuckyStore; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.storeCard, selected && s.storeCardSelected]} onPress={onPress} activeOpacity={0.82}>
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
        <Text style={s.mapLinkText}>길찾기</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function LuckyMapContent() {
  const mapRef = useRef<MapView>(null);
  const [filter, setFilter] = useState<StoreRankFilter>('all');
  const stores = useMemo(() => filterLuckyStores(filter), [filter]);
  const [selectedId, setSelectedId] = useState(stores[0]?.id);
  const selectedStore = stores.find(store => store.id === selectedId) ?? stores[0];
  const markerStores = stores.slice(0, 120);

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

        <View style={s.filterRow}>
          {FILTERS.map(item => (
            <TouchableOpacity key={item.value} style={[s.filterBtn, filter === item.value && s.filterBtnActive]} onPress={() => { setFilter(item.value); setSelectedId(filterLuckyStores(item.value)[0]?.id); }}>
              <Text style={[s.filterText, filter === item.value && s.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.mapCard}>
          <MapView
            ref={mapRef}
            style={s.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={KOREA_REGION}
            showsUserLocation={false}
            showsCompass
          >
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
            <Text style={s.sectionTitle}>명당 TOP {Math.min(stores.length, 30)}</Text>
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
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  filterBtn: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  filterBtnActive: { backgroundColor: C.black, borderColor: C.black },
  filterText: { fontSize: 12, fontWeight: '700', color: C.gray },
  filterTextActive: { color: '#FFFFFF' },
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
