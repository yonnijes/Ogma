import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Book } from '../types/domain';

interface ReaderScreenProps {
  book: Book;
  onBack: () => void;
}

const SAMPLE_TEXT =
  'Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.';

export function ReaderScreen({ book, onBack }: ReaderScreenProps) {
  const words = useMemo(() => SAMPLE_TEXT.split(' '), []);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Volver</Text>
        </Pressable>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.subtitle}>{book.author}</Text>
      </View>

      <Text style={styles.paragraph}>
        {words.map((word, index) => (
          <Text key={`${word}-${index}`} onPress={() => setSelectedWord(word)} style={styles.word}>
            {word}{' '}
          </Text>
        ))}
      </Text>

      <Modal animationType="slide" transparent visible={!!selectedWord}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedWord(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{selectedWord}</Text>
            <Text style={styles.sheetDefinition}>Traducción: [pendiente]</Text>
            <Text style={styles.sheetDefinition}>Definición: [pendiente]</Text>
            <View style={styles.sheetActions}>
              <Pressable style={styles.actionButton}><Text style={styles.actionText}>🔊 Escuchar</Text></Pressable>
              <Pressable style={styles.actionButton}><Text style={styles.actionText}>⭐ Guardar</Text></Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  back: {
    color: '#0EA5E9',
    fontSize: 14,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  paragraph: {
    padding: 16,
    fontSize: 18,
    lineHeight: 28,
    color: '#0F172A',
  },
  word: {
    color: '#0F172A',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetDefinition: {
    fontSize: 14,
    color: '#475569',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
