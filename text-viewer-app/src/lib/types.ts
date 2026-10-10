export interface Book {
  id: string;
  /** 파일명에서 확장자를 뺀 제목 */
  title: string;
  /** 앱 문서 디렉토리에 복사된 파일 경로 */
  fileUri: string;
  /** 파일 크기 (bytes) */
  size: number;
  addedAt: number;
  lastReadAt: number;
  /** 마지막으로 읽던 문단 인덱스 */
  paraIndex: number;
  /** 0~1 사이 진행률 */
  progress: number;
  /** 감지된 인코딩 (읽은 뒤 기록) */
  encoding?: string;
}

export type ReaderTheme = 'light' | 'sepia' | 'dark';

export interface ReaderSettings {
  fontSize: number;
  /** 폰트 크기 대비 줄 간격 배수 */
  lineHeightMult: number;
  theme: ReaderTheme;
  /** TTS 읽기 속도 (0.5 ~ 2.0) */
  ttsRate: number;
  /** TTS 음높이 (0.5 ~ 2.0) */
  ttsPitch: number;
}

export interface Sentence {
  text: string;
  /** 이 문장이 속한 문단 인덱스 */
  para: number;
}
