import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import ScreenHeader from '../components/ScreenHeader';
import { Draw } from '../data/lottoData';
import { generateSajuNumbers, getDailyFortune } from '../services/saju';
import { Ball } from './HomeContent';

const BIRTH_KEY = 'saju_birth_v1';

const C = {
  bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A',
  gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A',
  go: '#137A4A', mid: '#B98000', pass: '#8A8A8A',
};

function gradeColor(grade: string): string {
  return grade === 'GO' ? C.go : grade === '보통' ? C.mid : C.pass;
}

export default function SajuContent({ draws }: { draws: Draw[] }) {
  const [birth, setBirth] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [y, setY] = useState('');
  const [m, setM] = useState('');
  const [d, setD] = useState('');
  const [whyOpen, setWhyOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(BIRTH_KEY);
      if (raw) {
        const dt = new Date(raw);
        if (!Number.isNaN(dt.getTime())) setBirth(dt);
      }
      setLoaded(true);
    })();
  }, []);

  const today = useMemo(() => new Date(), []);
  const fortune = useMemo(() => (birth ? getDailyFortune(birth, today) : null), [birth, today]);
  const sets = useMemo(() => (birth ? generateSajuNumbers(birth, today, draws) : []), [birth, today, draws]);

  const saveBirth = useCallback(async () => {
    const yy = parseInt(y, 10), mm = parseInt(m, 10), dd = parseInt(d, 10);
    if (!yy || yy < 1920 || yy > today.getFullYear()) return;
    if (!mm || mm < 1 || mm > 12) return;
    if (!dd || dd < 1 || dd > 31) return;
    const dt = new Date(yy, mm - 1, dd);
    await AsyncStorage.setItem(BIRTH_KEY, dt.toISOString());
    setBirth(dt);
    setEditing(false);
  }, [y, m, d, today]);

  function startEdit() {
    if (birth) {
      setY(String(birth.getFullYear()));
      setM(String(birth.getMonth() + 1));
      setD(String(birth.getDate()));
    }
    setEditing(true);
  }

  if (!loaded) return <View style={s.safe} />;

  const showInput = !birth || editing;

  return (
    <View style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <ScreenHeader title="로또사주" subtitle="오늘 내 기운 + 통계 한 스푼" />

        {showInput ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>생년월일 (양력)</Text>
            <Text style={s.cardSub}>한 번만 입력하면 매일 오늘의 로또운이 나와요</Text>
            <View style={s.birthRow}>
              <TextInput style={[s.birthInput, { flex: 1.3 }]} value={y} onChangeText={t => setY(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={4} placeholder="1990" placeholderTextColor={C.dim} />
              <Text style={s.birthSep}>년</Text>
              <TextInput style={s.birthInput} value={m} onChangeText={t => setM(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="5" placeholderTextColor={C.dim} />
              <Text style={s.birthSep}>월</Text>
              <TextInput style={s.birthInput} value={d} onChangeText={t => setD(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="15" placeholderTextColor={C.dim} />
              <Text style={s.birthSep}>일</Text>
            </View>
            <TouchableOpacity style={s.saveBtn} onPress={saveBirth} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>오늘의 로또운 보기</Text>
            </TouchableOpacity>
            {birth && (
              <TouchableOpacity onPress={() => setEditing(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>취소</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : fortune ? (
          <>
            <View style={s.heroCard}>
              <Text style={s.heroLabel}>오늘 내 로또운</Text>
              <Text style={[s.heroScore, { color: gradeColor(fortune.grade) }]}>{fortune.score}</Text>
              <View style={[s.gradeBadge, { backgroundColor: gradeColor(fortune.grade) }]}>
                <Text style={s.gradeText}>{fortune.grade}</Text>
              </View>
              <Text style={s.heroReason}>
                {fortune.todayElement} 기운의 날 · {fortune.relationLabel}
              </Text>
              <Text style={s.heroReasonSub}>
                행운수 {fortune.luckyDigit}로 끝나는 번호가 오늘 강세
              </Text>

              <TouchableOpacity style={s.whyToggle} onPress={() => setWhyOpen(v => !v)} activeOpacity={0.7}>
                <Text style={s.whyToggleText}>왜 이 점수인가요?</Text>
                <Ionicons name={whyOpen ? 'chevron-up' : 'chevron-down'} size={14} color={C.accent} />
              </TouchableOpacity>
              {whyOpen && (
                <View style={s.whyBox}>
                  <Text style={s.whyLine}>
                    <Text style={s.whyTag}>사주 </Text>
                    내 일간 {fortune.myStem}({fortune.myElement}) × 오늘 {fortune.todayStem}({fortune.todayElement}) = {fortune.relationLabel}
                  </Text>
                  <Text style={s.whyLine}>
                    <Text style={s.whyTag}>통계 </Text>
                    추천번호는 역대 출현빈도 + 행운수 가중으로 생성
                  </Text>
                  <Text style={s.whyLine}>
                    <Text style={s.whyTag}>점수 </Text>
                    사주 기운(관계)에 일진·통계 보정을 더한 값
                  </Text>
                </View>
              )}
            </View>

            <View style={s.listHead}>
              <Text style={s.sectionTitle}>오늘의 맞춤 번호</Text>
              <Text style={s.dim}>5세트</Text>
            </View>
            {sets.map((set, i) => (
              <View key={i} style={s.setCard}>
                <View style={s.setTagRow}>
                  <View style={s.setTag}><Text style={s.setTagText}>{set.tag}</Text></View>
                </View>
                <View style={s.setBalls}>
                  {set.numbers.map(n => <Ball key={n} num={n} size={34} />)}
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.editLink} onPress={startEdit}>
              <Ionicons name="create-outline" size={13} color={C.gray} />
              <Text style={s.editLinkText}>생년월일 변경</Text>
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              로또는 무작위 추첨입니다. 로또사주는 예측이 아닌 재미·참고용이에요. 🍀
            </Text>
          </>
        ) : null}

        <AdBanner />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 8 },
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 14, fontWeight: '800', color: C.black },
  cardSub: { fontSize: 11.5, color: C.gray, marginTop: 4 },
  birthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  birthInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 11, color: C.black, fontSize: 15, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  birthSep: { fontSize: 12, color: C.gray },
  saveBtn: { marginTop: 14, backgroundColor: C.accent, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  cancelBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 6 },
  cancelText: { fontSize: 12, color: C.gray },
  heroCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 20, paddingVertical: 22, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  heroLabel: { fontSize: 12, color: C.gray, fontWeight: '600' },
  heroScore: { fontSize: 58, fontWeight: '900', marginTop: 2, lineHeight: 64 },
  gradeBadge: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 999, marginTop: 2 },
  gradeText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  heroReason: { fontSize: 14, fontWeight: '700', color: C.black, marginTop: 14, textAlign: 'center' },
  heroReasonSub: { fontSize: 12, color: C.gray, marginTop: 5, textAlign: 'center' },
  whyToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF' },
  whyToggleText: { fontSize: 12, fontWeight: '700', color: C.accent },
  whyBox: { marginTop: 12, alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 13, borderWidth: 1, borderColor: C.border, gap: 8 },
  whyLine: { fontSize: 12, color: C.black, lineHeight: 18 },
  whyTag: { fontWeight: '800', color: C.accent },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 20, marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  dim: { fontSize: 10, color: C.gray },
  setCard: { marginHorizontal: 16, marginTop: 10, backgroundColor: C.card, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: C.border },
  setTagRow: { flexDirection: 'row', marginBottom: 9 },
  setTag: { backgroundColor: '#FFF3EE', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: '#F3D8CC' },
  setTagText: { fontSize: 10.5, fontWeight: '800', color: C.accent },
  setBalls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 18, paddingVertical: 8 },
  editLinkText: { fontSize: 12, color: C.gray, fontWeight: '600' },
  disclaimer: { fontSize: 10.5, color: C.gray, textAlign: 'center', marginTop: 10, marginHorizontal: 24, lineHeight: 15 },
});
