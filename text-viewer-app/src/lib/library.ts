import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { decodeTextFromBase64, decodeTextFromBytes } from './encoding';
import { Book } from './types';

const BOOKS_KEY = 'tv.books.v1';
const BOOKS_DIR = `${FileSystem.documentDirectory}books/`;
const isWeb = Platform.OS === 'web';

/** 웹은 파일시스템 대신 AsyncStorage(localStorage)에 본문을 저장하므로 용량을 제한한다 */
const WEB_MAX_FILE_SIZE = 4 * 1024 * 1024;

const webTextKey = (id: string) => `tv.booktext.${id}`;

async function ensureBooksDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(BOOKS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BOOKS_DIR, { intermediates: true });
  }
}

export async function loadBooks(): Promise<Book[]> {
  const raw = await AsyncStorage.getItem(BOOKS_KEY);
  if (!raw) return [];
  try {
    const books = JSON.parse(raw) as Book[];
    return books.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));
  } catch {
    return [];
  }
}

async function saveBooks(books: Book[]): Promise<void> {
  await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export async function getBook(id: string): Promise<Book | null> {
  const books = await loadBooks();
  return books.find((b) => b.id === id) ?? null;
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ImportResult {
  added: Book[];
  /** 용량 초과 등으로 건너뛴 파일 이름 목록 */
  skipped: string[];
}

/**
 * 문서 선택기로 txt 파일을 골라 등록한다.
 * 네이티브는 앱 저장소로 파일을 복사하고, 웹은 본문을 디코딩해 AsyncStorage에 저장한다.
 */
export async function importBooks(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/plain', 'text/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return { added: [], skipped: [] };

  if (!isWeb) await ensureBooksDir();
  const books = await loadBooks();
  const added: Book[] = [];
  const skipped: string[] = [];

  for (const asset of result.assets) {
    const id = makeId();
    const title = (asset.name ?? '제목 없음').replace(/\.txt$/i, '');

    if (isWeb) {
      const bytes = await readWebAssetBytes(asset);
      if (!bytes || bytes.length > WEB_MAX_FILE_SIZE) {
        skipped.push(asset.name ?? '제목 없음');
        continue;
      }
      const { text, encoding } = decodeTextFromBytes(bytes);
      try {
        await AsyncStorage.setItem(webTextKey(id), text);
      } catch {
        // localStorage 용량 초과
        skipped.push(asset.name ?? '제목 없음');
        continue;
      }
      added.push({
        id,
        title,
        fileUri: `web:${id}`,
        size: bytes.length,
        addedAt: Date.now(),
        lastReadAt: 0,
        paraIndex: 0,
        progress: 0,
        encoding,
      });
      continue;
    }

    const dest = `${BOOKS_DIR}${id}.txt`;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
    const info = await FileSystem.getInfoAsync(dest);
    added.push({
      id,
      title,
      fileUri: dest,
      size: info.exists && !info.isDirectory ? (info.size ?? 0) : 0,
      addedAt: Date.now(),
      lastReadAt: 0,
      paraIndex: 0,
      progress: 0,
    });
  }

  if (added.length > 0) {
    await saveBooks([...books, ...added]);
  }
  return { added, skipped };
}

async function readWebAssetBytes(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<Uint8Array | null> {
  try {
    if (asset.file) {
      return new Uint8Array(await asset.file.arrayBuffer());
    }
    const res = await fetch(asset.uri);
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** 책 본문을 읽어 인코딩 감지 후 문자열로 돌려준다. */
export async function loadBookText(book: Book): Promise<{ text: string; encoding: string }> {
  if (isWeb) {
    const text = await AsyncStorage.getItem(webTextKey(book.id));
    if (text == null) throw new Error('book text not found');
    return { text, encoding: book.encoding ?? 'UTF-8' };
  }
  const base64 = await FileSystem.readAsStringAsync(book.fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decodeTextFromBase64(base64);
}

export async function removeBook(id: string): Promise<void> {
  const books = await loadBooks();
  const target = books.find((b) => b.id === id);
  if (target) {
    if (isWeb) {
      await AsyncStorage.removeItem(webTextKey(id)).catch(() => {});
    } else {
      try {
        await FileSystem.deleteAsync(target.fileUri, { idempotent: true });
      } catch {
        // 파일이 이미 없어도 목록에서는 제거한다
      }
    }
  }
  await saveBooks(books.filter((b) => b.id !== id));
}

/** 읽던 위치와 진행률을 저장한다. */
export async function updateReadingPosition(
  id: string,
  paraIndex: number,
  progress: number,
  encoding?: string,
): Promise<void> {
  const books = await loadBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return;
  books[idx] = {
    ...books[idx],
    paraIndex,
    progress,
    lastReadAt: Date.now(),
    ...(encoding ? { encoding } : {}),
  };
  await saveBooks(books);
}
