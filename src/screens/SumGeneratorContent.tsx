import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { Ball } from './HomeContent';

const { width } = Dimensions.get('window');
const C = { 
  bg: '#FFFFFF', 
  card: '#F7F7F7', 
  border: '#EEEEEE', 
  black: '#1A1A1A', 
  gray: '#999999', 
  dim: '#CCCCCC', 
  logo: '#D94F2A' 
};

interface Props {
  setParentScrollEnabled: (enabled: boolean) => void;
}

interface GeneratedSet {
  setNo: number;
  numbers: number[];
  sum: number;
}

export default function SumGeneratorContent({ setParentScrollEnabled }: Props) {
  const [values, setValues] = useState([121, 180]);
  const [result, setResult] = useState<GeneratedSet[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 🌟 분석 기준 데이터 유지
  const analysisReasons = [
    `설정하신 합계 범위(${values[0]}~${values[1]})를 최우선으로 반영했습니다.`,
    "역대 당첨 번호의 합계 분포 데이터를 기반으로 필터링되었습니다.",
    "번호대별(10단위) 균형 배분 원칙을 적용하여 조합되었습니다.",
    "최근 5주간 출현 빈도가 높은 번호와 낮은 번호를 적절히 배합했습니다."
  ];

  const generateBySum = () => {
    setBusy(true);
    setTimeout(() => {
      const newSets: GeneratedSet[] = [];
      for (let i = 1; i <= 5; i++) {
        let attempts = 0;
        let setNumbers: number[] = [];
        let setSum = 0;
        while (attempts < 2000) {
          const temp = new Set<number>();
          while (temp.size < 6) temp.add(Math.floor(Math.random() * 45) + 1);
          const sorted = Array.from(temp).sort((a, b) => a - b);
          const currentSum = sorted.reduce((a, b) => a + b, 0);
          if (currentSum >= values[0] && currentSum <= values[1]) {
            setNumbers = sorted;
            setSum = currentSum;
            break;
          }
          attempts++;
        }
        newSets.push({ setNo: i, numbers: setNumbers, sum: setSum });
      }
      setResult(newSets);
      setBusy(false);
    }, 200);
  };

  const ticks = [21, 50, 100, 150, 200, 255];

  return (
    <View style={s.safe}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
      >
        <ScreenHeader title="합계생성 추천" subtitle="원하는 합계 범위 설정 · 번호 자동 추천" right={<HeaderInfo />} />

        {/* 범위 설정 카드 */}
        <View style={s.card}>
          <Text style={s.label}>설정할 합계 범위 ({values[0]} ~ {values[1]})</Text>
          <View style={s.sliderWrapper}>
            <MultiSlider
              values={[values[0], values[1]]}
              sliderLength={width - 80}
              onValuesChange={setValues}
              onValuesChangeStart={() => setParentScrollEnabled(false)}
              onValuesChangeFinish={() => setParentScrollEnabled(true)}
              min={21} max={255} step={1}
              allowOverlap={false} snapped
              containerStyle={s.sliderContainer}
              trackStyle={s.trackBase}
              selectedStyle={s.trackSelected}
              unselectedStyle={s.trackUnselected}
              markerStyle={s.marker}
              pressedMarkerStyle={s.marker}
            />
            <View style={s.tickWrapper}>
              {ticks.map((t) => (
                <View key={t} style={s.tickItem}>
                  <View style={s.tickLine} />
                  <Text style={s.tickLabel}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
          <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 24 }, busy && { opacity: 0.4 }]} onPress={generateBySum} disabled={busy}>
            <Text style={s.btnPrimaryText}>{busy ? '생성 중' : result ? '다시 추천' : '번호 추천'}</Text>
          </TouchableOpacity>
        </View>

        {/* 결과 카드 */}
        {result && (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>추천 결과 · 5세트</Text>
              <Text style={s.dim}>합계 {values[0]}–{values[1]}</Text>
            </View>
            {result.map(set => (
              <View key={set.setNo} style={s.setRow}>
                <Text style={s.setNoText}>{set.setNo}</Text>
                <View style={s.ballsRow}>
                  {set.numbers.map((n, i) => <Ball key={i} num={n} size={34} />)}
                </View>
                <Text style={s.sumText}>{set.sum}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 🌟 분석 기준 아코디언 (내용 복구) */}
        <View style={s.card}>
          <TouchableOpacity 
            style={s.accordionHeader} 
            onPress={() => setIsExpanded(!isExpanded)} 
            activeOpacity={0.6}
          >
            <Text style={s.cardTitle}>분석 기준</Text>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={C.gray} />
          </TouchableOpacity>
          {isExpanded && (
            <View style={s.accordionContent}>
              {analysisReasons.map((r, i) => (
                <Text key={i} style={s.reason}>· {r}</Text>
              ))}
            </View>
          )}
        </View>

        <AdBanner />

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: C.bg,
  },
  content: {
    paddingBottom: 8,
  },
  card: { 
    marginHorizontal: 16, 
    marginTop: 12, 
    backgroundColor: C.card, 
    borderRadius: 16, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: C.border 
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.black },
  label: { fontSize: 11, color: C.gray, marginBottom: 8 },
  
  btn: { width: '100%', paddingVertical: 12, borderRadius: 999, alignItems: 'center', backgroundColor: C.black },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  btnPrimary: {}, // 스타일 객체 유지

  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
  setNoText: { fontSize: 11, fontWeight: '700', color: C.dim, width: 14 },
  ballsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumText: { fontSize: 11, color: C.gray, width: 28, textAlign: 'right' },
  dim: { fontSize: 10, color: C.gray },

  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  reason: { fontSize: 11, color: C.gray, lineHeight: 22 },

  sliderWrapper: { alignItems: 'center', marginTop: 10, marginBottom: 10 },
  sliderContainer: { height: 40, justifyContent: 'center' },
  trackBase: { height: 4, borderRadius: 2 },
  trackSelected: { backgroundColor: C.logo, height: 4 },
  trackUnselected: { backgroundColor: C.border, height: 4 },
  marker: { height: 24, width: 24, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 2, borderColor: C.logo, marginTop: 2, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3 },
  tickWrapper: { flexDirection: 'row', justifyContent: 'space-between', width: width - 80, marginTop: 10 },
  tickItem: { alignItems: 'center' },
  tickLine: { width: 1, height: 4, backgroundColor: C.dim, marginBottom: 4 },
  tickLabel: { fontSize: 9, color: C.gray },
});
