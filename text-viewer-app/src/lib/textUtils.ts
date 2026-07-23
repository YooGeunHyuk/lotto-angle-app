import { Sentence } from './types';

/** TTS 한 번에 읽을 문장의 최대 길이 (플랫폼 발화 길이 제한 대비 여유값) */
const MAX_TTS_CHUNK = 200;

/** 문장 끝으로 취급하는 문자들 */
const SENTENCE_ENDERS = new Set(['.', '!', '?', '…', '。', '！', '？']);
/** 문장 끝 문자 뒤에 붙을 수 있는 닫는 부호들 */
const CLOSERS = new Set(['"', "'", '”', '’', ')', ']', '』', '」', '〉', '》']);

/**
 * 원문 텍스트를 문단(비어있지 않은 줄) 배열로 나눈다.
 * 국내 txt 소설은 대부분 한 줄이 한 문단이므로 줄 단위 분할이 가장 자연스럽다.
 */
export function splitParagraphs(text: string): string[] {
  const lines = text.split(/\r\n|\r|\n/);
  const paragraphs: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) paragraphs.push(trimmed);
  }
  return paragraphs;
}

/**
 * 한 문단을 TTS로 읽기 좋은 문장 단위로 나눈다.
 * 정규식 lookbehind 의존을 피하려고 문자 단위로 스캔한다.
 */
export function splitSentences(paragraph: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  let i = 0;
  const len = paragraph.length;

  while (i < len) {
    const ch = paragraph[i];
    if (SENTENCE_ENDERS.has(ch)) {
      // 연속된 종결 부호(예: "...", "?!")를 모두 소비
      let j = i + 1;
      while (j < len && (SENTENCE_ENDERS.has(paragraph[j]) || CLOSERS.has(paragraph[j]))) j++;
      // 종결 부호 뒤가 공백이거나 문단 끝이면 문장 경계로 판단
      if (j >= len || paragraph[j] === ' ' || paragraph[j] === '\t') {
        const piece = paragraph.slice(start, j).trim();
        if (piece.length > 0) sentences.push(piece);
        start = j;
        i = j;
        continue;
      }
      i = j;
      continue;
    }
    i++;
  }
  const rest = paragraph.slice(start).trim();
  if (rest.length > 0) sentences.push(rest);

  // 너무 긴 문장은 공백 기준으로 잘라 TTS 길이 제한을 피한다
  const chunked: string[] = [];
  for (const s of sentences) {
    if (s.length <= MAX_TTS_CHUNK) {
      chunked.push(s);
      continue;
    }
    let remaining = s;
    while (remaining.length > MAX_TTS_CHUNK) {
      let cut = remaining.lastIndexOf(' ', MAX_TTS_CHUNK);
      if (cut < MAX_TTS_CHUNK / 2) cut = MAX_TTS_CHUNK;
      chunked.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    if (remaining.length > 0) chunked.push(remaining);
  }
  return chunked;
}

/** 전체 문단 배열을 (문장, 문단 인덱스) 목록으로 펼친다. */
export function buildSentences(paragraphs: string[]): Sentence[] {
  const result: Sentence[] = [];
  for (let p = 0; p < paragraphs.length; p++) {
    for (const text of splitSentences(paragraphs[p])) {
      result.push({ text, para: p });
    }
  }
  return result;
}

/** 각 문단의 첫 문장이 전체 문장 목록에서 몇 번째인지 매핑한다. */
export function firstSentenceIndexByPara(sentences: Sentence[], paraCount: number): number[] {
  const map = new Array<number>(paraCount).fill(-1);
  for (let i = 0; i < sentences.length; i++) {
    const p = sentences[i].para;
    if (map[p] === -1) map[p] = i;
  }
  // 빈 문단(문장이 없는 경우)은 다음 문단의 첫 문장으로 채운다
  let next = sentences.length;
  for (let p = paraCount - 1; p >= 0; p--) {
    if (map[p] === -1) map[p] = next;
    else next = map[p];
  }
  return map;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatRelativeTime(ts: number): string {
  if (!ts) return '아직 읽지 않음';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;
  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}
