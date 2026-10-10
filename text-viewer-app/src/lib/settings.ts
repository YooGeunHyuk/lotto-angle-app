import AsyncStorage from '@react-native-async-storage/async-storage';

import { ReaderSettings } from './types';

const SETTINGS_KEY = 'tv.settings.v1';

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeightMult: 1.8,
  theme: 'light',
  ttsRate: 1.0,
  ttsPitch: 1.0,
};

export async function loadSettings(): Promise<ReaderSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReaderSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: ReaderSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
