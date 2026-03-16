import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Book } from '../types/domain';
import { MOCK_BOOKS } from '../data/mockBooks';
import { loadBooks, saveBooks } from '../storage/localStorage';

interface LibraryScreenProps {
  onOpenBook: (book: Book) => void;
  onOpenGlossary: () => void;
}

export function LibraryScreen({ onOpenBook, onOpenGlossary }: LibraryScreenProps) {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const init = async () => {
      const stored = await loadBooks();
      if (stored.length === 0) {
        setBooks(MOCK_BOOKS);
        await saveBooks(MOCK_BOOKS);
        return;
      }
      setBooks(stored);
    };
    void init();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Biblioteca</Text>
          <Text style={styles.subtitle}>Tus libros disponibles</Text>
        </View>
        <Pressable style={styles.glossaryButton} onPress={onOpenGlossary}>
          <Text style={styles.glossaryText}>Glosario</Text>
        </Pressable>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpenBook(item)}>
            <Text style={styles.bookTitle}>{item.title}</Text>
            <Text style={styles.bookAuthor}>{item.author}</Text>
            <Text style={styles.bookProgress}>Progreso: {item.progress}%</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  glossaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  glossaryText: {
    color: '#0EA5E9',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  bookProgress: {
    fontSize: 12,
    color: '#0EA5E9',
    marginTop: 8,
  },
});
