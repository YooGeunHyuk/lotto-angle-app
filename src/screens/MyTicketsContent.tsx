import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdBanner from '../components/AdBanner';
import HeaderInfo from '../components/HeaderInfo';
import ScreenHeader from '../components/ScreenHeader';
import { parseLottoQr } from '../data/lottoQr';
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

function formatSavedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}.${month}.${day}`;
}

function getDrawStateLabel(ticket: EvaluatedTicket): string {
  return ticket.status === 'pending' ? '추첨전' : '추첨 완료';
}

function getResultSummary(ticket: EvaluatedTicket): string {
  if (ticket.status === 'pending') return '-';

  const rankOrder = ['1등', '2등', '3등', '4등', '5등'] as const;
  const bestRank = rankOrder.find(rank => ticket.games.some(game => game.rank === rank));
  return bestRank ?? '0등';
}

function statusColor(ticket: EvaluatedTicket): string {
  if (ticket.status === 'pending') return C.pending;
  return ticket.games.some(game => game.rank !== '낙첨') ? C.win : C.gray;
}

export default function MyTicketsContent({ draws, refreshKey = 0 }: { draws: Draw[]; refreshKey?: number }) {
  const latest = draws[draws.length - 1];
  const [tickets, setTickets] = useState<SavedTicket[]>([]);
  const [drawNo, setDrawNo] = useState(String(latest ? latest.drwNo + 1 : 1));
  const [games, setGames] = useState<string[][]>(() => EMPTY_GAMES.map(game => [...game]));
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [scanRawText, setScanRawText] = useState('');
  const [expandedTicketIds, setExpandedTicketIds] = useState<Set<string>>(() => new Set());
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
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
  }, [loadTickets, refreshKey]);

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
    setExpandedTicketIds(prev => {
      const next = new Set(prev);
      next.delete(ticketId);
      return next;
    });
    await loadTickets();
  }

  function toggleTicket(ticketId: string) {
    setExpandedTicketIds(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  }

  async function openScanner() {
    setScanRawText('');
    setScanLocked(false);

    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (permission.granted) {
      setScannerOpen(true);
      return;
    }

    Alert.alert(
      '카메라 권한 필요',
      '로또 QR을 스캔하려면 카메라 권한을 허용해야 합니다.',
      [
        { text: '취소', style: 'cancel' },
        ...(permission.canAskAgain ? [{ text: '다시 요청', onPress: openScanner }] : [{ text: '설정 열기', onPress: () => Linking.openSettings() }]),
      ],
    );
  }

  function closeScanner() {
    setScannerOpen(false);
    setScanLocked(false);
  }

  async function saveQrText(rawText: string, successTitle = 'QR 등록 완료') {
    const parsed = parseLottoQr(rawText);
    if (!parsed) return false;

    const ticket = buildTicket(parsed.drawNo, parsed.games, 'qr', parsed.rawText);
    await saveTicket(ticket);
    await loadTickets();
    setScannerOpen(false);
    setScanRawText('');
    Alert.alert(successTitle, `${parsed.drawNo}회 ${parsed.games.length}게임을 저장했습니다.`);
    return true;
  }

  async function handleQrScanned(result: BarcodeScanningResult) {
    if (scanLocked) return;
    setScanLocked(true);

    const rawText = result.raw ?? result.data ?? '';
    const saved = await saveQrText(rawText);
    if (!saved) {
      setScanRawText(rawText);
    }
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
            <View>
              <Text style={s.cardTitle}>구매 번호 등록</Text>
              <Text style={s.cardSub}>다음 회차 {latest ? latest.drwNo + 1 : '-'}회</Text>
            </View>
            <TouchableOpacity style={s.qrButton} activeOpacity={0.75} onPress={openScanner}>
              <Ionicons name="qr-code-outline" size={16} color={C.black} />
              <Text style={s.qrButtonText}>QR 스캔</Text>
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

        <View style={s.listHead}>
          <Text style={s.sectionTitle}>저장한 번호</Text>
          <Text style={s.dim}>{evaluatedTickets.length}장</Text>
        </View>

        {evaluatedTickets.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="ticket-outline" size={26} color={C.dim} />
            <Text style={s.emptyText}>저장된 번호가 없습니다</Text>
          </View>
        ) : (
          evaluatedTickets.map(ticket => {
            const isExpanded = expandedTicketIds.has(ticket.id);

            return (
              <View key={ticket.id} style={[s.card, !isExpanded && s.ticketCardCollapsed]}>
                <View style={s.ticketHead}>
                  <View style={s.ticketMetaRow}>
                    <Text style={s.ticketTitle}>{ticket.drawNo}회</Text>
                    <View style={[s.statusBadge, { borderColor: statusColor(ticket) }]}>
                      <Text style={[s.statusText, { color: statusColor(ticket) }]}>({getDrawStateLabel(ticket)})</Text>
                    </View>
                    <View style={[s.resultBadge, ticket.status === 'settled' && getResultSummary(ticket) !== '0등' && s.resultBadgeWin]}>
                      <Text style={[s.resultText, ticket.status === 'settled' && getResultSummary(ticket) !== '0등' && s.resultTextWin]}>({getResultSummary(ticket)})</Text>
                    </View>
                  </View>

                  <View style={s.ticketActions}>
                    <TouchableOpacity onPress={() => Alert.alert('삭제', `${ticket.drawNo}회 번호를 삭제할까요?`, [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => handleDelete(ticket.id) },
                    ])}>
                      <Ionicons name="trash-outline" size={18} color={C.gray} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.ticketToggle, isExpanded && s.ticketToggleActive]}
                      activeOpacity={0.75}
                      onPress={() => toggleTicket(ticket.id)}
                    >
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color={isExpanded ? '#FFFFFF' : C.black} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.ticketSummaryRow}>
                  <View style={s.sourceChip}>
                    <Ionicons name={ticket.source === 'qr' ? 'qr-code-outline' : 'create-outline'} size={11} color={C.gray} />
                    <Text style={s.sourceChipText}>{ticket.source === 'qr' ? 'QR' : '수동'}</Text>
                  </View>
                  <Text style={s.ticketSub}>{ticket.games.length}게임 · {formatSavedDate(ticket.createdAt)}</Text>
                </View>

                {isExpanded && ticket.draw && (
                  <View style={s.drawInfo}>
                    <Text style={s.drawLabel}>당첨번호</Text>
                    <View style={s.drawBalls}>
                      {ticket.draw.numbers.map(number => <Ball key={number} num={number} size={26} />)}
                      <Text style={s.plus}>+</Text>
                      <Ball num={ticket.draw.bonus} size={26} />
                    </View>
                  </View>
                )}

                {isExpanded && ticket.games.map((game, index) => (
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
            );
          })
        )}

        <AdBanner />
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={closeScanner}>
        <View style={s.scannerRoot}>
          <CameraView
            style={s.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanLocked ? undefined : handleQrScanned}
          />
          <View style={s.scannerOverlay} pointerEvents="box-none">
            <View style={s.scannerTop}>
              <TouchableOpacity style={s.scannerIconBtn} onPress={closeScanner} activeOpacity={0.78}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.scannerTitle}>로또 QR 스캔</Text>
              <TouchableOpacity style={s.scannerIconBtn} onPress={() => setScanLocked(false)} activeOpacity={0.78}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={s.scanFrame}>
              <View style={[s.corner, s.cornerTopLeft]} />
              <View style={[s.corner, s.cornerTopRight]} />
              <View style={[s.corner, s.cornerBottomLeft]} />
              <View style={[s.corner, s.cornerBottomRight]} />
            </View>

            <View style={s.scannerBottom}>
              {scanRawText ? (
                <View style={s.scanResultCard}>
                  <Text style={s.scanResultTitle}>QR은 읽었지만 번호 형식을 확인하지 못했습니다</Text>
                  <Text selectable style={s.scanRawText} numberOfLines={3}>{scanRawText}</Text>
                  <TouchableOpacity style={s.scanRetryBtn} onPress={() => { setScanRawText(''); setScanLocked(false); }} activeOpacity={0.78}>
                    <Text style={s.scanRetryText}>다시 스캔</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={s.scannerHelp}>종이 로또 하단 QR을 사각형 안에 맞춰주세요</Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 8 },
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.black },
  cardSub: { fontSize: 10.5, color: C.gray, marginTop: 3 },
  label: { fontSize: 11, color: C.gray, marginTop: 8, marginBottom: 6 },
  drawInput: { width: 90, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, color: C.black, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  manualGameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  manualGameLabel: { width: 14, fontSize: 11, fontWeight: '700', color: C.dim, textAlign: 'center' },
  numRow: { flex: 1, flexDirection: 'row', gap: 5 },
  numInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, color: C.black, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  btnPrimary: { backgroundColor: C.black },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: C.black },
  qrButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  qrButtonText: { fontSize: 12, fontWeight: '700', color: C.black },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16, marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  dim: { fontSize: 10, color: C.gray },
  empty: { marginTop: 40, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 12, color: C.gray },
  ticketCardCollapsed: { paddingVertical: 14 },
  ticketHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ticketTitle: { fontSize: 14, fontWeight: '800', color: C.black },
  ticketMetaRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  sourceChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3 },
  sourceChipText: { fontSize: 10, fontWeight: '800', color: C.gray },
  ticketSub: { fontSize: 11, color: C.gray, marginTop: 3 },
  ticketActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  resultBadge: { borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  resultBadgeWin: { borderColor: C.win },
  resultText: { fontSize: 11, fontWeight: '700', color: C.gray },
  resultTextWin: { color: C.win },
  ticketToggle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  ticketToggleActive: { backgroundColor: C.black, borderColor: C.black },
  ticketSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
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
  scannerRoot: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  scannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 54 },
  scannerIconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  scannerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  scanFrame: { alignSelf: 'center', width: 248, height: 248, marginTop: 76 },
  corner: { position: 'absolute', width: 38, height: 38, borderColor: '#FFFFFF' },
  cornerTopLeft: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 18 },
  cornerTopRight: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 18 },
  cornerBottomLeft: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 18 },
  cornerBottomRight: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 18 },
  scannerBottom: { paddingHorizontal: 18, paddingBottom: 48 },
  scannerHelp: { alignSelf: 'center', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  scanResultCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14 },
  scanResultTitle: { fontSize: 13, fontWeight: '800', color: C.black },
  scanRawText: { marginTop: 8, fontSize: 11, lineHeight: 16, color: C.gray },
  scanRetryBtn: { marginTop: 12, alignItems: 'center', backgroundColor: C.black, borderRadius: 999, paddingVertical: 11 },
  scanRetryText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
