import { useEffect, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, FlatList, Dimensions } from 'react-native';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Sanitize HTML to remove dangerous elements
function sanitizeHtml(html: string): string {
  let sanitized = html;
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove iframe, object, embed
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^>]*>/gi, '');
  
  return sanitized;
}

export function ReaderScreen({ book, onBack }: ReaderScreenProps) {
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Dictionary modal state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<{
    entry: DictionaryEntry | null;
    lemma: string | null;
    suggestions: DictionaryEntry[];
    method: string;
  } | null>(null);
  const [dictLoading, setDictLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadEpub();
    dictionaryService.loadDictionary();
    return () => {
      if (chapters.length > 0) {
        const basePath = chapters[0].fullPath.split('/OEBPS')[0];
        epubParser.cleanup(basePath);
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
      setChapterContent(`
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; padding: 24px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
          <h1 style="color: #EF4444; font-size: 22px; margin: 0 0 12px 0;">Error al cargar</h1>
          <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            No se pudo leer el archivo EPUB.<br/>
            Verifica que el archivo no esté corrupto.
          </p>
          <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 16px;">
            <p style="color: #DC2626; font-size: 13px; margin: 0;">
              💡 Consejo: Intenta importar el EPUB nuevamente
            </p>
          </div>
        </div>
      `);
    } finally {
      setLoading(false);
    }
  };

  const loadChapter = async (index: number, chapterList: EpubChapter[] = chapters) => {
    if (!chapterList[index]) return;

    try {
      const chapter = chapterList[index];
      let content = await epubParser.parseChapterHtml(chapter.fullPath);
      
      // Sanitize HTML
      content = sanitizeHtml(content);

      // Convert image paths to local file:// URIs
      content = content.replace(/src="([^"]+)"/g, (match, src) => {
        if (!src.startsWith('http') && !src.startsWith('data:')) {
          // Relative path - convert to file:// URI
          const chapterDir = chapter.fullPath.substring(0, chapter.fullPath.lastIndexOf('/'));
          const imagePath = `${chapterDir}/${src}`;
          return `src="${imagePath}"`;
        }
        return match;
      });

      // Calculate column width for pagination
      const columnWidth = SCREEN_WIDTH - 40; // padding
      const columnGap = 20;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
            <style>
              * {
                -webkit-user-select: none;
                -webkit-touch-callout: none;
                user-select: none;
              }
              
              body {
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 18px;
                line-height: 1.8;
                color: #0F172A;
                background: #F8FAFC;
                margin: 0;
                padding: 16px 20px;
                column-width: ${columnWidth}px;
                column-gap: ${columnGap}px;
                column-fill: auto;
                height: ${SCREEN_HEIGHT - 150}px;
                overflow-x: hidden;
                overflow-y: hidden;
                scroll-snap-type: x mandatory;
                -webkit-overflow-scrolling: touch;
              }
              
              body::-webkit-scrollbar {
                display: none;
              }
              
              .page {
                scroll-snap-align: start;
                break-inside: avoid;
              }
              
              p {
                margin: 1em 0;
                text-align: justify;
                hyphens: auto;
                -webkit-hyphens: auto;
              }
              
              h1, h2, h3, h4, h5, h6 {
                color: #1E293B;
                margin: 1.5em 0 0.5em;
                page-break-after: avoid;
              }
              
              h1 { font-size: 1.8em; }
              h2 { font-size: 1.5em; }
              h3 { font-size: 1.3em; }
              
              img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 1em auto;
              }
              
              .word {
                display: inline;
                padding: 2px 4px;
                border-radius: 4px;
                cursor: pointer;
              }
              
              .word:active {
                background: #FEF3C7 !important;
              }
              
              a {
                color: #0EA5E9;
                text-decoration: none;
              }
              
              blockquote {
                border-left: 3px solid #CBD5E1;
                margin: 1em 0;
                padding-left: 1em;
                color: #64748B;
                font-style: italic;
              }
              
              .drop-cap::first-letter {
                font-size: 3em;
                font-weight: bold;
                float: left;
                margin-right: 0.1em;
                line-height: 1;
              }
            </style>
          </head>
          <body>
            <div class="page">
              ${content}
            </div>
          </body>
        </html>
      `;
      setChapterContent(html);
      setCurrentChapterIndex(index);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading chapter:', error);
      setChapterContent(`
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; padding: 24px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h2 style="color: #F59E0B; font-size: 20px; margin: 0 0 12px 0;">Error en el capítulo</h2>
          <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin: 0;">
            No se pudo cargar este capítulo.<br/>
            Puedes intentar con el siguiente.
          </p>
        </div>
      `);
    }
  };

  const handleWordTap = useCallback(async (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    setDictLoading(true);
    setSelectedWord(cleanWord);

    const result = await dictionaryService.lookup(cleanWord);
    setLookupResult(result);
    setDictLoading(false);
  }, []);

  const handleNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentChapterIndex > 0) {
      loadChapter(currentChapterIndex - 1);
    } else if (direction === 'next' && currentChapterIndex < chapters.length - 1) {
      loadChapter(currentChapterIndex + 1);
    }
  };

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'wordTap' && data.word) {
        handleWordTap(data.word);
      } else if (data.type === 'pageChange') {
        setCurrentPage(data.page);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.warn('Error parsing WebView message:', error);
    }
  }, [handleWordTap]);

  const injectedJavaScript = `
    (function() {
      // Make words clickable
      const textNodes = [];
      function getTextNodes(node) {
        if (node.nodeType === 3 && node.textContent.trim().length > 0) {
          textNodes.push(node);
        } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
          for (let i = 0; i < node.childNodes.length; i++) {
            getTextNodes(node.childNodes[i]);
          }
        }
      }
      getTextNodes(document.body);
      
      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const words = text.split(/(\\s+)/);
        const fragment = document.createDocumentFragment();
        
        words.forEach(word => {
          if (word.trim().length >= 2 && /^[a-zA-Z]+$/.test(word.trim())) {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = word;
            span.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'wordTap',
                word: word.trim()
              }));
              return false;
            };
            fragment.appendChild(span);
          } else {
            fragment.appendChild(document.createTextNode(word));
          }
        });
        
        textNode.parentNode.replaceChild(fragment, textNode);
      });
      
      // Calculate pages based on scroll width
      const calculatePages = () => {
        const columnWidth = ${SCREEN_WIDTH - 40};
        const scrollWidth = document.body.scrollWidth;
        const totalPages = Math.ceil(scrollWidth / columnWidth);
        const currentPage = Math.ceil(document.body.scrollLeft / columnWidth) + 1;
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'pageChange',
          page: currentPage,
          totalPages: totalPages
        }));
      };
      
      // Listen for scroll events
      document.body.addEventListener('scroll', calculatePages);
      setTimeout(calculatePages, 500);
      
      true;
    })();
  `;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        <Pressable onPress={() => setShowToc(true)} style={styles.tocButton}>
          <Text style={styles.tocText}>📑</Text>
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
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: chapterContent }}
              style={styles.webview}
              onMessage={handleMessage}
              injectedJavaScript={injectedJavaScript}
              scrollEnabled={true}
              horizontal={true}
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              cacheEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              nestedScrollEnabled={true}
              decelerationRate="normal"
              automaticallyAdjustContentInsets={false}
            />
          </View>

          <View style={styles.navBar}>
            <Pressable
              style={[styles.navButton, currentChapterIndex === 0 && styles.navButtonDisabled]}
              onPress={() => handleNavigation('prev')}
              disabled={currentChapterIndex === 0}
            >
              <Text style={styles.navButtonText}>Cap. Anterior</Text>
            </Pressable>
            <View style={styles.progressContainer}>
              <Text style={styles.chapterIndicator}>
                {currentChapterIndex + 1} / {chapters.length}
              </Text>
              {totalPages > 1 && (
                <Text style={styles.pageIndicator}>
                  Pág. {currentPage} / {totalPages}
                </Text>
              )}
            </View>
            <Pressable
              style={[styles.navButton, currentChapterIndex >= chapters.length - 1 && styles.navButtonDisabled]}
              onPress={() => handleNavigation('next')}
              disabled={currentChapterIndex >= chapters.length - 1}
            >
              <Text style={styles.navButtonText}>Cap. Sig.</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Table of Contents Modal */}
      <Modal animationType="slide" transparent visible={showToc}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowToc(false)}>
          <View style={styles.tocModal}>
            <View style={styles.tocHeader}>
              <Text style={styles.tocTitle}>Índice</Text>
              <Pressable onPress={() => setShowToc(false)}>
                <Text style={styles.tocClose}>✕</Text>
              </Pressable>
            </View>
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  back: {
    color: '#0EA5E9',
    fontSize: 14,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  tocButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tocText: {
    fontSize: 16,
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
    backgroundColor: '#F8FAFC',
  },
  webview: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#0EA5E9',
  },
  navButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
  },
  chapterIndicator: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
  },
  tocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tocTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tocClose: {
    fontSize: 20,
    color: '#64748B',
    padding: 4,
  },
  tocItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    maxHeight: '70%',
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
