import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { Book, VocabEntry } from '../types/domain';

const STORAGE_KEYS = {
  books: 'ogma_books_v1.json',
  vocab: 'ogma_vocab_v1.json',
};

const BACKUP_PATH = (key: string) => `${FileSystem.documentDirectory}${key}`;

async function safeGet(key: string): Promise<string | null> {
  // 1. Intentar AsyncStorage
  try {
    const val = await AsyncStorage.getItem(key);
    if (val) return val;
  } catch (e) {
    console.warn('AsyncStorage GET failed, using fallback');
  }

  // 2. Intentar FileSystem
  try {
    const fileUri = BACKUP_PATH(key);
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      return await FileSystem.readAsStringAsync(fileUri);
    }
  } catch (e) {
    console.error('FileSystem fallback GET failed', e);
  }
  return null;
}

async function safeSet(key: string, value: string): Promise<void> {
  // 1. Intentar AsyncStorage
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn('AsyncStorage SET failed');
  }

  // 2. Intentar FileSystem (Siempre guardamos aquí por seguridad)
  try {
    await FileSystem.writeAsStringAsync(BACKUP_PATH(key), value);
  } catch (e) {
    console.error('FileSystem fallback SET failed', e);
  }
}

export async function loadBooks(): Promise<Book[]> {
  const raw = await safeGet(STORAGE_KEYS.books);
  return raw ? (JSON.parse(raw) as Book[]) : [];
}

export async function saveBooks(books: Book[]): Promise<void> {
  await safeSet(STORAGE_KEYS.books, JSON.stringify(books));
}

export async function loadVocab(): Promise<VocabEntry[]> {
  const raw = await safeGet(STORAGE_KEYS.vocab);
  return raw ? (JSON.parse(raw) as VocabEntry[]) : [];
}

export async function saveVocab(entries: VocabEntry[]): Promise<void> {
  await safeSet(STORAGE_KEYS.vocab, JSON.stringify(entries));
}
