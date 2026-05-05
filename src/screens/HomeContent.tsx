import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import ScreenHeader from '../components/ScreenHeader';
import { Draw } from '../data/lottoData';
import { saveRecommendedTicket } from '../data/recommendedTicket';
import { generateFiveSets } from '../engine/predictor';
import { ballBg, ballText } from '../utils/colors';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', logo: '#D94F2A' };

export function Ball({ num, size = 40 }: { num: number; size?: number }) {
  return (
    <View style={[s.ball, { width: size, height: size, borderRadius: size / 2, backgroundColor: ballBg(num) }]}>
      <Text style={[s.ballText, { fontSize: size * 0.36, color: ballText(num) }]}>{num}</Text>
    </View>
  );
}

export default function HomeContent({
  draws,
  onTicketSaved,
  onOpenTickets,
}: {
  draws: Draw[];
  onTicketSaved?: () => void;
  onOpenTickets?: () => void;
}) {
  const latest = draws[draws.length - 1];
  const nextDrwNo = latest.drwNo + 1;
  const initialAnalysis = generateFiveSets(draws);
  const [result, setResult] = useState<ReturnType<typeof generateFiveSets> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const regenerate = useCallback(() => {
    setBusy(true);
    setTimeout(() => { setResult(generateFiveSets(draws)); setBusy(false); }, 200);
  }, [draws]);

  const saveRecommendation = useCallback(async () => {
    if (!result || saving) return;

    try {
      setSaving(true);
      const count = await saveRecommendedTicket(nextDrwNo, result.sets);
      onTicketSaved?.();
      Alert.alert(
        '저장 완료',
        `${nextDrwNo}회 ${count}게임을 내 번호에 저장했습니다.`,
        [
          { text: '확인' },
          { text: '내 번호 보기', onPress: onOpenTickets },
        ],
      );
    } catch {
      Alert.alert('오류', '추천 번호를 저장하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }, [nextDrwNo, onOpenTickets, onTicketSaved, result, saving]);

  return (
    <View style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <ScreenHeader
          title="로또될각"
          titleStyle={s.logo}
          subtitle="이번엔 진짜 로또될각!"
          containerStyle={s.header}
          right={(
            <View style={s.headerActions}>
              <View style={s.actionGroup}>
              <TouchableOpacity style={s.infoButton} onPress={() => setIsInfoOpen(prev => !prev)} activeOpacity={0.8}>
                <Text style={s.infoButtonText}>i</Text>
              </TouchableOpacity>
              {isInfoOpen && (
                <View style={s.infoBubbleWrap}>
                  <View style={s.infoArrow} />
                  <View style={s.infoBubble}>
                    <Text style={s.infoText}>우주🪐의 기운을 모아</Text>
                    <Text style={s.infoText}>당첨을 기원합니다! 🙏</Text>
                    <Text style={s.infoEmail}>meetyuuu@gmail.com</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity style={[s.btn, busy && { opacity: 0.4 }]} onPress={regenerate} disabled={busy}>
                <Text style={s.btnText}>{busy ? '생성 중' : result ? '다시 추천' : '번호 추천'}</Text>
              </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <View style={[s.card, s.latestCard]}>
          <Text style={s.label}>{latest.drwNo}회 당첨번호 · {latest.drwNoDate}</Text>
          <View style={s.row}>
            {latest.numbers.map((n, i) => <Ball key={i} num={n} size={36} />)}
            <Text style={s.plus}>+</Text>
            <Ball num={latest.bonus} size={36} />
          </View>
        </View>

        {result && (
          <View style={s.card}>
            <View style={s.cardHead}>
              <View>
                <Text style={s.cardTitle}>{nextDrwNo}회차 추천 · 5세트</Text>
                <Text style={s.dim}>합계 {result.sumRange.min}–{result.sumRange.max}</Text>
              </View>
              <TouchableOpacity style={[s.savePickButton, saving && { opacity: 0.45 }]} onPress={saveRecommendation} disabled={saving} activeOpacity={0.75}>
                <Ionicons name="ticket-outline" size={14} color="#FFFFFF" />
                <Text style={s.savePickText}>{saving ? '저장 중' : '내 번호 저장'}</Text>
              </TouchableOpacity>
            </View>
            {result.sets.map(set => (
              <View key={set.setNo} style={s.setRow}>
                <Text style={s.setNo}>{set.setNo}</Text>
                <View style={s.ballsRow}>
                  {set.numbers.map((n, i) => <Ball key={i} num={n} size={34} />)}
                </View>
                <Text style={s.sum}>{set.numbers.reduce((a, b) => a + b, 0)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.card}>
          <TouchableOpacity style={s.accordionHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.6}>
            <Text style={s.cardTitle}>분석 기준</Text>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={C.gray} />
          </TouchableOpacity>
          {isExpanded && (
            <View style={s.accordionContent}>
              {(result?.reasons ?? initialAnalysis.reasons).map((r, i) => <Text key={i} style={s.reason}>· {r}</Text>)}
            </View>
          )}
        </View>

        <AdBanner />

        <View style={{ height: 32 }} />
      </ScrollView>
      {isInfoOpen && <TouchableOpacity style={s.infoBackdrop} activeOpacity={1} onPress={() => setIsInfoOpen(false)} />}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 8 },
  header: { alignItems: 'flex-end' },
  logo: { fontFamily: 'Jua', fontSize: 30, fontWeight: '400', color: C.logo, letterSpacing: 0 },
  infoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  headerActions: { position: 'relative', alignItems: 'flex-end', zIndex: 4 },
  actionGroup: {
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    height: 53,
  },
  infoButton: {
    position: 'absolute',
    top: -10,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  infoButtonText: { fontSize: 10, fontWeight: '700', color: C.gray },
  infoBubbleWrap: {
    position: 'absolute',
    top: 24,
    right: 0,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  infoArrow: {
    width: 10,
    height: 10,
    backgroundColor: C.card,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: C.border,
    transform: [{ rotate: '45deg' }],
    marginRight: 12,
    marginBottom: -5,
    zIndex: 1,
  },
  infoBubble: {
    width: 172,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoText: { fontSize: 11, lineHeight: 17, color: C.gray, textAlign: 'center' },
  infoEmail: { fontSize: 11, lineHeight: 17, color: C.black, marginTop: 4, textAlign: 'center' },
  btn: { backgroundColor: C.black, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  btnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  savePickButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.black, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  savePickText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  latestCard: { marginTop: 10 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.black },
  label: { fontSize: 11, color: C.gray, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plus: { color: C.dim, fontSize: 14 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
  setNo: { fontSize: 11, fontWeight: '700', color: C.dim, width: 14 },
  ballsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  sum: { fontSize: 11, color: C.gray, width: 28, textAlign: 'right' },
  ball: { justifyContent: 'center', alignItems: 'center' },
  ballText: { fontWeight: '800' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  reason: { fontSize: 11, color: C.gray, lineHeight: 22 },
  dim: { fontSize: 10, color: C.gray },
});
