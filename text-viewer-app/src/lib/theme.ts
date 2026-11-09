import { ReaderTheme } from './types';

export interface ReaderThemeColors {
  /** 본문 배경 */
  bg: string;
  /** 본문 글자 */
  text: string;
  /** 보조 글자 (메타 정보) */
  sub: string;
  /** 컨트롤 패널 배경 */
  panel: string;
  /** 강조색 (버튼, 슬라이더) */
  accent: string;
  /** TTS로 읽는 중인 문단 배경 */
  highlight: string;
  border: string;
}

export const READER_THEMES: Record<ReaderTheme, ReaderThemeColors> = {
  light: {
    bg: '#FFFFFF',
    text: '#1F2328',
    sub: '#6B7280',
    panel: '#F7F8FA',
    accent: '#2563EB',
    highlight: '#DBEAFE',
    border: '#E5E7EB',
  },
  sepia: {
    bg: '#F6ECD9',
    text: '#433422',
    sub: '#8A7A63',
    panel: '#EFE2C8',
    accent: '#B45309',
    highlight: '#EED9A9',
    border: '#E2D3B4',
  },
  dark: {
    bg: '#111418',
    text: '#C9CDD3',
    sub: '#7C838D',
    panel: '#1B2026',
    accent: '#60A5FA',
    highlight: '#2A3B55',
    border: '#242A31',
  },
};

export const THEME_LABELS: Record<ReaderTheme, string> = {
  light: '밝게',
  sepia: '세피아',
  dark: '어둡게',
};
