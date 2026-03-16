# Modelos de Datos — Ogma

## Libro
```ts
interface Book {
  id: string;
  title: string;
  author: string;
  filePath: string;
  progress: number; // 0-100
  lastChapter?: string;
  lastLocation?: string; // cfi
}
```

## Diccionario
```ts
interface DictionaryEntry {
  word: string; // key
  definitionEs: string;
  definitionEn?: string;
  example?: string;
}
```

## Vocabulario
```ts
interface VocabEntry {
  word: string;
  savedAt: string;
  context?: string;
  bookId?: string;
}
```
