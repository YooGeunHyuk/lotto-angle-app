import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { Draw } from '../data/lottoData';
import { saveRecommendedTicket } from '../data/recommendedTicket';
import { PENDING_GAMES_LIMIT } from '../data/ticketStore';
import { usePendingPicks } from '../hooks/usePendingPicks';
import { generateFixedSets } from '../engine/predictor';
import { Ball } from './HomeContent';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', dim: '#CCCCCC', logo: '#D94F2A' };

export default function FixedPickContent({
  draws,
  onTicketSaved,
  onOpenTickets,
}: {
  draws: Draw[];
  onTicketSaved?: () => void;
  onOpenTickets?: () => void;
}) {
  const latest = draws[draws.length - 1];
  const nextDrwNo = latest ? latest.drwNo + 1 : 1;
  const [fixed, setFixed] = useState(['', '', '', '', '']);
  const [result, setResult] = useState<ReturnType<typeof generateFixedSets> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [analysisReasons, setAnalysisReasons] = useState<string[]>([]);
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
  }, [nextDrwNo, onOpenTickets, onTicketSaved, toggleSelect]);

  useEffect(() => {
    if (draws.length > 0) {
      const initial = generateFixedSets(draws, [], 5);
      setAnalysisReasons(initial.reasons);
    }
  }, [draws]);

  function updateFixed(i: number, v: string) {
    const next = [...fixed]; next[i] = v.replace(/[^0-9]/g, ''); setFixed(next);
    if (v.length >= 2 && i < 4) refs.current[i + 1]?.focus();
  }

  function regenerate() {
    const parsed = fixed.map(v => parseInt(v)).filter(n => !isNaN(n));
    if (parsed.some(n => n < 1 || n > 45)) return Alert.alert('오류', '번호는 1~45 사이');
    if (new Set(parsed).size !== parsed.length) return Alert.alert('오류', '고정 번호가 중복됩니다');
    setBusy(true);
    setTimeout(() => {
      const res = generateFixedSets(draws, parsed, 5);
      setResult(res);
      setAnalysisReasons(res.reasons);
      setBusy(false);
    }, 200);
  }

  function clearAll() {
    setFixed(['', '', '', '', '']);
    setResult(null);
    const initial = generateFixedSets(draws, [], 5);
    setAnalysisReasons(initial.reasons);
    setIsExpanded(false);
  }

  async function saveRecommendation() {
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
  }

  const parsed = fixed.map(v => parseInt(v)).filter(n => !isNaN(n) && n >= 1 && n <= 45);

  return (
    <View style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
        <ScreenHeader title="고정번호 추천" subtitle="원하는 번호 고정 · 나머지 자동 추천" right={<HeaderInfo />} />

        {/* 고정 번호 입력 카드 */}
        <View style={s.card}>
          <Text style={s.label}>고정할 번호 (0~5개)</Text>
          <View style={s.numRow}>
            {fixed.map((v, i) => (
              <TextInput key={i} ref={(el) => { refs.current[i] = el; }} style={s.numInput} value={v}
                onChangeText={t => updateFixed(i, t)} keyboardType="number-pad" maxLength={2}
                placeholder={`${i + 1}`} placeholderTextColor={C.gray} />
            ))}
          </View>
          <Text style={s.tip}>입력한 번호는 모든 세트에 고정 포함됩니다</Text>

          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={clearAll}>
              <Text style={s.btnSecondaryText}>초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnPrimary, busy && { opacity: 0.4 }]} onPress={regenerate} disabled={busy}>
              <Text style={s.btnPrimaryText}>{busy ? '생성 중' : result ? '다시 추천' : '번호 추천'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 추천 결과 카드 */}
        {result && result.sets.length > 0 && (
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
                    {set.numbers.map((n, i) => (
                      <View key={i} style={parsed.includes(n) ? s.fixedWrap : undefined}>
                        <Ball num={n} size={34} />
                      </View>
                    ))}
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

        {/* 분석 기준 카드 (아코디언) */}
        <View style={s.card}>
          <TouchableOpacity style={s.accordionHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.6}>
            <Text style={s.cardTitle}>분석 기준</Text>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={C.gray} />
          </TouchableOpacity>
          {isExpanded && (
            <View style={s.accordionContent}>
              {analysisReasons.map((r, i) => <Text key={i} style={s.reason}>· {r}</Text>)}
            </View>
          )}
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
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.black },
  label: { fontSize: 11, color: C.gray, marginBottom: 8 },
  numRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  numInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, color: C.black, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  tip: { fontSize: 11, color: C.gray, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  btnPrimary: { backgroundColor: C.black },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: C.black },
  savePickButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.black, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  savePickText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
  starIcon: { marginLeft: 4 },
  pickHint: { fontSize: 11, color: C.gray, lineHeight: 16, marginBottom: 4 },
  setNo: { fontSize: 11, fontWeight: '700', color: C.dim, width: 14 },
  ballsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sum: { fontSize: 11, color: C.gray, width: 28, textAlign: 'right' },
  fixedWrap: { borderWidth: 2, borderColor: C.logo, borderRadius: 20, padding: 1 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  reason: { fontSize: 11, color: C.gray, lineHeight: 22 },
  dim: { fontSize: 10, color: C.gray },
});
