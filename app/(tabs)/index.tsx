import { allDraws, Draw } from '@/src/data/lottoData';
import FixedPickContent from '@/src/screens/FixedPickContent';
import HomeContent from '@/src/screens/HomeContent';
import StatsContent from '@/src/screens/StatsContent';
import SumGeneratorContent from '@/src/screens/SumGeneratorContent';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // 🌟 여기서 한 번만 사용

const { width } = Dimensions.get('window');

const TABS = [
  { label: '번호추천', icon: 'sparkles' },
  { label: '고정추천', icon: 'pin' },
  { label: '합계생성', icon: 'options' },
  { label: '통계', icon: 'bar-chart' }
];

export default function App() {
  const [page, setPage] = useState(0);
  const [draws] = useState<Draw[]>(allDraws);
  const [scrollEnabled, setScrollEnabled] = useState(true); 
  const scrollRef = useRef<ScrollView>(null);

  // ... (데이터 로딩 로직은 동일)

  const goTo = (p: number) => {
    scrollRef.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
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
          <View style={{ width }}><HomeContent draws={draws} /></View>
          <View style={{ width }}><FixedPickContent draws={draws} /></View>
          <View style={{ width }}>
            <SumGeneratorContent setParentScrollEnabled={setScrollEnabled} />
          </View>
          <View style={{ width }}><StatsContent draws={draws} /></View>
        </ScrollView>

        <View style={s.tabBar}>
          {TABS.map((tab, i) => (
            <TouchableOpacity key={tab.label} style={s.tab} onPress={() => goTo(i)}>
              <Ionicons name={tab.icon as any} size={22} color={page === i ? '#1A1A1A' : '#BBBBBB'} />
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
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 8, paddingBottom: 13 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', minHeight: 56, paddingTop: 2 },
  tabText: { fontSize: 11, color: '#BBBBBB', fontWeight: '600', marginTop: 2 },
  tabActive: { color: '#1A1A1A' },
  indicator: { width: 20, height: 3, backgroundColor: '#D94F2A', borderRadius: 1.5, marginTop: 4 },
});
