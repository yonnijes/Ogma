import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Book, VocabEntry } from '../types/domain';

const STORAGE_KEYS = {
  books: 'ogma:books',
  vocab: 'ogma:vocab',
};

export async function loadBooks(): Promise<Book[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.books);
  return raw ? (JSON.parse(raw) as Book[]) : [];
}

export async function saveBooks(books: Book[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.books, JSON.stringify(books));
}

export async function loadVocab(): Promise<VocabEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.vocab);
  return raw ? (JSON.parse(raw) as VocabEntry[]) : [];
}

export async function saveVocab(entries: VocabEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.vocab, JSON.stringify(entries));
}
