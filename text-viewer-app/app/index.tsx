import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { importBooks, loadBooks, removeBook } from '@/src/lib/library';
import { formatBytes, formatRelativeTime } from '@/src/lib/textUtils';
import { Book } from '@/src/lib/types';

export default function LibraryScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(() => {
    loadBooks().then(setBooks);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const added = await importBooks();
      if (added.length > 0) refresh();
    } catch (e) {
      Alert.alert('가져오기 실패', '파일을 가져오는 중 문제가 발생했습니다.');
      console.warn(e);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = (book: Book) => {
    Alert.alert('책 삭제', `"${book.title}"을(를) 서재에서 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await removeBook(book.id);
          refresh();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Book }) => (
    <Pressable
      style={({ pressed }) => [styles.bookItem, pressed && styles.bookItemPressed]}
      onPress={() => router.push({ pathname: '/viewer/[id]', params: { id: item.id } })}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.bookIcon}>
        <Ionicons name="document-text-outline" size={26} color="#2563EB" />
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.bookMeta}>
          {formatBytes(item.size)} · {formatRelativeTime(item.lastReadAt)}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
        </View>
      </View>
      <Text style={styles.progressText}>{Math.round(item.progress * 100)}%</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>서재</Text>
        <Pressable style={styles.importButton} onPress={handleImport}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.importButtonText}>파일 열기</Text>
        </Pressable>
      </View>

      {books.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="library-outline" size={64} color="#C3C9D4" />
          <Text style={styles.emptyTitle}>서재가 비어 있어요</Text>
          <Text style={styles.emptyDesc}>
            txt 파일을 가져오면 이어 읽기, 음성 듣기 기능과 함께{'\n'}편하게 읽을 수 있어요.
          </Text>
          <Pressable style={styles.emptyButton} onPress={handleImport}>
            <Text style={styles.emptyButtonText}>txt 파일 가져오기</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      <Text style={styles.hint}>항목을 길게 누르면 삭제할 수 있어요</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#1F2328' },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  importButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 1, backgroundColor: '#EEF0F3', marginLeft: 62 },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  bookItemPressed: { opacity: 0.6 },
  bookIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#EFF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: { flex: 1, gap: 4 },
  bookTitle: { fontSize: 16, fontWeight: '600', color: '#1F2328' },
  bookMeta: { fontSize: 12, color: '#6B7280' },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EDF0F4',
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#2563EB' },
  progressText: { fontSize: 13, fontWeight: '600', color: '#6B7280', width: 40, textAlign: 'right' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4B5563', marginTop: 8 },
  emptyDesc: { fontSize: 14, color: '#8B929E', textAlign: 'center', lineHeight: 21 },
  emptyButton: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  hint: { textAlign: 'center', fontSize: 12, color: '#A6ADBA', paddingVertical: 8 },
});
