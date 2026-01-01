# 🗺️ ROADMAP: kindle-tools-ts

> Este documento describe las funcionalidades planificadas para futuras versiones de **kindle-tools-ts**.

---

## ✅ Completado

### v1.1.0 (Diciembre 2025)
- ✅ Title Cleaner (eliminación de markers de edición)
- ✅ Text Cleaner (de-hyphenation, espacios, caracteres invisibles)
- ✅ Detección de highlights sospechosos/accidentales
- ✅ Fuzzy duplicate detection (Jaccard similarity)

### v1.2.0 (Enero 2026)
- ✅ Page number formatting (zero-padding `[0042]`)
- ✅ Geo-tagging support (ubicación de lectura)
- ✅ Smart tag mining (extracción de tags desde notas)
- ✅ Heuristic page calculation (estimación desde location)
- ✅ Extended stats (`avgWordsPerHighlight`, `avgHighlightsPerBook`)

---

## 🔮 Futuro (v2.0.0+)

### Prioridad ALTA

#### 1. **Streaming Parser para archivos grandes**
**Problema del usuario**: Archivos > 5MB bloquean la UI/CLI.

```typescript
export async function* parseFileStream(
  filePath: string, 
  chunkSize = 16 * 1024
): AsyncGenerator<Clipping> {
  // Read file in 16KB chunks
  // Yield clippings as they are parsed
}
```

---

### Prioridad MEDIA

#### 2. **Quote Card Generator**
**Problema del usuario**: Compartir citas bonitas en redes sociales.

```typescript
export function generateQuoteCard(clipping: Clipping, style?: 'modern' | 'classic'): Buffer {
  // Generate PNG with quote, author, book title
  // Beautiful typography, gradient background
}
```

---

#### 3. **vocab.db Support (Flashcards)**
**Problema del usuario**: Kindle tiene un archivo SQLite con palabras buscadas. Perfecto para Anki.

```typescript
export async function parseVocabDb(dbPath: string): Promise<VocabEntry[]> {
  // Parse system/vocabulary/vocab.db
  // Return words with context
}
```

---

#### 4. **Open Library Covers API**
Enriquecer exportaciones con portadas de libros:

```typescript
export async function fetchBookCover(title: string, author: string): Promise<string | null> {
  // Use Open Library API (free, no API key)
  // https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg
}
```

---

### Prioridad BAJA

#### 5. **Direct Joplin Sync via API**
**Problema del usuario**: No quieren importar archivos, quieren sincronización directa.

```typescript
export class JoplinApi {
  constructor(private token: string, private port = 41184) {}
  
  async createNote(title: string, body: string, parentId: string): Promise<string> {
    // POST to http://localhost:{port}/notes
  }
}
```

---

#### 6. **AI Auto-Tagging (Zero-Shot Classification)**
Usar modelo ligero para categorizar highlights sin entrenamiento previo.

Opciones:
- Integración con Ollama para modelos locales
- API de OpenAI/Claude para clasificación
- Modelo ligero embebido (transformers.js)

---

#### 7. **GUI Desktop App**
Aplicación de escritorio con:
- Electron o Tauri
- Vista previa de highlights
- Edición inline
- Exportación con un clic

---

## � Estado Comparativo con Python

| Categoría | Python ✅ | TypeScript ✅ | Estado |
|-----------|-----------|---------------|--------|
| Parser multi-idioma | ✅ 6 idiomas | ✅ 11 idiomas | **TS mejor** |
| Detección automática de idioma | ✅ | ✅ | Similar |
| IDs determinísticos | ✅ SHA-256 | ✅ SHA-256 | Similar |
| Smart Merging | ✅ | ✅ | Similar |
| Deduplicación | ✅ | ✅ | Similar |
| Vinculación Notas↔Highlights | ✅ | ✅ | Similar |
| Export JEX/Markdown/CSV/JSON | ✅ | ✅ | Similar |
| Export HTML | ❌ | ✅ | **TS mejor** |
| GUI Desktop | ✅ PyQt5 | ❌ | **Solo Python** |
| CLI | ✅ | ✅ | Similar |
| Title/Text Cleaner | ✅ | ✅ | Similar |
| Suspicious Highlight Detection | ✅ | ✅ | Similar |
| Fuzzy Duplicate Detection | ✅ | ✅ | Similar |
| Page Utilities | ✅ | ✅ | Similar |
| Tag Mining | ✅ | ✅ | Similar |
| Geo-location | ✅ | ✅ | Similar |
| Streaming Parser | Planificado | ❌ | Pendiente |
| Quote Cards | Planificado | ❌ | Pendiente |
| vocab.db Support | Planificado | ❌ | Pendiente |

---

## 🔗 Referencias

- [KindleClippingsToJEX (Python)](https://github.com/KindleTools/KindleClippingsToJEX)
- [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers)
- [Joplin Data API](https://joplinapp.org/api/references/rest_api/)
- [Transformers.js](https://huggingface.co/docs/transformers.js)

---

*Última actualización: 2026-01-01*
