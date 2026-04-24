import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import ScreenHeader from '../components/ScreenHeader';
import { deleteUserDraw, getUserDraws, saveUserDraw } from '../data/drawStore';
import { Draw } from '../data/lottoData';
import { Ball } from './HomeContent';

const C = { bg: '#FFFFFF', card: '#F7F7F7', border: '#EEEEEE', black: '#1A1A1A', gray: '#999999', red: '#D94F2A' };

function drwNoToDate(no: number): string {
  const base = new Date('2002-12-07');
  base.setDate(base.getDate() + (no - 1) * 7);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function AddDrawContent({ draws, onDrawsChanged }: { draws: Draw[]; onDrawsChanged: () => void }) {
  const latest = draws[draws.length - 1];
  const nextNo = latest ? latest.drwNo + 1 : 1;
  const nextDate = drwNoToDate(nextNo);

  const [userDraws, setUserDraws] = useState<Draw[]>([]);
  const [drwNo, setDrwNo] = useState(String(nextNo));
  const [date, setDate] = useState(nextDate);
  const [nums, setNums] = useState(['', '', '', '', '', '']);
  const [bonus, setBonus] = useState('');
  const [editing, setEditing] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) return;
    setDrwNo(String(nextNo));
    setDate(nextDate);
  }, [nextNo, nextDate, editing]);

  function startEdit(d: Draw) {
    setEditing(true);
    setDrwNo(String(d.drwNo));
    setDate(d.drwNoDate);
    setNums(d.numbers.map(n => String(n)));
    setBonus(String(d.bonus));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function cancelEdit() {
    setEditing(false);
    setDrwNo(String(nextNo));
    setDate(nextDate);
    setNums(['', '', '', '', '', '']);
    setBonus('');
  }

  async function load() {
    const draws = await getUserDraws();
    setUserDraws(draws.slice().reverse());
  }

  function handleDrwNoChange(v: string) {
    setDrwNo(v);
    const no = parseInt(v);
    setDate(!isNaN(no) && no >= 1 ? drwNoToDate(no) : '');
  }

  async function handleSave() {
    const no = parseInt(drwNo);
    const numbers = nums.map(n => parseInt(n));
    const bn = parseInt(bonus);
    if (!no || no < 1) return Alert.alert('오류', '회차 번호를 입력하세요');
    if (numbers.some(n => isNaN(n) || n < 1 || n > 45)) return Alert.alert('오류', '번호는 1~45 사이');
    if (new Set(numbers).size !== 6) return Alert.alert('오류', '6개 번호가 모두 달라야 합니다');
    if (isNaN(bn) || bn < 1 || bn > 45) return Alert.alert('오류', '보너스 번호 확인');
    if (numbers.includes(bn)) return Alert.alert('오류', '보너스가 당첨 번호와 겹칩니다');

    await saveUserDraw({ drwNo: no, drwNoDate: date, numbers: numbers.sort((a, b) => a - b), bonus: bn });
    setEditing(false);
    setNums(['', '', '', '', '', '']); setBonus('');
    await load();
    onDrawsChanged();
  }

  function updateNum(i: number, v: string) {
    const next = [...nums]; next[i] = v; setNums(next);
    if (v.length >= 2) refs.current[i + 1]?.focus();
  }

  return (
    <View style={s.safe}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
      <ScreenHeader
        title="번호 입력"
        subtitle={editing ? `${drwNo}회 수정 중` : '당첨 번호 추가 · 분석에 자동 반영'}
      />

      <View style={[s.card, editing && { borderColor: C.red, borderWidth: 1.5 }]}>
        <View style={s.row}>
          <View style={s.inputWrap}>
            <Text style={s.inputLabel}>회차</Text>
            <TextInput style={s.input} value={drwNo} onChangeText={handleDrwNoChange} keyboardType="number-pad" placeholder="1011" placeholderTextColor={C.gray} returnKeyType="next" onSubmitEditing={() => refs.current[0]?.focus()} />
          </View>
          <View style={[s.inputWrap, { flex: 2 }]}>
            <Text style={s.inputLabel}>날짜 (자동)</Text>
            <View style={[s.input, { justifyContent: 'center' }]}>
              <Text style={{ color: date ? C.black : C.gray, fontSize: 14 }}>{date || '회차 입력 시 자동'}</Text>
            </View>
          </View>
        </View>

        <Text style={s.inputLabel}>당첨 번호 6개</Text>
        <View style={s.numRow}>
          {nums.map((v, i) => (
            <TextInput key={i} ref={(el) => { refs.current[i] = el; }} style={s.numInput} value={v}
              onChangeText={t => updateNum(i, t)} keyboardType="number-pad" maxLength={2}
              placeholder={`${i + 1}`} placeholderTextColor={C.gray}
              returnKeyType={i < 5 ? 'next' : 'done'}
              onSubmitEditing={() => i < 5 ? refs.current[i + 1]?.focus() : refs.current[6]?.focus()} />
          ))}
        </View>

        <Text style={s.inputLabel}>보너스 번호</Text>
        <View style={s.numRow}>
          <TextInput ref={(el) => { refs.current[6] = el; }} style={[s.numInput, { flex: 0, width: 52 }]} value={bonus}
            onChangeText={setBonus} keyboardType="number-pad" maxLength={2} placeholder="+" placeholderTextColor={C.gray} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {editing && (
            <TouchableOpacity style={[s.saveBtn, { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border }]} onPress={cancelEdit}>
              <Text style={[s.saveBtnText, { color: C.black }]}>취소</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.saveBtn, { flex: 1, marginTop: 0 }]} onPress={handleSave}>
            <Text style={s.saveBtnText}>{editing ? '수정 저장' : '저장'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {userDraws.length > 0 && (
        <View style={[s.card]}>
          <Text style={s.cardTitle}>입력된 회차 ({userDraws.length}개)</Text>
          {userDraws.map(item => (
            <View key={item.drwNo} style={s.drawRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.drawNo}>{item.drwNo}회 · {item.drwNoDate}</Text>
                <View style={s.row}>
                  {item.numbers.map((n, i) => <Ball key={i} num={n} size={26} />)}
                  <Text style={{ color: C.gray, fontSize: 12 }}>+</Text>
                  <Ball num={item.bonus} size={26} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => startEdit(item)}>
                  <Text style={s.edit}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('삭제', `${item.drwNo}회차를 삭제할까요?`, [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: async () => { await deleteUserDraw(item.drwNo); await load(); onDrawsChanged(); } },
                ])}>
                  <Text style={s.del}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

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
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inputWrap: { flex: 1, gap: 4 },
  inputLabel: { fontSize: 11, color: C.gray, marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 11, color: C.black, fontSize: 14, borderWidth: 1, borderColor: C.border },
  numRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  numInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, color: C.black, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  saveBtn: { backgroundColor: C.black, borderRadius: 12, padding: 13, marginTop: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  drawRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  drawNo: { fontSize: 11, color: C.gray, marginBottom: 6 },
  edit: { fontSize: 12, color: C.black, fontWeight: '600' },
  del: { fontSize: 12, color: C.red },
});
