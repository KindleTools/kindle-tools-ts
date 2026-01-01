# 🗺️ ROADMAP: Ideas from KindleClippingsToJEX (Python) → kindle-tools-ts

> Este documento analiza las características del proyecto Python **KindleClippingsToJEX** y las compara con el npm **kindle-tools-ts**, identificando ideas que se pueden aplicar para resolver problemas reales de los usuarios.

---

## 📊 Estado Comparativo

| Categoría | Python ✅ | TypeScript ✅ | Estado |
|-----------|-----------|---------------|--------|
| Parser multi-idioma | ✅ 6 idiomas | ✅ 11 idiomas | **TS mejor** |
| Detección automática de idioma | ✅ Score-based | ✅ Keyword-based | Similar |
| IDs determinísticos | ✅ SHA-256 | ✅ SHA-256 (12 chars) | Similar |
| Smart Merging (overlapping) | ✅ | ✅ | Similar |
| Deduplicación | ✅ | ✅ | Similar |
| Vinculación Notas↔Highlights | ✅ Range coverage | ✅ Location-based | Similar |
| Export JEX (Joplin) | ✅ | ✅ | Similar |
| Export Markdown (Obsidian) | ✅ ZIP | ✅ Files | Similar |
| Export CSV | ✅ UTF-8-SIG | ✅ BOM | Similar |
| Export JSON | ✅ | ✅ | Similar |
| Export HTML | ❌ | ✅ | **TS mejor** |
| GUI (Desktop App) | ✅ PyQt5 | ❌ | **Solo Python** |
| CLI | ✅ | ✅ | Similar |
| **Title Cleaner (editions)** | ✅ | ✅ **NUEVO** | ✅ Implementado |
| **Text Cleaner (de-hyphen)** | ✅ | ✅ **NUEVO** | ✅ Implementado |
| **Suspicious Highlight Detection** | ✅ | ✅ **NUEVO** | ✅ Implementado |
| **Fuzzy Duplicate Detection** | ✅ | ✅ **NUEVO** | ✅ Implementado |

---

## 🎯 Ideas para Implementar (Priorizadas)

### ✅ IMPLEMENTADO (v1.1.0)

#### 1. **Title Cleaner** ✅ DONE
**Problema del usuario**: Los títulos de Kindle vienen con basura como `(Spanish Edition)`, `[eBook]`, `(Kindle Edition)`, etc.

**Implementación sugerida**:
```typescript
// src/utils/title-cleaner.ts
const TITLE_NOISE_PATTERNS = [
  // File extensions (ya existe)
  /\.mobi$/i, /\.azw3?$/i, /\.pdf$/i, /\.epub$/i,
  
  // Edition markers (NUEVO)
  /\s*\(Spanish Edition\)/i,
  /\s*\(English Edition\)/i,
  /\s*\(Edición española\)/i,
  /\s*\(Kindle Edition\)/i,
  /\s*\(French Edition\)/i,
  /\s*\(German Edition\)/i,
  /\s*\(Edition française\)/i,
  /\s*\[Print Replica\]/i,
  /\s*\[eBook\]/i,
  /\s*\(Edition \d+\)/i,
  
  // Leading numbers (e.g., "01 Book Title")
  /^\d+\s+/,
];

export function cleanTitle(title: string): string {
  let clean = title;
  for (const pattern of TITLE_NOISE_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  return clean.trim();
}
```

---

#### 2. **Text Cleaner** (Higiene de Texto Avanzada)
**Estado actual en Python**: ✅ Implementado en `utils/text_cleaner.py`  
**Estado actual en TS**: ⚠️ Parcial (solo normalización básica)

**Problema del usuario**: Contenido con guiones de PDF, espacios antes de puntuación, caracteres invisibles.

**Features a añadir**:
- [x] Normalización Unicode (NFC) - Ya existe
- [ ] **De-hyphenation** (PDF line breaks): `word-\nsuffix` → `wordsuffix`
- [ ] Eliminar espacios antes de puntuación: `Hello ,` → `Hello,`
- [ ] Colapsar múltiples espacios
- [ ] Eliminar caracteres de control (BOM, zero-width spaces dentro del texto)
- [ ] Capitalizar primera letra si es fragmento

