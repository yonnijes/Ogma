import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Book, DictionaryEntry } from '../types/domain';
import { dictionaryService } from '../services/dictionaryService';

interface ReaderScreenProps {
  book: Book;
  onBack: () => void;
}

const SAMPLE_TEXT =
  'Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.';

export function ReaderScreen({ book, onBack }: ReaderScreenProps) {
  const words = useMemo(() => SAMPLE_TEXT.split(' '), []);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<{
    entry: DictionaryEntry | null;
    lemma: string | null;
    suggestions: DictionaryEntry[];
    method: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dictionaryService.loadDictionary();
  }, []);

  const handleWordTap = async (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    setLoading(true);
    setSelectedWord(cleanWord);

    const result = await dictionaryService.lookup(cleanWord);
    setLookupResult(result);
    setLoading(false);
  };

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
          <Text
            key={`${word}-${index}`}
            onPress={() => handleWordTap(word)}
            style={[
              styles.word,
              selectedWord === word.replace(/[^a-zA-Z]/g, '') && styles.wordSelected,
            ]}
          >
            {word}{' '}
          </Text>
        ))}
      </Text>

      <Modal animationType="slide" transparent visible={!!selectedWord}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedWord(null)}>
          <View style={styles.sheet}>
            {loading ? (
              <ActivityIndicator size="large" color="#0EA5E9" />
            ) : (
              <>
                <Text style={styles.sheetTitle}>{selectedWord}</Text>
                {lookupResult?.entry ? (
                  <>
                    <Text style={styles.sheetLabel}>📖 Traducción:</Text>
                    <Text style={styles.sheetDefinition}>{lookupResult.entry.definitionEs}</Text>
                    {lookupResult.entry.definitionEn && (
                      <>
                        <Text style={styles.sheetLabel}>📝 Definición (EN):</Text>
                        <Text style={styles.sheetDefinition}>{lookupResult.entry.definitionEn}</Text>
                      </>
                    )}
                    {lookupResult.entry.example && (
                      <>
                        <Text style={styles.sheetLabel}>💡 Ejemplo:</Text>
                        <Text style={styles.sheetExample}>{lookupResult.entry.example}</Text>
                      </>
                    )}
                    {lookupResult.lemma && (
                      <Text style={styles.sheetMethod}>Lema: {lookupResult.lemma}</Text>
                    )}
                  </>
                ) : lookupResult?.suggestions && lookupResult.suggestions.length > 0 ? (
                  <>
                    <Text style={styles.sheetLabel}>❓ No encontrado. Sugerencias:</Text>
                    {lookupResult.suggestions.map((s, i) => (
                      <Text key={i} style={styles.sheetDefinition}>• {s.word}: {s.definitionEs}</Text>
                    ))}
                  </>
                ) : (
                  <Text style={styles.sheetDefinition}>Sin traducción disponible.</Text>
                )}
                <View style={styles.sheetActions}>
                  <Pressable style={styles.actionButton}>
                    <Text style={styles.actionText}>🔊 Escuchar</Text>
                  </Pressable>
                  <Pressable style={styles.actionButton}>
                    <Text style={styles.actionText}>⭐ Guardar</Text>
                  </Pressable>
                </View>
              </>
            )}
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
  wordSelected: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
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
    marginBottom: 12,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5E9',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetDefinition: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  sheetExample: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  sheetMethod: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
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
