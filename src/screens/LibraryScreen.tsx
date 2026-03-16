import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
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
        const asset = Asset.fromModule(require('../../assets/epubs/ogma-sample-alice.epub'));
        await asset.downloadAsync();

        const targetPath = `${FileSystem.documentDirectory}ogma-sample-alice.epub`;
        if (asset.localUri) {
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: targetPath,
          });
        }

        const seeded = [
          {
            id: 'ogma-sample-alice',
            title: 'Alice in Wonderland (Sample)',
            author: 'Lewis Carroll',
            filePath: targetPath,
            progress: 0,
          },
          ...MOCK_BOOKS,
        ];

        setBooks(seeded);
        await saveBooks(seeded);
        return;
      }
      setBooks(stored);
    };
    void init();
  }, []);

  const handleImportEpub = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/epub+zip',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    if (!file) return;

    const fileName = file.name ?? `book-${Date.now()}.epub`;
    const targetPath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.copyAsync({
      from: file.uri,
      to: targetPath,
    });

    const title = fileName.replace(/\.epub$/i, '').replace(/[_-]/g, ' ');

    const newBook: Book = {
      id: `local-${Date.now()}`,
      title: title || 'EPUB Importado',
      author: 'Desconocido',
      filePath: targetPath,
      progress: 0,
    };

    const updated = [newBook, ...books];
    setBooks(updated);
    await saveBooks(updated);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Biblioteca</Text>
          <Text style={styles.subtitle}>Tus libros disponibles</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.secondaryButton} onPress={handleImportEpub}>
            <Text style={styles.secondaryText}>Importar EPUB</Text>
          </Pressable>
          <Pressable style={styles.glossaryButton} onPress={onOpenGlossary}>
            <Text style={styles.glossaryText}>Glosario</Text>
          </Pressable>
        </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
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
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  secondaryText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  glossaryButton: {
    paddingVertical: 10,
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
    paddingTop: 4,
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
