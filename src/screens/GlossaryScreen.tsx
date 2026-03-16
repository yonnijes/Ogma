import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { VocabEntry } from '../types/domain';
import { loadVocab } from '../storage/localStorage';

export function GlossaryScreen() {
  const [vocab, setVocab] = useState<VocabEntry[]>([]);

  useEffect(() => {
    const init = async () => {
      const stored = await loadVocab();
      setVocab(stored);
    };
    void init();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Glosario</Text>
      {vocab.length === 0 ? (
        <Text style={styles.empty}>Aún no has guardado palabras.</Text>
      ) : (
        <FlatList
          data={vocab}
          keyExtractor={(item) => `${item.word}-${item.savedAt}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.word}>{item.word}</Text>
              {item.context && <Text style={styles.context}>{item.context}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  empty: {
    color: '#64748B',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  word: {
    fontSize: 16,
    fontWeight: '600',
  },
  context: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
});
