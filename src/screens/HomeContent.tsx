import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { Draw } from '../data/lottoData';
import { saveRecommendedTicket } from '../data/recommendedTicket';
import { PENDING_GAMES_LIMIT } from '../data/ticketStore';
import { usePendingPicks } from '../hooks/usePendingPicks';
import { generateSets, RecommendMode } from '../engine/predictor';
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
  const latestSum = latest.numbers.reduce((a, b) => a + b, 0);
  const nextDrwNo = latest.drwNo + 1;
  const [mode, setMode] = useState<RecommendMode>('safe');
  const [count, setCount] = useState<number>(5);
  const initialAnalysis = generateSets(draws, mode, count);
  const [result, setResult] = useState<ReturnType<typeof generateSets> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { pending, isSelected, toggleSelect } = usePendingPicks();

  const toggleSelectSet = useCallback(async (numbers: number[]) => {
    const res = await toggleSelect(numbers, nextDrwNo);
    if (!res) return;
    if (res.type === 'committed') {
      onTicketSaved?.();
      Alert.alert(
        '내 번호 시트 완성! 🎯',
        `5개 번호가 모여서 ${nextDrwNo}회차 내 번호로 저장되었습니다.`,
        [
          { text: '확인' },
          { text: '내 번호 보기', onPress: onOpenTickets },
        ],
      );
    } else if (res.type === 'full') {
      Alert.alert('가득 찼어요', '5개가 모이면 자동으로 시트로 저장됩니다.');
    }
    // 'added' / 'duplicate' 는 별도 처리 불필요 (구독 패턴이 갱신)
  }, [nextDrwNo, onOpenTickets, onTicketSaved, toggleSelect]);

  const regenerate = useCallback(() => {
    setBusy(true);
    setTimeout(() => { setResult(generateSets(draws, mode, count)); setBusy(false); }, 200);
  }, [draws, mode, count]);

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
          right={(
            <View style={s.headerActions}>
              <View style={s.actionGroup}>
                <View style={s.headerInfoSlot}>
                  <HeaderInfo />
                </View>
                <TouchableOpacity style={[s.btn, busy && { opacity: 0.4 }]} onPress={regenerate} disabled={busy}>
                  <Text style={s.btnText}>{busy ? '생성 중' : result ? '다시 추천' : '번호 추천'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <View style={[s.card, s.latestCard]}>
          <View style={s.latestHead}>
            <Text style={s.label}>{latest.drwNo}회 당첨번호 · {latest.drwNoDate}</Text>
            <Text style={s.latestSum}>합계 {latestSum}</Text>
          </View>
          <View style={s.row}>
            {latest.numbers.map((n, i) => <Ball key={i} num={n} size={36} />)}
            <Text style={s.plus}>+</Text>
            <Ball num={latest.bonus} size={36} />
          </View>
        </View>

        {/* 추천 옵션: 모드 + 갯수 */}
        <View style={s.card}>
          <View style={s.optionRow}>
            <Text style={s.optionLabel}>모드</Text>
            <View style={s.segment}>
              {(['safe', 'aggressive', 'experimental'] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[s.segmentBtn, mode === m && s.segmentBtnActive]}
                  onPress={() => setMode(m)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.segmentText, mode === m && s.segmentTextActive]}>
                    {m === 'safe' ? '🛡️ 안정' : m === 'aggressive' ? '🔥 공격' : '🎲 실험'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[s.optionRow, { marginTop: 10 }]}>
            <Text style={s.optionLabel}>갯수</Text>
            <View style={s.countRow}>
              <TouchableOpacity
                style={[s.countBtn, count <= 1 && { opacity: 0.3 }]}
                onPress={() => setCount(c => Math.max(1, c - 1))}
                disabled={count <= 1}
                activeOpacity={0.6}
              >
                <Ionicons name="remove" size={18} color={C.black} />
              </TouchableOpacity>
              <Text style={s.countText}>{count}</Text>
              <TouchableOpacity
                style={[s.countBtn, count >= 10 && { opacity: 0.3 }]}
                onPress={() => setCount(c => Math.min(10, c + 1))}
                disabled={count >= 10}
                activeOpacity={0.6}
              >
                <Ionicons name="add" size={18} color={C.black} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {result && (
          <View style={s.card}>
            <View style={s.cardHead}>
              <View>
                <Text style={s.cardTitle}>{nextDrwNo}회차 추천 · {result.sets.length}세트</Text>
                <Text style={s.dim}>합계 {result.sumRange.min}–{result.sumRange.max}</Text>
              </View>
              <TouchableOpacity style={[s.savePickButton, saving && { opacity: 0.45 }]} onPress={saveRecommendation} disabled={saving} activeOpacity={0.75}>
                <Ionicons name="ticket-outline" size={14} color="#FFFFFF" />
                <Text style={s.savePickText}>{saving ? '저장 중' : '내 번호 저장'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.pickHint}>
              ☆ 표시를 눌러 마음에 드는 세트만 골라 모으세요. {pending.length}/{PENDING_GAMES_LIMIT}개 모이면 한 시트로 자동 저장됩니다.
            </Text>
            {result.sets.map(set => {
              const selected = isSelected(set.numbers);
              return (
                <TouchableOpacity
                  key={set.setNo}
                  style={s.setRow}
                  activeOpacity={0.6}
                  onPress={() => toggleSelectSet(set.numbers)}
                >
                  <Text style={s.setNo}>{set.setNo}</Text>
                  <View style={s.ballsRow}>
                    {set.numbers.map((n, i) => <Ball key={i} num={n} size={34} />)}
                  </View>
                  <Text style={s.sum}>{set.numbers.reduce((a, b) => a + b, 0)}</Text>
                  <Ionicons
                    name={selected ? 'star' : 'star-outline'}
                    size={18}
                    color={selected ? C.logo : C.dim}
                    style={s.starIcon}
                  />
                </TouchableOpacity>
              );
            })}
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
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 8 },
  logo: { fontFamily: 'Jua', fontSize: 30, fontWeight: '400', color: C.logo, letterSpacing: 0 },
  headerActions: { position: 'relative', alignItems: 'flex-end', justifyContent: 'flex-end', height: 56, zIndex: 4 },
  actionGroup: { position: 'relative', alignItems: 'flex-end', justifyContent: 'flex-end', height: 56 },
  headerInfoSlot: { position: 'absolute', top: 0, right: 5, zIndex: 3 },
  btn: { backgroundColor: C.black, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  btnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  optionLabel: { fontSize: 12, color: C.gray, fontWeight: '600' },
  segment: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 1, borderColor: C.border, padding: 3, gap: 2 },
  segmentBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  segmentBtnActive: { backgroundColor: C.black },
  segmentText: { fontSize: 12, fontWeight: '600', color: C.gray },
  segmentTextActive: { color: '#FFFFFF' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 1, borderColor: C.border, paddingHorizontal: 6, paddingVertical: 4 },
  countBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 14, fontWeight: '700', color: C.black, minWidth: 18, textAlign: 'center' },
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
  starIcon: { marginLeft: 4 },
  latestHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  latestSum: { fontSize: 11, color: C.gray, fontWeight: '600' },
  pickHint: { fontSize: 11, color: C.gray, lineHeight: 16, marginBottom: 4 },
  ball: { justifyContent: 'center', alignItems: 'center' },
  ballText: { fontWeight: '800' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  reason: { fontSize: 11, color: C.gray, lineHeight: 22 },
  dim: { fontSize: 10, color: C.gray },
});
