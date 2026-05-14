import { allDraws, Draw, getRemoteDraws } from '@/src/data/lottoData';
import { getUserDraws } from '@/src/data/drawStore';
import { checkAndNotifyForeground } from '@/src/services/notifications';
import FixedPickContent from '@/src/screens/FixedPickContent';
import HomeContent from '@/src/screens/HomeContent';
import LuckyMapContent from '@/src/screens/LuckyMapContent';
import MyTicketsContent from '@/src/screens/MyTicketsContent';
import StatsContent from '@/src/screens/StatsContent';
import SumGeneratorContent from '@/src/screens/SumGeneratorContent';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // 🌟 여기서 한 번만 사용

const { width } = Dimensions.get('window');

const TABS = [
  { label: '번호추천', icon: 'sparkles' },
  { label: '고정추천', icon: 'pin' },
  { label: '합계생성', icon: 'options' },
  { label: '내 번호', icon: 'ticket' },
  { label: '명당', icon: 'map' },
  { label: '통계', icon: 'bar-chart' }
];

function mergeDraws(...drawGroups: Draw[][]): Draw[] {
  const byDrawNo = new Map<number, Draw>();
  drawGroups.forEach(draws => {
    draws.forEach(draw => byDrawNo.set(draw.drwNo, draw));
  });
  return Array.from(byDrawNo.values()).sort((a, b) => a.drwNo - b.drwNo);
}

export default function App() {
  const [page, setPage] = useState(0);
  const [draws, setDraws] = useState<Draw[]>(allDraws);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [ticketsRefreshKey, setTicketsRefreshKey] = useState(0);
  const [scannerRequestId, setScannerRequestId] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const loadDraws = useCallback(async () => {
    const [remoteDraws, userDraws] = await Promise.all([
      getRemoteDraws(),
      getUserDraws(),
    ]);
    const merged = mergeDraws(allDraws, remoteDraws, userDraws);
    setDraws(merged);
    // 새 회차 감지 시 알림 (권한 있을 때만, 첫 실행 때는 기준선만 저장)
    checkAndNotifyForeground(merged).catch(() => {});
  }, []);

  useEffect(() => {
    loadDraws();
  }, [loadDraws]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        loadDraws();
      }
    });

    return () => subscription.remove();
  }, [loadDraws]);

  const goTo = (p: number) => {
    scrollRef.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
  };

  const refreshTickets = () => setTicketsRefreshKey(key => key + 1);

  const openScannerFromHome = () => {
    goTo(3); // 내 번호 탭
    setScannerRequestId(id => id + 1);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}> 
      <View style={s.root}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={scrollEnabled} 
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          <View style={{ width }}><HomeContent draws={draws} onTicketSaved={refreshTickets} onOpenTickets={() => goTo(3)} onOpenScanner={openScannerFromHome} /></View>
          <View style={{ width }}><FixedPickContent draws={draws} onTicketSaved={refreshTickets} onOpenTickets={() => goTo(3)} /></View>
          <View style={{ width }}>
            <SumGeneratorContent draws={draws} setParentScrollEnabled={setScrollEnabled} onTicketSaved={refreshTickets} onOpenTickets={() => goTo(3)} />
          </View>
          <View style={{ width }}><MyTicketsContent draws={draws} refreshKey={ticketsRefreshKey} scannerRequestId={scannerRequestId} /></View>
          <View style={{ width }}><LuckyMapContent isActive={page === 4} /></View>
          <View style={{ width }}><StatsContent draws={draws} /></View>
        </ScrollView>

        <View style={s.tabBar}>
          {TABS.map((tab, i) => (
            <TouchableOpacity key={tab.label} style={s.tab} onPress={() => goTo(i)}>
              <Ionicons name={tab.icon as any} size={19} color={page === i ? '#1A1A1A' : '#BBBBBB'} />
              <Text style={[s.tabText, page === i && s.tabActive]}>{tab.label}</Text>
              {page === i && <View style={s.indicator} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' }, // 🌟 모든 페이지 배경색 통일
  root: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 8, paddingBottom: 13, paddingHorizontal: 14 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', minHeight: 56, paddingTop: 2, paddingHorizontal: 2 },
  tabText: { fontSize: 10.5, color: '#BBBBBB', fontWeight: '600', marginTop: 2 },
  tabActive: { color: '#1A1A1A' },
  indicator: { width: 20, height: 3, backgroundColor: '#D94F2A', borderRadius: 1.5, marginTop: 4 },
});
