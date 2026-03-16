# Arquitectura — Ogma

## Enfoque Local‑First
- Sin backend
- EPUBs almacenados localmente
- Progreso y vocabulario en SQLite
- Diccionario embebido (JSON o SQLite)

## Capas
- **UI**: Pantallas (Biblioteca, Lector, Glosario)
- **Servicios**: EPUB parser, diccionario, TTS
- **Persistencia**: SQLite / AsyncStorage

## Flujo Principal
1. Usuario importa EPUB
2. Se copia al storage privado
3. Lector renderiza capítulo
4. Tap en palabra → lookup local → bottom sheet
5. Guardar palabra → glosario
