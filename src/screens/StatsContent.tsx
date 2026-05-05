import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { Draw, getConsecutiveRate, getFrequency, getGaps, getOddEvenDistribution, getSeasonalFrequency, getSumStats, SEASON_NAMES } from '../data/lottoData';
import { ballBg, ballText } from '../utils/colors';
import { Ball } from './HomeContent';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', accent: '#D94F2A' };

function Row({ label, value, sub, divider }: { label: string; value: string; sub?: string; divider?: boolean }) {
  return (
    <View style={[s.statRow, divider && s.rowDivider]}>
      <Text style={s.statLabel}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.statValue}>{value}</Text>
        {sub && <Text style={s.statSub}>{sub}</Text>}
      </View>
    </View>
  );
}

export default function StatsContent({ draws }: { draws: Draw[] }) {
  const total = draws.length;
  const freq = useMemo(() => getFrequency(draws), [draws]);
  const gaps = useMemo(() => getGaps(draws), [draws]);
  const seasonal = useMemo(() => getSeasonalFrequency(draws), [draws]);
  const oddEven = useMemo(() => getOddEvenDistribution(draws), [draws]);
  const sumStats = useMemo(() => getSumStats(draws), [draws]);
  const consecRate = useMemo(() => getConsecutiveRate(draws), [draws]);

  const sorted = Object.entries(freq).map(([n, c]) => ({ n: +n, c }));
  const top10 = [...sorted].sort((a, b) => b.c - a.c).slice(0, 10);
  const bot10 = [...sorted].sort((a, b) => a.c - b.c).slice(0, 10);
  const maxFreq = top10[0].c;

  const gapTop = Object.entries(gaps).map(([n, g]) => ({ n: +n, g })).sort((a, b) => b.g - a.g).slice(0, 10);
  const oddEvenSorted = Object.entries(oddEven).sort((a, b) => b[1] - a[1]);

  const month = new Date().getMonth() + 1;
  const cs = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'fall' : 'winter';
  const seasonTop = Object.entries(seasonal[cs]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const allSeasons: [string, string][] = [['spring', '봄'], ['summer', '여름'], ['fall', '가을'], ['winter', '겨울']];

  return (
    <View style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <ScreenHeader title="통계" subtitle={`${total}회차 분석`} right={<HeaderInfo />} />

        {/* 합계 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>번호 합계 분포</Text>
          <Row label="평균 합계" value={`${sumStats.avg}`} />
          <Row label="핵심 범위 (50%)" value={`${sumStats.p10} ~ ${sumStats.p90}`} sub="전체 당첨의 50% 구간" divider />
          <Row label="전체 범위" value={`${sumStats.min} ~ ${sumStats.max}`} divider />
        </View>

        {/* 홀짝 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>홀수 / 짝수 분포</Text>
          {oddEvenSorted.map(([k, c], index) => {
            const [odd, even] = k.split(':');
            const w = Math.round(c / total * 120);
            return (
              <View key={k} style={[s.statRow, index > 0 && s.rowDivider]}>
                <Text style={s.statLabel}>홀 {odd} · 짝 {even}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.bar, { width: w }]} />
                  <Text style={s.statValue}>{(c / total * 100).toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 연속번호 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>연속 번호</Text>
          <Row label="연속 번호 포함율" value={`${(consecRate * 100).toFixed(1)}%`} sub={`${Math.round(consecRate * total)}회 / ${total}회`} />
          <Text style={s.tip}>약 2회 중 1회는 연속된 번호가 포함됨</Text>
        </View>

        {/* 현재 계절 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{SEASON_NAMES[cs]}철 강세 번호</Text>
          <View style={s.numGrid}>
            {seasonTop.map(([n, c]) => (
              <View key={n} style={[s.numBadge, { backgroundColor: ballBg(+n) }]}>
                <Text style={[s.numBadgeN, { color: ballText(+n) }]}>{n}</Text>
                <Text style={[s.numBadgeC, { color: ballText(+n), opacity: 0.7 }]}>{c}회</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4계절 비교 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>계절별 TOP 5</Text>
          {allSeasons.map(([key, name], index) => {
            const top5 = Object.entries(seasonal[key]).sort((a, b) => b[1] - a[1]).slice(0, 5);
            return (
              <View key={key} style={[s.seasonRow, index > 0 && s.rowDivider]}>
                <Text style={s.seasonName}>{name}</Text>
                <View style={s.row}>
                  {top5.map(([n]) => <Ball key={n} num={+n} size={28} />)}
                </View>
              </View>
            );
          })}
        </View>

        {/* 미출현 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>미출현 TOP 10</Text>
          <Text style={s.tip}>최근 가장 오래 나오지 않은 번호</Text>
          {gapTop.map(({ n, g }, index) => (
            <View key={n} style={[s.statRow, index > 0 && s.rowDivider]}>
              <View style={s.row}><Ball num={n} size={26} /><Text style={[s.statLabel, { marginLeft: 6 }]}>{n}번</Text></View>
              <Text style={[s.statValue, g >= 20 && { color: C.accent }]}>{g}회째 미출현</Text>
            </View>
          ))}
        </View>

        {/* 고빈도 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>고빈도 TOP 10</Text>
          {top10.map(({ n, c }, index) => (
            <View key={n} style={[s.freqRow, index > 0 && s.rowDivider]}>
              <Ball num={n} size={24} />
              <View style={s.freqBarBg}>
                <View style={[s.freqFill, { width: `${(c / maxFreq) * 100}%`, backgroundColor: ballBg(n) }]} />
              </View>
              <Text style={s.freqNum}>{c}회</Text>
              <Text style={s.freqPct}>{(c / total * 100).toFixed(1)}%</Text>
            </View>
          ))}
        </View>

        {/* 저빈도 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>저빈도 BOTTOM 10</Text>
          {bot10.map(({ n, c }, index) => (
            <View key={n} style={[s.freqRow, index > 0 && s.rowDivider]}>
              <Ball num={n} size={24} />
              <View style={s.freqBarBg}>
                <View style={[s.freqFill, { width: `${(c / maxFreq) * 100}%`, backgroundColor: ballBg(n) }]} />
              </View>
              <Text style={s.freqNum}>{c}회</Text>
              <Text style={s.freqPct}>{(c / total * 100).toFixed(1)}%</Text>
            </View>
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
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.black, marginBottom: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.border },
  statLabel: { fontSize: 12, color: C.gray },
  statValue: { fontSize: 13, fontWeight: '600', color: C.black },
  statSub: { fontSize: 10, color: C.gray, marginTop: 1 },
  tip: { fontSize: 11, color: C.gray, marginTop: 4 },
  bar: { height: 4, backgroundColor: '#DDDDDD', borderRadius: 2 },
  numGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  numBadge: { borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 52 },
  numBadgeN: { fontSize: 15, fontWeight: '800' },
  numBadgeC: { fontSize: 10, marginTop: 2 },
  seasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  seasonName: { width: 36, fontSize: 12, color: C.gray },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  freqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  freqBarBg: { flex: 1, height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  freqFill: { height: '100%', borderRadius: 3 },
  freqNum: { fontSize: 11, color: C.black, width: 32, textAlign: 'right' },
  freqPct: { fontSize: 10, color: C.gray, width: 38, textAlign: 'right' },
});
