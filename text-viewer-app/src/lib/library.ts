import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { Book } from './types';

const BOOKS_KEY = 'tv.books.v1';
const BOOKS_DIR = `${FileSystem.documentDirectory}books/`;

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

/**
 * 문서 선택기로 txt 파일을 골라 앱 저장소로 복사하고 서재에 등록한다.
 * 반환값은 새로 추가된 책 목록 (사용자가 취소하면 빈 배열).
 */
export async function importBooks(): Promise<Book[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/plain', 'text/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  await ensureBooksDir();
  const books = await loadBooks();
  const added: Book[] = [];

  for (const asset of result.assets) {
    const id = makeId();
    const dest = `${BOOKS_DIR}${id}.txt`;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
    const info = await FileSystem.getInfoAsync(dest);
    const title = (asset.name ?? '제목 없음').replace(/\.txt$/i, '');
    const book: Book = {
      id,
      title,
      fileUri: dest,
      size: info.exists && !info.isDirectory ? (info.size ?? 0) : 0,
      addedAt: Date.now(),
      lastReadAt: 0,
      paraIndex: 0,
      progress: 0,
    };
    added.push(book);
  }

  if (added.length > 0) {
    await saveBooks([...books, ...added]);
  }
  return added;
}

export async function removeBook(id: string): Promise<void> {
  const books = await loadBooks();
  const target = books.find((b) => b.id === id);
  if (target) {
    try {
      await FileSystem.deleteAsync(target.fileUri, { idempotent: true });
    } catch {
      // 파일이 이미 없어도 목록에서는 제거한다
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
