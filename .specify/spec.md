# Spec — Ogma (Lector Inteligente de Inglés)

## Objetivo
App móvil (React Native) para leer EPUBs y traducir palabras al tocar, **100% offline**.

## Requerimientos Funcionales
- Importar EPUB desde almacenamiento interno
- Biblioteca con libros precargados
- Lector con tap-to-translate
- Bottom sheet con traducción + TTS + guardar
- Persistencia de progreso por libro

## Requerimientos No Funcionales
- Offline-first
- Respuesta < 200ms en lookup
- UI en español

## Datos
- Libros: título, autor, ruta, progreso
- Diccionario: palabra → definición
- Vocabulario: palabra, fecha, contexto
