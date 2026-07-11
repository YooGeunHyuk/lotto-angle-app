import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SettingsSheet from '@/src/components/SettingsSheet';
import { showAlert } from '@/src/lib/dialog';
import { getBook, loadBookText, updateReadingPosition } from '@/src/lib/library';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/src/lib/settings';
import { READER_THEMES } from '@/src/lib/theme';
import {
  buildSentences,
  firstSentenceIndexByPara,
  splitParagraphs,
} from '@/src/lib/textUtils';
import { Book, ReaderSettings } from '@/src/lib/types';

/** 빠른 속도 전환 버튼이 순환하는 배속 목록 */
const QUICK_RATES = [0.8, 1.0, 1.25, 1.5, 2.0];

interface ParagraphProps {
  text: string;
  index: number;
  active: boolean;
  fontSize: number;
  lineHeightMult: number;
  color: string;
  highlightColor: string;
  onPress: () => void;
  onLongPress: (index: number) => void;
}

const Paragraph = memo(function Paragraph({
  text,
  index,
  active,
  fontSize,
  lineHeightMult,
  color,
  highlightColor,
  onPress,
  onLongPress,
}: ParagraphProps) {
  return (
    <Pressable onPress={onPress} onLongPress={() => onLongPress(index)}>
      <Text
        style={{
          fontSize,
          lineHeight: Math.round(fontSize * lineHeightMult),
          color,
          backgroundColor: active ? highlightColor : 'transparent',
          paddingHorizontal: 20,
          marginBottom: Math.round(fontSize * 0.7),
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
});

export default function ViewerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [book, setBook] = useState<Book | null>(null);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activePara, setActivePara] = useState<number | null>(null);
  const [currentPara, setCurrentPara] = useState(0);

  const listRef = useRef<FlatList<string>>(null);
  const bookRef = useRef<Book | null>(null);
  const encodingRef = useRef<string | undefined>(undefined);
  const settingsRef = useRef(settings);
  const paraCountRef = useRef(0);
  /** 현재 읽던 위치(문단 인덱스). 스크롤 또는 TTS 진행에 따라 갱신 */
  const currentIndexRef = useRef(0);
  const initialIndexRef = useRef(0);
  const restoredRef = useRef(false);

  // TTS 상태 (콜백 체인에서 stale closure를 피하기 위해 ref로 관리)
  const speakingRef = useRef(false);
  const pausedRef = useRef(false);
  const sentenceIdxRef = useRef(0);
  const utteranceTokenRef = useRef(0);
  const ttsErrorCountRef = useRef(0);

  const sentences = useMemo(() => buildSentences(paragraphs), [paragraphs]);
  const paraToSentence = useMemo(
    () => firstSentenceIndexByPara(sentences, paragraphs.length),
    [sentences, paragraphs.length],
  );
  const sentencesRef = useRef(sentences);
  const paraToSentenceRef = useRef(paraToSentence);
  useEffect(() => {
    sentencesRef.current = sentences;
    paraToSentenceRef.current = paraToSentence;
  }, [sentences, paraToSentence]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const colors = READER_THEMES[settings.theme];

  // 읽는 동안 화면 꺼짐 방지 (웹은 Wake Lock 권한이 거부될 수 있어 조용히 무시)
  useEffect(() => {
    activateKeepAwakeAsync().catch(() => {});
    return () => {
      Promise.resolve(deactivateKeepAwake()).catch(() => {});
    };
  }, []);

  // ---------- 로딩 ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedSettings, loadedBook] = await Promise.all([
          loadSettings(),
          getBook(String(id)),
        ]);
        if (cancelled) return;
        setSettings(loadedSettings);
        if (!loadedBook) {
          showAlert('오류', '책을 찾을 수 없습니다.', () => router.back());
          return;
        }
        bookRef.current = loadedBook;
        setBook(loadedBook);
        initialIndexRef.current = loadedBook.paraIndex ?? 0;
        currentIndexRef.current = loadedBook.paraIndex ?? 0;

        const { text, encoding } = await loadBookText(loadedBook);
        if (cancelled) return;
        encodingRef.current = encoding;
        const paras = splitParagraphs(text);
        paraCountRef.current = paras.length;
        setParagraphs(paras);
        setLoading(false);
      } catch (e) {
        console.warn(e);
        if (!cancelled) {
          showAlert('오류', '파일을 여는 중 문제가 발생했습니다.', () => router.back());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // ---------- 위치 저장 ----------
  const persistPosition = useCallback(() => {
    const b = bookRef.current;
    const count = paraCountRef.current;
    if (!b || count === 0) return;
    const idx = Math.min(currentIndexRef.current, count - 1);
    const progress = count <= 1 ? 1 : Math.min(1, Math.max(0, idx / (count - 1)));
    updateReadingPosition(b.id, idx, progress, encodingRef.current).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(persistPosition, 10000);
    return () => {
      clearInterval(interval);
      // 화면을 나갈 때 TTS를 멈추고 위치를 저장
      Speech.stop();
      persistPosition();
    };
  }, [persistPosition]);

  // ---------- 스크롤 ----------
  const scrollToPara = useCallback((index: number, animated: boolean) => {
    const count = paraCountRef.current;
    if (count === 0) return;
    const target = Math.min(Math.max(0, index), count - 1);
    try {
      listRef.current?.scrollToIndex({ index: target, animated, viewPosition: 0.25 });
    } catch {
      // onScrollToIndexFailed에서 처리
    }
  }, []);

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
      setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.25 });
        } catch {}
      }, 300);
    },
    [],
  );

  // 읽던 위치 복원
  useEffect(() => {
    if (paragraphs.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    if (initialIndexRef.current > 0) {
      setTimeout(() => scrollToPara(initialIndexRef.current, false), 150);
      setCurrentPara(Math.min(initialIndexRef.current, paragraphs.length - 1));
    }
  }, [paragraphs, scrollToPara]);

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 5, minimumViewTime: 100 },
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
        if (viewableItems.length === 0) return;
        const first = viewableItems[0].index ?? 0;
        // TTS 재생 중에는 TTS 진행 위치를 우선한다
        if (!speakingRef.current) {
          currentIndexRef.current = first;
          setCurrentPara(first);
        }
      },
    },
  ]);

  // ---------- TTS ----------
  const stopTts = useCallback(() => {
    speakingRef.current = false;
    pausedRef.current = false;
    setSpeaking(false);
    setActivePara(null);
    Speech.stop();
  }, []);

  const speakAt = useCallback(
    (idx: number) => {
      const list = sentencesRef.current;
      if (idx < 0) idx = 0;
      if (idx >= list.length) {
        stopTts();
        return;
      }
      sentenceIdxRef.current = idx;
      const sentence = list[idx];
      setActivePara(sentence.para);
      setCurrentPara(sentence.para);
      currentIndexRef.current = sentence.para;
      scrollToPara(sentence.para, true);

      const token = ++utteranceTokenRef.current;
      Speech.speak(sentence.text, {
        language: 'ko-KR',
        rate: settingsRef.current.ttsRate,
        pitch: settingsRef.current.ttsPitch,
        onDone: () => {
          ttsErrorCountRef.current = 0;
          if (speakingRef.current && utteranceTokenRef.current === token) {
            speakAt(idx + 1);
          }
        },
        onError: () => {
          // 엔진 오류가 연속되면 무한 루프를 피하기 위해 중단
          ttsErrorCountRef.current += 1;
          if (
            speakingRef.current &&
            utteranceTokenRef.current === token &&
            ttsErrorCountRef.current < 3
          ) {
            speakAt(idx + 1);
          } else if (speakingRef.current) {
            stopTts();
          }
        },
      });
    },
    [scrollToPara, stopTts],
  );

  const startTtsFromPara = useCallback(
    (paraIndex: number) => {
      const map = paraToSentenceRef.current;
      const list = sentencesRef.current;
      if (list.length === 0) return;
      const target = Math.min(Math.max(0, paraIndex), map.length - 1);
      const sentenceIdx = Math.min(map[target] ?? 0, list.length - 1);
      speakingRef.current = true;
      pausedRef.current = false;
      ttsErrorCountRef.current = 0;
      setSpeaking(true);
      Speech.stop();
      speakAt(sentenceIdx);
    },
    [speakAt],
  );

  const toggleTts = useCallback(() => {
    if (speakingRef.current) {
      // 일시정지: 현재 문장 인덱스를 기억해서 이어 듣기 지원
      speakingRef.current = false;
      pausedRef.current = true;
      setSpeaking(false);
      setActivePara(null);
      Speech.stop();
      return;
    }
    if (pausedRef.current && sentenceIdxRef.current < sentencesRef.current.length) {
      speakingRef.current = true;
      pausedRef.current = false;
      ttsErrorCountRef.current = 0;
      setSpeaking(true);
      speakAt(sentenceIdxRef.current);
      return;
    }
    // 처음 시작: 지금 보고 있는 문단부터
    startTtsFromPara(currentIndexRef.current);
  }, [speakAt, startTtsFromPara]);

  const skipSentence = useCallback(
    (delta: number) => {
      if (!speakingRef.current) return;
      const next = Math.min(
        Math.max(0, sentenceIdxRef.current + delta),
        sentencesRef.current.length - 1,
      );
      Speech.stop();
      speakAt(next);
    },
    [speakAt],
  );

  const cycleRate = useCallback(() => {
    const current = settingsRef.current.ttsRate;
    let nearest = 0;
    for (let i = 0; i < QUICK_RATES.length; i++) {
      if (Math.abs(QUICK_RATES[i] - current) < Math.abs(QUICK_RATES[nearest] - current)) nearest = i;
    }
    const nextRate = QUICK_RATES[(nearest + 1) % QUICK_RATES.length];
    const next = { ...settingsRef.current, ttsRate: nextRate };
    setSettings(next);
    settingsRef.current = next;
    saveSettings(next).catch(() => {});
    // 재생 중이면 현재 문장부터 새 속도로 다시 읽는다
    if (speakingRef.current) {
      Speech.stop();
      speakAt(sentenceIdxRef.current);
    }
  }, [speakAt]);

  // ---------- 설정 ----------
  const handleSettingsChange = useCallback((next: ReaderSettings) => {
    setSettings(next);
    settingsRef.current = next;
    saveSettings(next).catch(() => {});
  }, []);

  // ---------- 렌더링 ----------
  const toggleControls = useCallback(() => setControlsVisible((v) => !v), []);

  const handleParagraphLongPress = useCallback(
    (index: number) => {
      startTtsFromPara(index);
    },
    [startTtsFromPara],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <Paragraph
        text={item}
        index={index}
        active={index === activePara}
        fontSize={settings.fontSize}
        lineHeightMult={settings.lineHeightMult}
        color={colors.text}
        highlightColor={colors.highlight}
        onPress={toggleControls}
        onLongPress={handleParagraphLongPress}
      />
    ),
    [activePara, settings.fontSize, settings.lineHeightMult, colors, toggleControls, handleParagraphLongPress],
  );

  const progressPct =
    paragraphs.length <= 1 ? 0 : Math.round((currentPara / (paragraphs.length - 1)) * 100);

  const handleSliderComplete = useCallback(
    (value: number) => {
      const count = paraCountRef.current;
      if (count === 0) return;
      const index = Math.round(value * (count - 1));
      currentIndexRef.current = index;
      setCurrentPara(index);
      scrollToPara(index, false);
      if (speakingRef.current) {
        startTtsFromPara(index);
      } else {
        pausedRef.current = false;
      }
    },
    [scrollToPara, startTtsFromPara],
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.sub, marginTop: 12 }}>파일을 여는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        ref={listRef}
        data={paragraphs}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        onScrollToIndexFailed={onScrollToIndexFailed}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={9}
        ListEmptyComponent={
          <Text style={{ color: colors.sub, textAlign: 'center', marginTop: 60 }}>
            내용이 비어 있습니다
          </Text>
        }
      />

      {controlsVisible && (
        <View
          style={[styles.topBar, { backgroundColor: colors.panel, borderBottomColor: colors.border }]}
        >
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {book?.title ?? ''}
            </Text>
            <Text style={[styles.subtitle, { color: colors.sub }]}>
              {encodingRef.current ?? ''} · {paragraphs.length.toLocaleString()}문단
            </Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={() => setSettingsVisible(true)}>
            <Ionicons name="text-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      )}

      {controlsVisible && (
        <View
          style={[styles.bottomBar, { backgroundColor: colors.panel, borderTopColor: colors.border }]}
        >
          <View style={styles.ttsRow}>
            <Pressable style={styles.iconBtn} onPress={() => skipSentence(-1)} disabled={!speaking}>
              <Ionicons
                name="play-skip-back"
                size={22}
                color={speaking ? colors.text : colors.border}
              />
            </Pressable>
            <Pressable
              style={[styles.playBtn, { backgroundColor: colors.accent }]}
              onPress={toggleTts}
            >
              <Ionicons name={speaking ? 'pause' : 'volume-high'} size={26} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => skipSentence(1)} disabled={!speaking}>
              <Ionicons
                name="play-skip-forward"
                size={22}
                color={speaking ? colors.text : colors.border}
              />
            </Pressable>
            <Pressable
              style={[styles.rateBtn, { borderColor: colors.border }]}
              onPress={cycleRate}
            >
              <Text style={[styles.rateText, { color: colors.text }]}>
                x{settings.ttsRate.toFixed(2).replace(/0$/, '')}
              </Text>
            </Pressable>
          </View>
          <View style={styles.progressRow}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={paragraphs.length <= 1 ? 0 : currentPara / (paragraphs.length - 1)}
              onSlidingComplete={handleSliderComplete}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.accent}
            />
            <Text style={[styles.progressLabel, { color: colors.sub }]}>{progressPct}%</Text>
          </View>
          <Text style={[styles.ttsHint, { color: colors.sub }]}>
            문단을 길게 누르면 그 위치부터 읽어줘요
          </Text>
        </View>
      )}

      <SettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        settings={settings}
        onChange={handleSettingsChange}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingTop: 64, paddingBottom: 160 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  titleWrap: { flex: 1, alignItems: 'center', gap: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 11 },
  iconBtn: { padding: 10 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  ttsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  playBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtn: {
    position: 'absolute',
    right: 0,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rateText: { fontSize: 12, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  slider: { flex: 1, height: 36 },
  progressLabel: { width: 44, textAlign: 'right', fontSize: 13, fontWeight: '600' },
  ttsHint: { textAlign: 'center', fontSize: 11 },
});
