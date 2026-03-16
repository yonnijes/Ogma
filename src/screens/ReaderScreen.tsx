import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { Book, DictionaryEntry } from '../types/domain';
import { dictionaryService } from '../services/dictionaryService';
import { epubParser, type EpubChapter } from '../services/epubParser';
import * as FileSystem from 'expo-file-system';

interface ReaderScreenProps {
  book: Book;
  onBack: () => void;
}

export function ReaderScreen({ book, onBack }: ReaderScreenProps) {
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showToc, setShowToc] = useState(false);

  // Dictionary modal state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<{
    entry: DictionaryEntry | null;
    lemma: string | null;
    suggestions: DictionaryEntry[];
    method: string;
  } | null>(null);
  const [dictLoading, setDictLoading] = useState(false);

  useEffect(() => {
    loadEpub();
    dictionaryService.loadDictionary();
    return () => {
      // Cleanup temp files when unmounting
      if (chapters.length > 0) {
        epubParser.cleanup(chapters[0].fullPath.split('/OEBPS')[0]);
      }
    };
  }, []);

  const loadEpub = async () => {
    if (!book.filePath) return;

    try {
      setLoading(true);
      const epubBook = await epubParser.parse(book.filePath);
      setChapters(epubBook.chapters);

      if (epubBook.chapters.length > 0) {
        await loadChapter(0, epubBook.chapters);
      }
    } catch (error) {
      console.error('Error loading EPUB:', error);
      setChapterContent('<h1>Error cargando el libro</h1><p>No se pudo leer el archivo EPUB.</p>');
    } finally {
      setLoading(false);
    }
  };

  const loadChapter = async (index: number, chapterList: EpubChapter[] = chapters) => {
    if (!chapterList[index]) return;

    try {
      const chapter = chapterList[index];
      const content = await epubParser.parseChapterHtml(chapter.fullPath);
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: Georgia, serif;
                font-size: 18px;
                line-height: 1.8;
                padding: 16px;
                color: #0F172A;
                background: #F8FAFC;
              }
              p { margin: 1em 0; }
              h1, h2, h3 { color: #1E293B; margin: 1.5em 0 0.5em; }
              .word { 
                display: inline;
                padding: 2px 4px;
                border-radius: 4px;
              }
              .word:active {
                background: #FEF3C7;
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `;
      setChapterContent(html);
      setCurrentChapterIndex(index);
    } catch (error) {
      console.error('Error loading chapter:', error);
    }
  };

  const handleWordTap = async (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    setDictLoading(true);
    setSelectedWord(cleanWord);

    const result = await dictionaryService.lookup(cleanWord);
    setLookupResult(result);
    setDictLoading(false);
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentChapterIndex > 0) {
      loadChapter(currentChapterIndex - 1);
    } else if (direction === 'next' && currentChapterIndex < chapters.length - 1) {
      loadChapter(currentChapterIndex + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Volver</Text>
        </Pressable>
        <Pressable onPress={() => setShowToc(true)} style={styles.tocButton}>
          <Text style={styles.tocText}>📑 Índice</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>Cargando libro...</Text>
        </View>
      ) : (
        <>
          <View style={styles.readerContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: chapterContent }}
              style={styles.webview}
              onMessage={(event) => {
                try {
                  const word = JSON.parse(event.nativeEvent.data);
                  if (word) handleWordTap(word);
                } catch {}
              }}
              injectedJavaScript={`
                (function() {
                  const words = document.querySelectorAll('body p, body h1, body h2, body h3, body li');
                  words.forEach(el => {
                    el.innerHTML = el.innerHTML.replace(/\\b([a-zA-Z]{2,})\\b/g, '<span class="word" onclick="window.ReactNativeWebView.postMessage(JSON.stringify(\'$1\'))">$1</span>');
                  });
                })();
                true;
              `}
            />
          </View>

          <View style={styles.navBar}>
            <Pressable
              style={[styles.navButton, currentChapterIndex === 0 && styles.navButtonDisabled]}
              onPress={() => handleNavigation('prev')}
              disabled={currentChapterIndex === 0}
            >
              <Text style={styles.navButtonText}>← Anterior</Text>
            </Pressable>
            <Text style={styles.chapterIndicator}>
              {currentChapterIndex + 1} / {chapters.length}
            </Text>
            <Pressable
              style={[styles.navButton, currentChapterIndex >= chapters.length - 1 && styles.navButtonDisabled]}
              onPress={() => handleNavigation('next')}
              disabled={currentChapterIndex >= chapters.length - 1}
            >
              <Text style={styles.navButtonText}>Siguiente →</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Table of Contents Modal */}
      <Modal animationType="slide" transparent visible={showToc}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowToc(false)}>
          <View style={styles.tocModal}>
            <Text style={styles.tocTitle}>Índice</Text>
            <FlatList
              data={chapters}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Pressable
                  style={[styles.tocItem, index === currentChapterIndex && styles.tocItemActive]}
                  onPress={() => {
                    loadChapter(index);
                    setShowToc(false);
                  }}
                >
                  <Text style={[styles.tocItemText, index === currentChapterIndex && styles.tocItemTextActive]}>
                    {item.title || `Capítulo ${index + 1}`}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Dictionary Modal */}
      <Modal animationType="slide" transparent visible={!!selectedWord}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedWord(null)}>
          <View style={styles.sheet}>
            {dictLoading ? (
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  tocButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tocText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  readerContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0EA5E9',
  },
  navButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chapterIndicator: {
    fontSize: 14,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  tocModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    maxHeight: '80%',
    padding: 16,
  },
  tocTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  tocItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tocItemActive: {
    backgroundColor: '#E0F2FE',
  },
  tocItemText: {
    fontSize: 15,
    color: '#334155',
  },
  tocItemTextActive: {
    color: '#0369A1',
    fontWeight: '600',
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