```typescript
// src/utils/text-cleaner.ts
export function cleanText(text: string): string {
  let clean = text;
  
  // Unicode NFC normalization
  clean = clean.normalize('NFC');
  
  // De-hyphenation (PDF line breaks)
  // "word-\n suffix" → "wordsuffix"
  clean = clean.replace(/([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)-\s*\n\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/g, '$1$2');
  
  // Remove spaces before punctuation
  clean = clean.replace(/\s+([.,;:!?])/g, '$1');
  
  // Collapse multiple spaces
  clean = clean.replace(/ +/g, ' ');
  
  // Remove invisible characters
  clean = clean.replace(/\ufeff/g, '').replace(/\u200b/g, '');
  
  return clean.trim();
}
```

---

#### 3. **Detección de Highlights "Accidentales"**
**Estado actual en Python**: ✅ En `SmartDeduplicator`  
**Estado actual en TS**: ❌ No implementado

**Problema del usuario**: Al usar Kindle, a veces se hacen highlights accidentales cortos que ensucian la exportación.

**Heurística**:
- Highlight < 5 caracteres → **Basura**
- Highlight < 75 chars + empieza con minúscula → **Fragmento incompleto**
- Highlight < 75 chars + no termina en `.!?"")` → **Incompleto**

```typescript
// src/utils/validators.ts
export interface ValidationResult {
  isValid: boolean;
  reason?: 'garbage' | 'fragment' | 'incomplete';
}

export function isAccidentalHighlight(content: string): ValidationResult {
  const text = content.trim();
  const length = text.length;
  
  if (length < 5) {
    return { isValid: false, reason: 'garbage' };
  }
  
  if (length < 75 && /^[a-záéíóú]/.test(text)) {
    return { isValid: false, reason: 'fragment' };
  }
  
  if (length < 75 && !/[.!?""\)]$/.test(text)) {
    return { isValid: false, reason: 'incomplete' };
  }
  
  return { isValid: true };
}
```

---

#### 4. **Fuzzy Deduplication (Jaccard Similarity)**
**Estado actual en Python**: ✅ En `IdentityService`  
**Estado actual en TS**: ❌ Solo dedup exacta

**Problema del usuario**: Kindle a veces cambia sutilmente un highlight (un carácter más o menos). La dedup exacta no lo detecta.

```typescript
// src/utils/similarity.ts
export function jaccardSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const normalize = (s: string) => 
    s.toLowerCase().replace(/[.,;:!?]/g, '').split(/\s+/);
  
  const set1 = new Set(normalize(text1));
  const set2 = new Set(normalize(text2));
  
  const intersection = [...set1].filter(x => set2.has(x)).length;
  const union = new Set([...set1, ...set2]).size;
  
  return union > 0 ? intersection / union : 0;
}

export function isFuzzyDuplicate(clip1: Clipping, clip2: Clipping, threshold = 0.9): boolean {
  if (clip1.title !== clip2.title) return false;
  if (clip1.location.start !== clip2.location.start) return false;
  
  return jaccardSimilarity(clip1.content, clip2.content) > threshold;
}
```

---

### 🟡 Prioridad MEDIA (Mejoran significativamente la experiencia)

#### 5. **Page Number Formatting** (Zero-padding para ordenación)
**Estado actual en Python**: ✅ Usa formato `[0042]`  
**Estado actual en TS**: ❌ Número crudo

**Problema del usuario**: En listados, la página 5 aparece después de la 42 si no hay zero-padding.

```typescript
export function formatPage(page: number | null): string {
  if (page === null) return '';
  return `[${String(page).padStart(4, '0')}]`;
}
```

---

#### 6. **Geo-tagging Support**
**Estado actual en Python**: ✅ En config.json  
**Estado actual en TS**: ❌ No implementado

**Problema del usuario**: Algunos usuarios (tipo Notion/Roam) quieren metadatos de dónde leían.

```typescript
interface ParseOptions {
  // ...existing
  geoLocation?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
}
```

---

#### 7. **Smart Tag Mining desde Notas**
**Estado actual en Python**: ✅ En parser, split por `,;.\n`  
**Estado actual en TS**: ❌ No implementado

**Problema del usuario**: Kindle Notes a menudo contienen tags (e.g., "productivity, psychology"). Estos deberían extraerse automáticamente.

