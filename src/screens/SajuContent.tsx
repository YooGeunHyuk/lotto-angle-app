import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import ScreenHeader from '../components/ScreenHeader';
import { Draw } from '../data/lottoData';
import { PENDING_GAMES_LIMIT } from '../data/ticketStore';
import { usePendingPicks } from '../hooks/usePendingPicks';
import { bestDayIndex, generateSajuNumbers, getWeekFortunes } from '../services/saju';
import { Ball } from './HomeContent';

const PROFILE_KEY = 'saju_profile_v1';

type Gender = '남' | '여';
interface SajuProfile {
  name?: string;
  gender?: Gender;
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
}

const C = {
  bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A',
  gray: '#999999', dim: '#CCCCCC', accent: '#D94F2A', logo: '#D94F2A',
  go: '#137A4A', mid: '#B98000', pass: '#8A8A8A',
};

function gradeColor(grade: string): string {
  return grade === 'GO' ? C.go : grade === '보통' ? C.mid : C.pass;
}

export default function SajuContent({
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

  const [profile, setProfile] = useState<SajuProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // 입력 상태
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [y, setY] = useState('');
  const [m, setM] = useState('');
  const [d, setD] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState<0 | 30>(0);
  const [unknownTime, setUnknownTime] = useState(false);

  const { pending, isSelected, toggleSelect } = usePendingPicks();
  const pulse = useRef(new Animated.Value(0.55)).current;

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
  const weekDays = useMemo(
    () => (birthDate ? getWeekFortunes(birthDate, today, profile?.hour, profile?.minute) : []),
    [birthDate, today, profile],
  );
  const bestIdx = useMemo(() => (weekDays.length ? bestDayIndex(weekDays) : 0), [weekDays]);

  // 프로필 바뀌면 베스트 날을 기본 선택
  useEffect(() => { if (weekDays.length) setSelectedIdx(bestIdx); }, [bestIdx, weekDays.length]);

  const selected = weekDays[selectedIdx];
  const sets = useMemo(
    () => (birthDate && selected ? generateSajuNumbers(birthDate, selected.date, draws, profile?.hour, profile?.minute) : []),
    [birthDate, selected, draws, profile],
  );

  // 로딩 연출 펄스
  useEffect(() => {
    if (!revealing) return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 550, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [revealing, pulse]);

  const saveProfile = useCallback(async () => {
    const yy = parseInt(y, 10), mm = parseInt(m, 10), dd = parseInt(d, 10);
    if (!yy || yy < 1920 || yy > today.getFullYear()) return;
    if (!mm || mm < 1 || mm > 12) return;
    if (!dd || dd < 1 || dd > 31) return;
    const hh = parseInt(hour, 10);
    const hasHour = !unknownTime && Number.isInteger(hh) && hh >= 0 && hh <= 23;
    const next: SajuProfile = {
      name: name.trim() || undefined,
      gender: gender ?? undefined,
      year: yy, month: mm, day: dd,
      hour: hasHour ? hh : null,
      minute: hasHour ? minute : null,
    };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setEditing(false);
    setRevealing(true);
    setProfile(next);
    setTimeout(() => setRevealing(false), 1400);
  }, [name, gender, y, m, d, hour, minute, unknownTime, today]);

  function startEdit() {
    if (profile) {
      setName(profile.name ?? '');
      setGender(profile.gender ?? null);
      setY(String(profile.year));
      setM(String(profile.month));
      setD(String(profile.day));
      setHour(profile.hour != null ? String(profile.hour) : '');
      setMinute((profile.minute === 30 ? 30 : 0));
      setUnknownTime(profile.hour == null);
    }
    setEditing(true);
  }

  const toggleSelectSet = useCallback(async (numbers: number[]) => {
    const res = await toggleSelect(numbers, nextDrwNo);
    if (!res) return;
    if (res.type === 'committed') {
      onTicketSaved?.();
      Alert.alert('내 번호 시트 완성! 🎯', `5개 번호가 모여서 ${nextDrwNo}회차 내 번호로 저장되었습니다.`, [
        { text: '확인' }, { text: '내 번호 보기', onPress: onOpenTickets },
      ]);
    } else if (res.type === 'full') {
      Alert.alert('가득 찼어요', '5개가 모이면 자동으로 시트로 저장됩니다.');
    }
  }, [nextDrwNo, onOpenTickets, onTicketSaved, toggleSelect]);

  if (!loaded) return <View style={s.safe} />;

  const showInput = !profile || editing;

  // 로딩 연출
  if (revealing && profile) {
    return (
      <View style={s.safe}>
        <ScreenHeader title="로또사주" subtitle="오늘 내 기운 + 통계 한 스푼" />
        <View style={s.loadingWrap}>
          <Animated.Text style={[s.loadingEmoji, { opacity: pulse, transform: [{ scale: pulse }] }]}>🔮</Animated.Text>
          <Text style={s.loadingText}>{profile.name ? `${profile.name}님의` : '당신의'} 기운을 읽는 중…</Text>
          <Text style={s.loadingSub}>사주 × 통계로 이번 주 운을 계산하고 있어요</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <ScreenHeader
          title="로또사주"
          subtitle="오늘 내 기운 + 통계 한 스푼"
          right={!showInput ? (
            <TouchableOpacity style={s.editTopBtn} onPress={startEdit} activeOpacity={0.75}>
              <Ionicons name="create-outline" size={13} color={C.black} />
              <Text style={s.editTopText}>내 정보</Text>
            </TouchableOpacity>
          ) : undefined}
        />

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

            <Text style={s.label}>태어난 시간 <Text style={s.opt}>(선택 · 30분 단위)</Text></Text>
            <View style={s.birthRow}>
              <TextInput
                style={[s.birthInput, { flex: 1 }, unknownTime && s.inputDisabled]}
                value={unknownTime ? '' : hour}
                onChangeText={t => setHour(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad" maxLength={2} placeholder="14" placeholderTextColor={C.dim} editable={!unknownTime}
              />
              <Text style={s.birthSep}>시</Text>
              <View style={[s.minSeg, unknownTime && { opacity: 0.4 }]}>
                {([0, 30] as const).map(mm => (
                  <TouchableOpacity key={mm} disabled={unknownTime} style={[s.minBtn, minute === mm && s.minBtnOn]} onPress={() => setMinute(mm)} activeOpacity={0.8}>
                    <Text style={[s.minText, minute === mm && s.minTextOn]}>{mm === 0 ? '00' : '30'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.birthSep}>분</Text>
              <TouchableOpacity style={[s.unknownBtn, unknownTime && s.unknownBtnOn]} onPress={() => setUnknownTime(v => !v)} activeOpacity={0.8}>
                <Text style={[s.unknownText, unknownTime && s.unknownTextOn]}>모름</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={saveProfile} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>이번 주 로또운 보기</Text>
            </TouchableOpacity>
            {profile && (
              <TouchableOpacity onPress={() => setEditing(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>취소</Text>
              </TouchableOpacity>
            )}
            <Text style={s.privacy}>🔒 입력 정보는 서버에 저장·수집되지 않고 이 기기에만 보관돼요.</Text>
          </View>
        ) : selected ? (
          <>
            {/* 주간 점수 스트립 */}
            <View style={s.weekCard}>
              <Text style={s.weekTitle}>이번 주 로또운</Text>
              <View style={s.weekRow}>
                {weekDays.map((day, i) => {
                  const isBest = i === bestIdx;
                  const isSel = i === selectedIdx;
                  return (
                    <TouchableOpacity key={i} style={[s.dayCell, isSel && s.dayCellSel]} onPress={() => setSelectedIdx(i)} activeOpacity={0.7}>
                      <Text style={[s.dayLabel, day.isToday && s.dayToday]}>{day.label}</Text>
                      <Text style={[s.dayScore, { color: gradeColor(day.fortune.grade) }]}>{day.fortune.score}</Text>
                      <Text style={s.dayCrown}>{isBest ? '👑' : ' '}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 선택한 날 히어로 */}
            <View style={s.heroCard}>
              <Text style={s.heroLabel}>
                {selectedIdx === bestIdx ? '👑 이번 주 가장 좋은 날' : `${selected.label}요일`}
                {profile?.name ? ` · ${profile.name}님` : ''}
              </Text>
              <Text style={[s.heroScore, { color: gradeColor(selected.fortune.grade) }]}>{selected.fortune.score}</Text>
              <View style={[s.gradeBadge, { backgroundColor: gradeColor(selected.fortune.grade) }]}>
                <Text style={s.gradeText}>{selected.fortune.grade}</Text>
              </View>
              <Text style={s.heroReason}>{selected.fortune.todayElement} 기운의 날 · {selected.fortune.relationLabel}</Text>
              <Text style={s.heroReasonSub}>행운수 {selected.fortune.luckyDigit}로 끝나는 번호가 강세</Text>

              <TouchableOpacity style={s.whyToggle} onPress={() => setWhyOpen(v => !v)} activeOpacity={0.7}>
                <Text style={s.whyToggleText}>왜 이 점수인가요?</Text>
                <Ionicons name={whyOpen ? 'chevron-up' : 'chevron-down'} size={14} color={C.accent} />
              </TouchableOpacity>
              {whyOpen && (
                <View style={s.whyBox}>
                  <Text style={s.whyLine}>
                    <Text style={s.whyTag}>사주 </Text>
                    내 일간 {selected.fortune.myStem}({selected.fortune.myElement})
                    {selected.fortune.hasTime ? ` · 시주 ${selected.fortune.hourStem}(${selected.fortune.hourElement})` : ''} × {selected.fortune.todayStem}({selected.fortune.todayElement}) = {selected.fortune.relationLabel}
                  </Text>
                  {!selected.fortune.hasTime && <Text style={s.whyHint}>· 태어난 시간을 넣으면 시주까지 반영돼 더 정교해져요</Text>}
                  <Text style={s.whyLine}><Text style={s.whyTag}>통계 </Text>앙상블 추천엔진 점수 + 행운수 가중으로 번호 생성</Text>
                </View>
              )}
            </View>

            {/* 맞춤 번호 — 추천 레이아웃 + 별표 */}
            <View style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{selected.label}요일 맞춤 번호 · {sets.length}세트</Text>
              </View>
              <Text style={s.pickHint}>☆를 눌러 마음에 드는 세트를 모으세요. {pending.length}/{PENDING_GAMES_LIMIT}개 모이면 내 번호로 자동 저장돼요.</Text>
              {sets.map((set, i) => {
                const sel = isSelected(set.numbers);
                return (
                  <TouchableOpacity key={i} style={s.setRow} activeOpacity={0.6} onPress={() => toggleSelectSet(set.numbers)}>
                    <View style={s.setLabelCol}>
                      <Text style={s.setNo}>{i + 1}</Text>
                      <Text style={s.strategyBadge}>{set.tag}</Text>
                    </View>
                    <View style={s.ballsRow}>
                      {set.numbers.map(n => <Ball key={n} num={n} size={34} />)}
                    </View>
                    <Text style={s.sum}>{set.numbers.reduce((a, b) => a + b, 0)}</Text>
                    <Ionicons name={sel ? 'star' : 'star-outline'} size={18} color={sel ? C.logo : C.dim} style={s.starIcon} />
                  </TouchableOpacity>
                );
              })}
            </View>

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
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80, gap: 10 },
  loadingEmoji: { fontSize: 66 },
  loadingText: { fontSize: 16, fontWeight: '800', color: C.black, marginTop: 10 },
  loadingSub: { fontSize: 12, color: C.gray },
  editTopBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  editTopText: { fontSize: 12, fontWeight: '700', color: C.black },
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  cardSub: { fontSize: 11.5, color: C.gray, marginTop: 4 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
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
  minSeg: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 2, gap: 2 },
  minBtn: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: 8 },
  minBtnOn: { backgroundColor: C.black },
  minText: { fontSize: 13, fontWeight: '700', color: C.gray },
  minTextOn: { color: '#FFFFFF' },
  unknownBtn: { paddingHorizontal: 10, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF' },
  unknownBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  unknownText: { fontSize: 12, fontWeight: '700', color: C.gray },
  unknownTextOn: { color: '#FFFFFF' },
  saveBtn: { marginTop: 18, backgroundColor: C.accent, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  cancelBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 6 },
  cancelText: { fontSize: 12, color: C.gray },
  privacy: { fontSize: 10.5, color: C.gray, marginTop: 14, textAlign: 'center', lineHeight: 15 },
  weekCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.border },
  weekTitle: { fontSize: 12, fontWeight: '800', color: C.black, marginBottom: 10, marginLeft: 2 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', backgroundColor: '#FFFFFF' },
  dayCellSel: { borderColor: C.accent, backgroundColor: '#FFF3EE' },
  dayLabel: { fontSize: 11, fontWeight: '700', color: C.gray },
  dayToday: { color: C.accent },
  dayScore: { fontSize: 16, fontWeight: '900', marginTop: 3 },
  dayCrown: { fontSize: 11, marginTop: 1, lineHeight: 14 },
  heroCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 20, paddingVertical: 22, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  heroLabel: { fontSize: 12, color: C.gray, fontWeight: '700' },
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
  pickHint: { fontSize: 11, color: C.gray, lineHeight: 16, marginBottom: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
  setLabelCol: { width: 56, alignItems: 'flex-start' },
  setNo: { fontSize: 11, fontWeight: '700', color: C.dim },
  strategyBadge: { fontSize: 9, fontWeight: '700', color: C.logo, marginTop: 2 },
  ballsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  sum: { fontSize: 11, color: C.gray, width: 28, textAlign: 'right' },
  starIcon: { marginLeft: 4 },
  disclaimer: { fontSize: 10.5, color: C.gray, textAlign: 'center', marginTop: 14, marginHorizontal: 24, lineHeight: 15 },
});
