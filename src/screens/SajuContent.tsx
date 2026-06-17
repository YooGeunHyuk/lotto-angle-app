import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import ScreenHeader from '../components/ScreenHeader';
import { Draw } from '../data/lottoData';
import { generateSajuNumbers, getDailyFortune } from '../services/saju';
import { Ball } from './HomeContent';

const PROFILE_KEY = 'saju_profile_v1';

type Gender = '남' | '여';
interface SajuProfile {
  name?: string;
  gender?: Gender;
  year: number;
  month: number;
  day: number;
  hour: number | null; // null = 모름
}

const C = {
  bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A',
  gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A',
  go: '#137A4A', mid: '#B98000', pass: '#8A8A8A',
};

function gradeColor(grade: string): string {
  return grade === 'GO' ? C.go : grade === '보통' ? C.mid : C.pass;
}

export default function SajuContent({ draws }: { draws: Draw[] }) {
  const [profile, setProfile] = useState<SajuProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  // 입력 상태
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [y, setY] = useState('');
  const [m, setM] = useState('');
  const [d, setD] = useState('');
  const [hour, setHour] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (raw) {
        try { setProfile(JSON.parse(raw)); } catch { /* ignore */ }
      }
      setLoaded(true);
    })();
  }, []);

  const today = useMemo(() => new Date(), []);
  const birthDate = useMemo(
    () => (profile ? new Date(profile.year, profile.month - 1, profile.day) : null),
    [profile],
  );
  const fortune = useMemo(
    () => (birthDate ? getDailyFortune(birthDate, today, profile?.hour) : null),
    [birthDate, today, profile],
  );
  const sets = useMemo(
    () => (birthDate ? generateSajuNumbers(birthDate, today, draws, profile?.hour) : []),
    [birthDate, today, draws, profile],
  );

  const saveProfile = useCallback(async () => {
    const yy = parseInt(y, 10), mm = parseInt(m, 10), dd = parseInt(d, 10);
    if (!yy || yy < 1920 || yy > today.getFullYear()) return;
    if (!mm || mm < 1 || mm > 12) return;
    if (!dd || dd < 1 || dd > 31) return;
    const hh = parseInt(hour, 10);
    const validHour = !unknownTime && Number.isInteger(hh) && hh >= 0 && hh <= 23 ? hh : null;
    const next: SajuProfile = {
      name: name.trim() || undefined,
      gender: gender ?? undefined,
      year: yy, month: mm, day: dd, hour: validHour,
    };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setProfile(next);
    setEditing(false);
  }, [name, gender, y, m, d, hour, unknownTime, today]);

  function startEdit() {
    if (profile) {
      setName(profile.name ?? '');
      setGender(profile.gender ?? null);
      setY(String(profile.year));
      setM(String(profile.month));
      setD(String(profile.day));
      setHour(profile.hour != null ? String(profile.hour) : '');
      setUnknownTime(profile.hour == null);
    }
    setEditing(true);
  }

  if (!loaded) return <View style={s.safe} />;

  const showInput = !profile || editing;

  return (
    <View style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <ScreenHeader title="로또사주" subtitle="오늘 내 기운 + 통계 한 스푼" />

        {showInput ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>내 정보 입력</Text>
            <Text style={s.cardSub}>한 번만 입력하면 매일 오늘의 로또운이 나와요</Text>

            <Text style={s.label}>이름 <Text style={s.opt}>(선택)</Text></Text>
            <TextInput style={s.textInput} value={name} onChangeText={setName} placeholder="홍길동" placeholderTextColor={C.dim} maxLength={10} />

            <Text style={s.label}>성별 <Text style={s.opt}>(선택)</Text></Text>
            <View style={s.genderRow}>
              {(['남', '여'] as Gender[]).map(g => (
                <TouchableOpacity key={g} style={[s.genderBtn, gender === g && s.genderBtnOn]} onPress={() => setGender(gender === g ? null : g)} activeOpacity={0.8}>
                  <Text style={[s.genderText, gender === g && s.genderTextOn]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>생년월일 <Text style={s.req}>(양력)</Text></Text>
            <View style={s.birthRow}>
              <TextInput style={[s.birthInput, { flex: 1.3 }]} value={y} onChangeText={t => setY(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={4} placeholder="1990" placeholderTextColor={C.dim} />
              <Text style={s.birthSep}>년</Text>
              <TextInput style={s.birthInput} value={m} onChangeText={t => setM(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="5" placeholderTextColor={C.dim} />
              <Text style={s.birthSep}>월</Text>
              <TextInput style={s.birthInput} value={d} onChangeText={t => setD(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="15" placeholderTextColor={C.dim} />
              <Text style={s.birthSep}>일</Text>
            </View>

            <Text style={s.label}>태어난 시간 <Text style={s.opt}>(선택 · 0~23시)</Text></Text>
            <View style={s.birthRow}>
              <TextInput
                style={[s.birthInput, { flex: 1 }, unknownTime && s.inputDisabled]}
                value={unknownTime ? '' : hour}
                onChangeText={t => setHour(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad" maxLength={2} placeholder="14" placeholderTextColor={C.dim}
                editable={!unknownTime}
              />
              <Text style={s.birthSep}>시</Text>
              <TouchableOpacity style={[s.unknownBtn, unknownTime && s.unknownBtnOn]} onPress={() => setUnknownTime(v => !v)} activeOpacity={0.8}>
                <Text style={[s.unknownText, unknownTime && s.unknownTextOn]}>시간 모름</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={saveProfile} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>오늘의 로또운 보기</Text>
            </TouchableOpacity>
            {profile && (
              <TouchableOpacity onPress={() => setEditing(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>취소</Text>
              </TouchableOpacity>
            )}

            <Text style={s.privacy}>🔒 입력 정보는 서버에 저장·수집되지 않고 이 기기에만 보관돼요.</Text>
          </View>
        ) : fortune ? (
          <>
            <View style={s.heroCard}>
              <Text style={s.heroLabel}>{profile?.name ? `${profile.name}님 오늘 로또운` : '오늘 내 로또운'}</Text>
              <Text style={[s.heroScore, { color: gradeColor(fortune.grade) }]}>{fortune.score}</Text>
              <View style={[s.gradeBadge, { backgroundColor: gradeColor(fortune.grade) }]}>
                <Text style={s.gradeText}>{fortune.grade}</Text>
              </View>
              <Text style={s.heroReason}>{fortune.todayElement} 기운의 날 · {fortune.relationLabel}</Text>
              <Text style={s.heroReasonSub}>행운수 {fortune.luckyDigit}로 끝나는 번호가 오늘 강세</Text>

              <TouchableOpacity style={s.whyToggle} onPress={() => setWhyOpen(v => !v)} activeOpacity={0.7}>
                <Text style={s.whyToggleText}>왜 이 점수인가요?</Text>
                <Ionicons name={whyOpen ? 'chevron-up' : 'chevron-down'} size={14} color={C.accent} />
              </TouchableOpacity>
              {whyOpen && (
                <View style={s.whyBox}>
                  <Text style={s.whyLine}>
                    <Text style={s.whyTag}>사주 </Text>
                    내 일간 {fortune.myStem}({fortune.myElement})
                    {fortune.hasTime ? ` · 시주 ${fortune.hourStem}(${fortune.hourElement})` : ''} × 오늘 {fortune.todayStem}({fortune.todayElement}) = {fortune.relationLabel}
                  </Text>
                  {!fortune.hasTime && (
                    <Text style={s.whyHint}>· 태어난 시간을 넣으면 시주까지 반영돼 더 정교해져요</Text>
                  )}
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
              <Text style={s.editLinkText}>내 정보 변경</Text>
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              로또는 무작위 추첨입니다. 로또사주는 예측이 아닌 재미·참고용이에요. 🍀{'\n'}
              🔒 입력 정보는 수집되지 않고 이 기기에만 저장돼요.
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
  label: { fontSize: 12, color: C.black, fontWeight: '700', marginTop: 16, marginBottom: 7 },
  opt: { fontSize: 11, color: C.gray, fontWeight: '500' },
  req: { fontSize: 11, color: C.accent, fontWeight: '600' },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, color: C.black, fontSize: 15, borderWidth: 1, borderColor: C.border },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF', alignItems: 'center' },
  genderBtnOn: { backgroundColor: C.black, borderColor: C.black },
  genderText: { fontSize: 14, fontWeight: '700', color: C.black },
  genderTextOn: { color: '#FFFFFF' },
  birthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  birthInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 11, color: C.black, fontSize: 15, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  inputDisabled: { backgroundColor: '#F0F0F0', color: C.dim },
  birthSep: { fontSize: 12, color: C.gray },
  unknownBtn: { paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF' },
  unknownBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  unknownText: { fontSize: 12, fontWeight: '700', color: C.gray },
  unknownTextOn: { color: '#FFFFFF' },
  saveBtn: { marginTop: 18, backgroundColor: C.accent, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  cancelBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 6 },
  cancelText: { fontSize: 12, color: C.gray },
  privacy: { fontSize: 10.5, color: C.gray, marginTop: 14, textAlign: 'center', lineHeight: 15 },
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
  whyHint: { fontSize: 11, color: C.gray, lineHeight: 16, marginTop: -2 },
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
