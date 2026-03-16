import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import type { Book } from '../types/domain';
import { loadBooks, saveBooks } from '../storage/localStorage';

interface LibraryScreenProps {
  onOpenBook: (book: Book) => void;
  onOpenGlossary: () => void;
}

export function LibraryScreen({ onOpenBook, onOpenGlossary }: LibraryScreenProps) {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('--- Iniciando carga de biblioteca ---');
        const stored = await loadBooks();
        console.log('Libros en storage:', stored.length);

        if (stored.length === 0) {
          console.log('Biblioteca vacía. Cargando libro de muestra...');
          
          const asset = Asset.fromModule(require('../../assets/epubs/ogma-sample-alice.epub'));
          console.log('Asset obtenido:', asset.name);
          
          await asset.downloadAsync();
          console.log('Asset descargado. LocalUri:', asset.localUri);

          const targetPath = `${FileSystem.documentDirectory}ogma-sample-alice.epub`;
          
          if (asset.localUri) {
            await FileSystem.copyAsync({
              from: asset.localUri,
              to: targetPath,
            });
            console.log('Archivo copiado a:', targetPath);
          }

          const seeded = [
            {
              id: 'ogma-sample-alice',
              title: 'Alice in Wonderland (Sample)',
              author: 'Lewis Carroll',
              filePath: targetPath,
              progress: 0,
            },
          ];

          console.log('Estableciendo libros iniciales:', seeded.length);
          setBooks(seeded);
          await saveBooks(seeded);
        } else {
          setBooks(stored);
        }
      } catch (error) {
        console.error('Error cargando biblioteca:', error);
        setBooks([]);
      }
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay libros en tu biblioteca.</Text>
            <Text style={styles.emptySubtext}>Toca "Importar EPUB" para agregar uno.</Text>
          </View>
        }
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
