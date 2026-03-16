export interface Book {
  id: string;
  title: string;
  author: string;
  filePath?: string;
  progress: number; // 0-100
  lastChapter?: string;
  lastLocation?: string; // cfi / locator
}

export interface DictionaryEntry {
  word: string;
  definitionEs: string;
  definitionEn?: string;
  example?: string;
}

export interface VocabEntry {
  word: string;
  savedAt: string;
  context?: string;
  bookId?: string;
}