```typescript
export function extractTagsFromNote(noteContent: string): string[] {
  const tags = noteContent.split(/[.,;\n\r]/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && t.length < 30)
    .filter(t => /^[a-zA-Z]/.test(t)); // Must start with letter
  
  return [...new Set(tags)];
}
```

---

#### 8. **Calculating Heuristic Page from Location**
**Estado actual en Python**: ✅ Usa location / ~16 como heurística  
**Estado actual en TS**: ❌ No implementado

**Problema del usuario**: Muchos clippings no tienen número de página (especialmente ebooks). Se puede calcular heurísticamente.

```typescript
const LOCATIONS_PER_PAGE = 16; // Kindle approximate

export function estimatePageFromLocation(location: { start: number }): number {
  return Math.ceil(location.start / LOCATIONS_PER_PAGE);
}
```

---

#### 9. **Stats: Palabras Promedio por Highlight**
**Estado actual en Python**: ✅ "Avg/Book" en GUI  
**Estado actual en TS**: ⚠️ Parcial

**Añadir a stats**:
```typescript
interface ClippingsStats {
  // ...existing
  avgWordsPerHighlight: number;
  avgHighlightsPerBook: number;
}
```

---

### 🟢 Prioridad BAJA (Nice-to-have, futuro)

#### 10. **Streaming Parser para archivos grandes**
**Estado actual en Python**: Planificado en roadmap (Fase 3)  
**Estado actual en TS**: ❌ No implementado

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

#### 11. **Quote Card Generator**
**Estado actual en Python**: Planificado (Fase 6)  
**Estado actual en TS**: ❌ No implementado

**Problema del usuario**: Compartir citas bonitas en redes sociales.

```typescript
export function generateQuoteCard(clipping: Clipping, style?: 'modern' | 'classic'): Buffer {
  // Generate PNG with quote, author, book title
  // Beautiful typography, gradient background
}
```

---

#### 12. **vocab.db Support (Flashcards)**
**Estado actual en Python**: Planificado (Fase 6)  
**Estado actual en TS**: ❌ No implementado

**Problema del usuario**: Kindle tiene un archivo SQLite con palabras buscadas. Perfecto para Anki.

```typescript
export async function parseVocabDb(dbPath: string): Promise<VocabEntry[]> {
  // Parse system/vocabulary/vocab.db
  // Return words with context
}
```

---

#### 13. **Open Library Covers API**
**Estado actual en Python**: Planificado (Fase 6)  
**Estado actual en TS**: ❌ No implementado

**Enriquecer exportaciones con portadas de libros**:
```typescript
export async function fetchBookCover(title: string, author: string): Promise<string | null> {
  // Use Open Library API (free, no API key)
  // https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg
}
```

---

#### 14. **Direct Joplin Sync via API**
**Estado actual en Python**: Planificado (Fase 5)  
**Estado actual en TS**: ❌ No implementado

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

#### 15. **AI Auto-Tagging (Zero-Shot Classification)**
**Estado actual en Python**: Planificado (Fase 7)  
**Estado actual en TS**: ❌ No implementado

**Usar modelo ligero para categorizar highlights sin entrenamiento previo**.

---

## 📋 Resumen de Prioridades

### Para la próxima versión minor (v1.1.0)
1. ✅ Title Cleaner (patrones de edición)
2. ✅ Text Cleaner (de-hyphenation, espacios)
3. ✅ Detección highlights accidentales
4. ✅ Jaccard Similarity para fuzzy dedup

### Para v1.2.0
5. Page number formatting
6. Geo-tagging support
7. Smart tag mining
8. Heuristic page calculation
9. Extended stats

### Futuro (v2.0.0)
10. Streaming parser
11. Quote card generator
12. vocab.db support
13. Open Library covers
14. Joplin direct sync
15. AI auto-tagging

---

## 🔗 Referencias

- [KindleClippingsToJEX (Python)](https://github.com/KindleTools/KindleClippingsToJEX)
- [Python Roadmap](https://github.com/KindleTools/KindleClippingsToJEX/blob/main/roadmap.md)
- [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers)
- [Joplin Data API](https://joplinapp.org/api/references/rest_api/)

---

*Última actualización: 2026-01-01*
