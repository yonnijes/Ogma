import nlp from 'compromise';
import type { DictionaryEntry } from '../types/domain';

// Simple suffix rules for English lemmatization
const SUFFIX_RULES = [
  { pattern: /ing$/, replacement: '' },
  { pattern: /ed$/, replacement: '' },
  { pattern: /es$/, replacement: '' },
  { pattern: /s$/, replacement: '' },
  { pattern: /ly$/, replacement: '' },
];

class DictionaryService {
  private dictionary: DictionaryEntry[] = [];
  private loaded = false;

  async loadDictionary(): Promise<void> {
    if (this.loaded) return;

    try {
      const dict = require('../data/dictionary.json');
      this.dictionary = Array.isArray(dict) ? dict : [];
      this.loaded = true;
      console.log(`[Dictionary] Loaded ${this.dictionary.length} entries`);
    } catch (error) {
      console.warn('[Dictionary] Failed to load dictionary:', error);
      this.dictionary = [];
      this.loaded = true;
    }
  }

  private findExact(word: string): DictionaryEntry | undefined {
    const lower = word.toLowerCase();
    return this.dictionary.find((entry) => entry.word.toLowerCase() === lower);
  }

  private applySuffixRules(word: string): string[] {
    const variants: string[] = [];
    const lower = word.toLowerCase();

    for (const rule of SUFFIX_RULES) {
      if (rule.pattern.test(lower)) {
        const stemmed = lower.replace(rule.pattern, rule.replacement);
        if (stemmed.length > 2) {
          variants.push(stemmed);
        }
      }
    }

    return variants;
  }

  private lemmatizeWithCompromise(word: string): string | null {
    try {
      const doc = nlp(word);
      const lemma = doc.lemmas().text();
      if (lemma && lemma !== word) {
        return lemma.toLowerCase();
      }
    } catch {
      // compromise failed
    }
    return null;
  }

  private findFuzzy(word: string): DictionaryEntry[] {
    const lower = word.toLowerCase();
    const suggestions: DictionaryEntry[] = [];

    for (const entry of this.dictionary.slice(0, 5000)) {
      if (entry.word.toLowerCase().startsWith(lower.slice(0, 3))) {
        suggestions.push(entry);
        if (suggestions.length >= 3) break;
      }
    }

    return suggestions;
  }

  async lookup(word: string): Promise<{
    entry: DictionaryEntry | null;
    lemma: string | null;
    suggestions: DictionaryEntry[];
    method: 'exact' | 'suffix' | 'lemma' | 'fuzzy' | 'not_found';
  }> {
    await this.loadDictionary();

    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (!cleanWord || cleanWord.length < 2) {
      return { entry: null, lemma: null, suggestions: [], method: 'not_found' };
    }

    // Step 1: Exact match
    const exact = this.findExact(cleanWord);
    if (exact) {
      return { entry: exact, lemma: null, suggestions: [], method: 'exact' };
    }

    // Step 2: Suffix rules
    const variants = this.applySuffixRules(cleanWord);
    for (const variant of variants) {
      const found = this.findExact(variant);
      if (found) {
        return { entry: found, lemma: variant, suggestions: [], method: 'suffix' };
      }
    }

    // Step 3: Compromise lemmatization
    const lemma = this.lemmatizeWithCompromise(cleanWord);
    if (lemma) {
      const found = this.findExact(lemma);
      if (found) {
        return { entry: found, lemma, suggestions: [], method: 'lemma' };
      }
    }

    // Step 4: Fuzzy suggestions
    const suggestions = this.findFuzzy(cleanWord);
    if (suggestions.length > 0) {
      return { entry: null, lemma: null, suggestions, method: 'fuzzy' };
    }

    return { entry: null, lemma: null, suggestions: [], method: 'not_found' };
  }
}

export const dictionaryService = new DictionaryService();
