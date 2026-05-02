import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { buildTicket, deleteTicket, evaluateTicket, EvaluatedTicket, getSavedTickets, SavedTicket, saveTicket } from '../data/ticketStore';
import { Draw } from '../data/lottoData';
import { Ball } from './HomeContent';

const C = {
  bg: '#FFFFFF',
  card: '#F7F7F7',
  border: '#EEEEEE',
  black: '#1A1A1A',
  gray: '#999999',
  dim: '#CCCCCC',
  accent: '#D94F2A',
  win: '#137A4A',
  pending: '#B98000',
};

const GAME_LABELS = ['A', 'B', 'C', 'D', 'E'];
const EMPTY_GAMES = GAME_LABELS.map(() => ['', '', '', '', '', '']);

function getStatusLabel(ticket: EvaluatedTicket): string {
  if (ticket.status === 'pending') return '추첨전';
  return ticket.games.some(game => game.rank !== '낙첨') ? '당첨 확인' : '낙첨';
}

function statusColor(ticket: EvaluatedTicket): string {
  if (ticket.status === 'pending') return C.pending;
  return ticket.games.some(game => game.rank !== '낙첨') ? C.win : C.gray;
}

export default function MyTicketsContent({ draws }: { draws: Draw[] }) {
  const latest = draws[draws.length - 1];
  const [tickets, setTickets] = useState<SavedTicket[]>([]);
  const [drawNo, setDrawNo] = useState(String(latest ? latest.drwNo + 1 : 1));
  const [games, setGames] = useState<string[][]>(() => EMPTY_GAMES.map(game => [...game]));
  const refs = useRef<(TextInput | null)[]>([]);

  const evaluatedTickets = useMemo(
    () => tickets.map(ticket => evaluateTicket(ticket, draws)),
    [tickets, draws],
  );

  const loadTickets = useCallback(async () => {
    const saved = await getSavedTickets();
    setTickets(saved);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  function updateNum(gameIndex: number, numberIndex: number, value: string) {
    const next = games.map(game => [...game]);
    next[gameIndex][numberIndex] = value.replace(/[^0-9]/g, '');
    setGames(next);
    const flatIndex = gameIndex * 6 + numberIndex;
    if (next[gameIndex][numberIndex].length >= 2 && flatIndex < GAME_LABELS.length * 6 - 1) {
      refs.current[flatIndex + 1]?.focus();
    }
  }

  function resetForm() {
    setGames(EMPTY_GAMES.map(game => [...game]));
    setDrawNo(String(latest ? latest.drwNo + 1 : 1));
  }

  async function handleSave() {
    const targetDrawNo = parseInt(drawNo, 10);

    if (!Number.isInteger(targetDrawNo) || targetDrawNo < 1) return Alert.alert('오류', '회차를 입력하세요');

    const parsedGames: number[][] = [];
    for (let i = 0; i < games.length; i++) {
      const filled = games[i].filter(Boolean).length;
      if (filled === 0) continue;
      if (filled < 6) return Alert.alert('오류', `${GAME_LABELS[i]} 게임의 번호 6개를 모두 입력하세요`);

      const numbers = games[i].map(value => parseInt(value, 10));
      if (numbers.some(n => !Number.isInteger(n) || n < 1 || n > 45)) return Alert.alert('오류', '번호는 1~45 사이로 입력하세요');
      if (new Set(numbers).size !== 6) return Alert.alert('오류', `${GAME_LABELS[i]} 게임에 중복 번호가 있습니다`);
      parsedGames.push(numbers);
    }

    if (parsedGames.length === 0) return Alert.alert('오류', '저장할 번호를 입력하세요');

    const ticket = buildTicket(targetDrawNo, parsedGames);
    if (ticket.games.length === 0) return Alert.alert('오류', '번호를 다시 확인하세요');

    await saveTicket(ticket);
    resetForm();
    await loadTickets();
  }

  async function handleDelete(ticketId: string) {
    await deleteTicket(ticketId);
    await loadTickets();
  }

  return (
    <View style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
        <ScreenHeader title="내 번호" subtitle="구매 번호 등록 · 당첨 결과 확인" right={<HeaderInfo />} />

        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>수동 등록</Text>
            <TouchableOpacity style={s.qrButton} activeOpacity={0.75} onPress={() => Alert.alert('준비 중', '실제 QR 샘플을 확인한 뒤 스캐너를 연결할 예정입니다.')}>
              <Ionicons name="qr-code-outline" size={16} color={C.black} />
              <Text style={s.qrButtonText}>QR</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>회차</Text>
          <TextInput
            style={s.drawInput}
            value={drawNo}
            onChangeText={value => setDrawNo(value.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="1222"
            placeholderTextColor={C.gray}
          />

          <Text style={s.label}>구매 번호</Text>
          {games.map((game, gameIndex) => (
            <View key={GAME_LABELS[gameIndex]} style={s.manualGameRow}>
              <Text style={s.manualGameLabel}>{GAME_LABELS[gameIndex]}</Text>
              <View style={s.numRow}>
                {game.map((value, numberIndex) => {
                  const flatIndex = gameIndex * 6 + numberIndex;
                  return (
                    <TextInput
                      key={numberIndex}
                      ref={(element) => { refs.current[flatIndex] = element; }}
                      style={s.numInput}
                      value={value}
                      onChangeText={text => updateNum(gameIndex, numberIndex, text)}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder={`${numberIndex + 1}`}
                      placeholderTextColor={C.gray}
                    />
                  );
                })}
              </View>
            </View>
          ))}

          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={resetForm}>
              <Text style={s.btnSecondaryText}>초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleSave}>
              <Text style={s.btnPrimaryText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>

        {evaluatedTickets.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="ticket-outline" size={26} color={C.dim} />
            <Text style={s.emptyText}>저장된 번호가 없습니다</Text>
          </View>
        ) : (
          evaluatedTickets.map(ticket => (
            <View key={ticket.id} style={s.card}>
              <View style={s.ticketHead}>
                <View>
                  <Text style={s.cardTitle}>{ticket.drawNo}회</Text>
                  <Text style={s.ticketSub}>{ticket.source === 'qr' ? 'QR 등록' : '수동 등록'}</Text>
                </View>
                <View style={s.ticketActions}>
                  <View style={[s.statusBadge, { borderColor: statusColor(ticket) }]}>
                    <Text style={[s.statusText, { color: statusColor(ticket) }]}>{getStatusLabel(ticket)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => Alert.alert('삭제', `${ticket.drawNo}회 번호를 삭제할까요?`, [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: () => handleDelete(ticket.id) },
                  ])}>
                    <Ionicons name="trash-outline" size={18} color={C.gray} />
                  </TouchableOpacity>
                </View>
              </View>

              {ticket.draw && (
                <View style={s.drawInfo}>
                  <Text style={s.drawLabel}>당첨번호</Text>
                  <View style={s.drawBalls}>
                    {ticket.draw.numbers.map(number => <Ball key={number} num={number} size={26} />)}
                    <Text style={s.plus}>+</Text>
                    <Ball num={ticket.draw.bonus} size={26} />
                  </View>
                </View>
              )}

              {ticket.games.map((game, index) => (
                <View key={game.id} style={s.gameRow}>
                  <Text style={s.gameNo}>{String.fromCharCode(65 + index)}</Text>
                  <View style={s.ballsRow}>
                    {game.numbers.map(number => {
                      const isMatched = game.matchedNumbers.includes(number);
                      const isBonus = game.bonusMatched && ticket.draw?.bonus === number;
                      return (
                        <View key={number} style={[s.ballWrap, isMatched && s.matchWrap, isBonus && s.bonusWrap]}>
                          <Ball num={number} size={32} />
                        </View>
                      );
                    })}
                  </View>
                  <Text style={[s.rank, game.rank !== '낙첨' && game.rank !== '추첨전' && { color: C.win }]}>{game.rank}</Text>
                </View>
              ))}
            </View>
          ))
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
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.black },
  label: { fontSize: 11, color: C.gray, marginTop: 8, marginBottom: 6 },
  drawInput: { width: 90, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, color: C.black, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  manualGameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  manualGameLabel: { width: 14, fontSize: 11, fontWeight: '700', color: C.dim, textAlign: 'center' },
  numRow: { flex: 1, flexDirection: 'row', gap: 5 },
  numInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, color: C.black, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: C.black },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: C.black },
  qrButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  qrButtonText: { fontSize: 12, fontWeight: '700', color: C.black },
  empty: { marginTop: 40, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 12, color: C.gray },
  ticketHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ticketSub: { fontSize: 11, color: C.gray, marginTop: 3 },
  ticketActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  drawInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  drawLabel: { fontSize: 11, color: C.gray, marginBottom: 8 },
  drawBalls: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  plus: { color: C.dim, fontSize: 12 },
  gameRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
  gameNo: { fontSize: 11, fontWeight: '700', color: C.dim, width: 14 },
  ballsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ballWrap: { borderWidth: 2, borderColor: 'transparent', borderRadius: 18, padding: 1 },
  matchWrap: { borderColor: C.win },
  bonusWrap: { borderColor: C.pending },
  rank: { fontSize: 11, fontWeight: '700', color: C.gray, width: 38, textAlign: 'right' },
});
