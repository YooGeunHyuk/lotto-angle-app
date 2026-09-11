import Slider from '@react-native-community/slider';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { READER_THEMES, ReaderThemeColors, THEME_LABELS } from '@/src/lib/theme';
import { ReaderSettings, ReaderTheme } from '@/src/lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onChange: (next: ReaderSettings) => void;
  colors: ReaderThemeColors;
}

const THEMES: ReaderTheme[] = ['light', 'sepia', 'dark'];

export default function SettingsSheet({ visible, onClose, settings, onChange, colors }: Props) {
  const set = (patch: Partial<ReaderSettings>) => onChange({ ...settings, ...patch });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>글자 크기</Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepBtn, { borderColor: colors.border }]}
              onPress={() => set({ fontSize: Math.max(12, settings.fontSize - 1) })}
            >
              <Text style={[styles.stepBtnText, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={[styles.stepValue, { color: colors.text }]}>{settings.fontSize}</Text>
            <Pressable
              style={[styles.stepBtn, { borderColor: colors.border }]}
              onPress={() => set({ fontSize: Math.min(32, settings.fontSize + 1) })}
            >
              <Text style={[styles.stepBtnText, { color: colors.text }]}>＋</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>줄 간격</Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepBtn, { borderColor: colors.border }]}
              onPress={() =>
                set({ lineHeightMult: Math.max(1.2, Math.round((settings.lineHeightMult - 0.1) * 10) / 10) })
              }
            >
              <Text style={[styles.stepBtnText, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={[styles.stepValue, { color: colors.text }]}>
              {settings.lineHeightMult.toFixed(1)}
            </Text>
            <Pressable
              style={[styles.stepBtn, { borderColor: colors.border }]}
              onPress={() =>
                set({ lineHeightMult: Math.min(2.6, Math.round((settings.lineHeightMult + 0.1) * 10) / 10) })
              }
            >
              <Text style={[styles.stepBtnText, { color: colors.text }]}>＋</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>배경 테마</Text>
          <View style={styles.themeChips}>
            {THEMES.map((t) => (
              <Pressable
                key={t}
                onPress={() => set({ theme: t })}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: READER_THEMES[t].bg,
                    borderColor: settings.theme === t ? colors.accent : colors.border,
                    borderWidth: settings.theme === t ? 2 : 1,
                  },
                ]}
              >
                <Text style={{ color: READER_THEMES[t].text, fontSize: 12, fontWeight: '600' }}>
                  {THEME_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.label, { color: colors.text }]}>읽기 속도</Text>
            <Text style={[styles.sliderValue, { color: colors.sub }]}>
              x{settings.ttsRate.toFixed(2)}
            </Text>
          </View>
          <Slider
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.05}
            value={settings.ttsRate}
            onSlidingComplete={(v) => set({ ttsRate: Math.round(v * 100) / 100 })}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
        </View>

        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.label, { color: colors.text }]}>목소리 음높이</Text>
            <Text style={[styles.sliderValue, { color: colors.sub }]}>
              x{settings.ttsPitch.toFixed(2)}
            </Text>
          </View>
          <Slider
            minimumValue={0.5}
            maximumValue={1.5}
            step={0.05}
            value={settings.ttsPitch}
            onSlidingComplete={(v) => set({ ttsPitch: Math.round(v * 100) / 100 })}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
        </View>

        <Text style={[styles.note, { color: colors.sub }]}>
          속도·음높이 변경은 다음 문장부터 적용돼요
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 14,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '600' },
  stepValue: { fontSize: 16, fontWeight: '700', minWidth: 36, textAlign: 'center' },
  themeChips: { flexDirection: 'row', gap: 8 },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  sliderBlock: { gap: 2 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderValue: { fontSize: 13, fontWeight: '600' },
  note: { fontSize: 12, textAlign: 'center', marginTop: 2 },
});
