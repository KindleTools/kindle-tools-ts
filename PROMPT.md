# Generación de kindle-tools-ts

**Rol:** Actúa como un Staff Software Engineer experto en Node.js, TypeScript y desarrollo de herramientas Open Source.

**Objetivo:** Generar el andamiaje y el código core de `kindle-tools-ts`, una NPM Package de nivel enterprise para procesar archivos `My Clippings.txt` de Amazon Kindle. Esta librería debe ser la referencia en el ecosistema TypeScript para este propósito.

---

## Tabla de Contenidos

1. [Contexto y Filosofía](#contexto-y-filosofía)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Fases de Implementación](#fases-de-implementación)
4. [Modelado de Datos](#modelado-de-datos)
5. [Core: Parser y Processor](#core-parser-y-processor)
6. [Exporters](#exporters)
7. [CLI Tool](#cli-tool)
8. [Testing Strategy](#testing-strategy)
9. [Documentación y Publicación](#documentación-y-publicación)

---

## Contexto y Filosofía

### ¿Qué es My Clippings.txt?

El archivo `My Clippings.txt` es un archivo de texto plano ubicado en la carpeta `documents` de cualquier dispositivo Kindle. Amazon lo utiliza como un log append-only donde se almacenan todos los highlights, notas y bookmarks del usuario.

**Características importantes:**
- Es un archivo **append-only**: las ediciones o eliminaciones en el Kindle NO modifican entradas anteriores, solo añaden nuevas
- Contiene entradas separadas por `==========`
- El formato varía según el **idioma del Kindle** (no del libro)
- Puede contener caracteres BOM (Byte Order Mark) al inicio
- Los saltos de línea pueden ser Windows (`\r\n`) o Unix (`\n`)
- Los libros "sideloaded" (no comprados en Amazon) pueden tener extensiones como `.pdf`, `.epub`, `_EBOK` en el título

### Filosofía del Proyecto

1. **TypeScript-first**: Types estrictos, sin `any`, exportar todas las interfaces
2. **Zero dependencies en runtime** (o mínimas): Solo `date-fns` para fechas
3. **Tree-shakeable**: Cada función debe ser importable individualmente
4. **Tested**: 100% coverage en core logic
5. **Documented**: JSDoc completo, README exhaustivo, ejemplos reales

---

## Arquitectura del Proyecto

### Patrón de Diseño

Utiliza el **Patrón Strategy** para separar responsabilidades:

```
┌─────────────────────────────────────────────────────────────┐
│                         kindle-tools-ts                      │
├─────────────────────────────────────────────────────────────┤
│  INPUT                                                       │
│  ┌──────────────┐                                           │
│  │ My Clippings │ ──► raw string                            │
│  │    .txt      │                                           │
│  └──────────────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │              CORE (parser.ts + processor.ts)      │       │
│  │  ┌────────────┐    ┌─────────────┐    ┌────────┐ │       │
│  │  │ Tokenizer  │ ►► │   Parser    │ ►► │Processor│ │       │
│  │  │ (split)    │    │ (extract)   │    │(clean) │ │       │
│  │  └────────────┘    └─────────────┘    └────────┘ │       │
│  └──────────────────────────────────────────────────┘       │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │  Clipping[]  │ ── Array de objetos tipados               │
│  └──────────────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │              EXPORTERS (Strategy Pattern)         │       │
│  │  ┌─────┐ ┌─────┐ ┌──────────┐ ┌──────┐ ┌──────┐ │       │
│  │  │JSON │ │ CSV │ │ Markdown │ │Joplin│ │Readwise│ │       │
│  │  └─────┘ └─────┘ └──────────┘ └──────┘ └──────┘ │       │
│  └──────────────────────────────────────────────────┘       │
│         │                                                    │
│         ▼                                                    │
│  OUTPUT: string | File | API call                            │
└─────────────────────────────────────────────────────────────┘
```

### Build System

Configuración **Dual Build** (ESM y CommonJS) utilizando `tsup`:

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false, // Para debugging más fácil
});
```

### Tooling Obligatorio

| Tool | Propósito | Configuración |
|------|-----------|---------------|
| `tsup` | Bundler TypeScript | Dual ESM/CJS output |
| `vitest` | Testing framework | Con coverage |
| `eslint` | Linting | Config flat (ESLint 9+) |
| `prettier` | Formatting | Consistencia de código |
| `husky` | Git hooks | Pre-commit: lint + test |
| `lint-staged` | Staged files | Solo archivos modificados |
| `zod` | Validación | Esquemas de config y output |
| `changesets` | Versioning | Semantic versioning automático |

### Estructura de Archivos

```text
kindle-tools-ts/
├── src/
│   ├── core/
│   │   ├── tokenizer.ts       # Divide el archivo en bloques raw
│   │   ├── parser.ts          # Extrae metadata de cada bloque
│   │   ├── processor.ts       # Limpieza, merge, dedup
│   │   ├── language-detector.ts # Detecta idioma automáticamente
│   │   └── constants.ts       # LANGUAGE_MAP, Regex patterns, config
│   │
│   ├── exporters/
│   │   ├── base.ts            # Interfaz base Exporter
│   │   ├── json.exporter.ts
│   │   ├── csv.exporter.ts
│   │   ├── markdown.exporter.ts
│   │   ├── obsidian.exporter.ts
│   │   ├── joplin.exporter.ts
│   │   └── html.exporter.ts
│   │
│   ├── utils/
│   │   ├── dates.ts           # Parsing robusto de fechas multi-locale
│   │   ├── sanitizers.ts      # Limpieza de títulos, autores, contenido
│   │   ├── normalizers.ts     # Unicode NFC, espacios, caracteres especiales
│   │   ├── hashing.ts         # Generación de IDs deterministas
│   │   └── stats.ts           # Estadísticas y analytics
│   │
│   ├── types/
│   │   ├── clipping.ts        # Interface Clipping principal
│   │   ├── config.ts          # Opciones de configuración
│   │   ├── exporter.ts        # Interface Exporter
│   │   ├── language.ts        # Types de idiomas soportados
│   │   └── index.ts           # Re-exports
│   │
│   ├── schemas/
│   │   ├── config.schema.ts   # Zod schema para config
│   │   └── clipping.schema.ts # Zod schema para validación
│   │
│   ├── cli.ts                 # Entry point CLI
│   └── index.ts               # Entry point Librería (exports públicos)
│
├── tests/
│   ├── fixtures/              # Archivos My Clippings.txt de ejemplo
│   │   ├── english.txt
│   │   ├── spanish.txt
│   │   ├── german.txt
│   │   ├── chinese.txt
│   │   ├── mixed-languages.txt
│   │   ├── with-bom.txt
│   │   ├── edge-cases.txt
│   │   └── large-file.txt     # Para performance tests
│   │
│   ├── unit/
│   │   ├── tokenizer.test.ts
│   │   ├── parser.test.ts
│   │   ├── processor.test.ts
│   │   ├── language-detector.test.ts
│   │   ├── dates.test.ts
│   │   ├── sanitizers.test.ts
│   │   └── normalizers.test.ts
│   │
│   ├── integration/
│   │   ├── full-pipeline.test.ts
│   │   └── exporters.test.ts
│   │
│   └── e2e/
│       └── cli.test.ts
│
├── .husky/
│   └── pre-commit
│
├── .github/
│   └── workflows/
│       ├── ci.yml             # Tests en PR
│       ├── publish.yml        # Publicar a npm
│       └── quality.yml        # Linting, tipos
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## Fases de Implementación

### 🔵 FASE 1: Scaffolding y Configuración Base
**Objetivo:** Crear la estructura del proyecto con toda la configuración de tooling.

**Tareas:**
1. Inicializar proyecto con `pnpm init`
2. Configurar `package.json` con:
   - `type: "module"`
   - Scripts: `build`, `test`, `lint`, `format`, `prepare`
   - Exports para ESM/CJS
   - Campos: `main`, `module`, `types`, `exports`, `files`
3. Instalar dependencias:
   - **Runtime**: `date-fns`, `zod`
   - **Dev**: `typescript`, `tsup`, `vitest`, `eslint`, `prettier`, `husky`, `lint-staged`, `@types/node`
4. Configurar `tsconfig.json` con strict mode
5. Configurar `tsup.config.ts` para dual build
6. Configurar `vitest.config.ts` con coverage
7. Configurar `eslint.config.js` (formato flat, ESLint 9+)
8. Configurar `.prettierrc`
9. Configurar Husky + lint-staged
10. Crear estructura de carpetas vacías
11. Crear `src/index.ts` con exports placeholder

**Entregables:**
- Proyecto que compila con `pnpm build`
- `pnpm test` ejecuta (aunque no hay tests todavía)
- `pnpm lint` funciona
- Husky intercepta commits

---

### 🟢 FASE 2: Types y Constantes
**Objetivo:** Definir todas las interfaces y constantes del proyecto.

**Tareas:**
1. Crear `src/types/language.ts`:
   ```typescript
   export type SupportedLanguage = 'en' | 'es' | 'pt' | 'de' | 'fr' | 'it' | 'zh' | 'ja' | 'ko' | 'nl' | 'ru';
   
   export interface LanguagePatterns {
     addedOn: string;           // "Added on", "Añadido el", etc.
     highlight: string;         // "Your Highlight", "Tu subrayado"
     note: string;              // "Your Note", "Tu nota"
     bookmark: string;          // "Your Bookmark", "Tu marcador"
     clip: string;              // "Your Clip" (artículos web)
     page: string;              // "page", "página"
     location: string;          // "Location", "Posición"
     dateFormats: string[];     // Formatos de fecha posibles
   }
   ```

2. Crear `src/types/clipping.ts`:
   ```typescript
   export type ClippingType = 'highlight' | 'note' | 'bookmark' | 'clip' | 'article';
   
   export interface ClippingLocation {
     raw: string;               // "105-106" o "105"
     start: number;             // 105
     end: number | null;        // 106 o null si es single
   }
   
   export interface Clipping {
     // Identificación
     id: string;                // Hash determinista único
     
     // Libro y autor
     title: string;             // Título limpio del libro
     titleRaw: string;          // Título original sin limpiar
     author: string;            // Autor extraído y limpio
     authorRaw: string;         // Autor original
     
     // Contenido
     content: string;           // Texto del highlight/nota limpio
     contentRaw: string;        // Texto original
     
     // Metadatos de tipo
     type: ClippingType;
     
     // Ubicación
     page: number | null;       // Número de página (puede no existir)
     location: ClippingLocation;
     
     // Fechas
     date: Date | null;         // Fecha parseada (null si falla)
     dateRaw: string;           // Fecha original como string
     
     // Flags y metadata adicional
     isLimitReached: boolean;   // True si el contenido indica límite DRM
     isEmpty: boolean;          // True si no hay contenido
     language: SupportedLanguage; // Idioma detectado de la entrada
     source: 'kindle' | 'sideload'; // Si el libro es de Amazon o sideloaded
     
     // Estadísticas del contenido
     wordCount: number;         // Número de palabras
     charCount: number;         // Número de caracteres
     
     // Para Smart Merging
     linkedNoteId?: string;     // ID de la nota asociada (si existe)
     linkedHighlightId?: string; // ID del highlight asociado (si es nota)
     
     // Metadata del bloque original
     blockIndex: number;        // Índice del bloque en el archivo original
   }
   ```

3. Crear `src/types/config.ts`:
   ```typescript
   export interface ParseOptions {
     // Idioma
     language?: SupportedLanguage | 'auto'; // 'auto' detecta automáticamente
     
     // Procesamiento
     removeDuplicates?: boolean;   // Default: true
     mergeNotes?: boolean;         // Default: true (asociar notas con highlights)
     mergeOverlapping?: boolean;   // Default: true (Smart Merge de highlights)
     
     // Limpieza
     normalizeUnicode?: boolean;   // Default: true (NFC normalization)
     cleanContent?: boolean;       // Default: true (trim, espacios múltiples)
     cleanTitles?: boolean;        // Default: true (quitar extensiones)
     
     // Filtrado
     excludeTypes?: ClippingType[];     // Excluir ciertos tipos
     excludeBooks?: string[];           // Excluir libros por título
     onlyBooks?: string[];              // Solo incluir estos libros
     minContentLength?: number;         // Mínimo de caracteres en content
     
     // Fechas
     dateLocale?: string;          // Locale para parseo de fechas
     
     // Modo
     strict?: boolean;             // Default: false. True = throw en errores
   }
   
   export interface ParseResult {
     clippings: Clipping[];
     stats: ClippingsStats;
     warnings: ParseWarning[];
     meta: {
       fileSize: number;
       parseTime: number;
       detectedLanguage: SupportedLanguage;
     };
   }
   
   export interface ParseWarning {
     type: 'date_parse_failed' | 'unknown_format' | 'encoding_issue' | 'empty_content';
     message: string;
     blockIndex: number;
     raw?: string;
   }
   ```

4. Crear `src/types/stats.ts`:
   ```typescript
   export interface ClippingsStats {
     // Totales
     total: number;
     totalHighlights: number;
     totalNotes: number;
     totalBookmarks: number;
     totalClips: number;
     
     // Por libro
     totalBooks: number;
     totalAuthors: number;
     booksList: BookStats[];
     
     // Procesamiento
     duplicatesRemoved: number;
     mergedHighlights: number;
     linkedNotes: number;
     emptyRemoved: number;
     drmLimitReached: number;
     
     // Fechas
     dateRange: {
       earliest: Date | null;
       latest: Date | null;
     };
     
     // Contenido
     totalWords: number;
     avgWordsPerHighlight: number;
     avgHighlightsPerBook: number;
   }
   
   export interface BookStats {
     title: string;
     author: string;
     highlights: number;
     notes: number;
     bookmarks: number;
     wordCount: number;
     dateRange: { earliest: Date | null; latest: Date | null };
   }
   ```

5. Crear `src/core/constants.ts` con el LANGUAGE_MAP completo:
   ```typescript
   export const LANGUAGE_MAP: Record<SupportedLanguage, LanguagePatterns> = {
     en: {
       addedOn: 'Added on',
       highlight: 'Your Highlight',
       note: 'Your Note',
       bookmark: 'Your Bookmark',
       clip: 'Your Clip',
       page: 'page',
       location: 'Location',
       dateFormats: [
         'EEEE, MMMM d, yyyy h:mm:ss a',  // Friday, January 1, 2024 10:30:45 AM
         'EEEE, d MMMM yyyy HH:mm:ss',     // Friday, 1 January 2024 10:30:45
       ],
     },
     es: {
       addedOn: 'Añadido el',
       highlight: 'Tu subrayado',
       note: 'Tu nota',
       bookmark: 'Tu marcador',
       clip: 'Tu recorte',
       page: 'página',
       location: 'posición',
       dateFormats: [
         "EEEE, d 'de' MMMM 'de' yyyy H:mm:ss",
       ],
     },
     pt: {
       addedOn: 'Adicionado em',
       highlight: 'Seu destaque',
       note: 'Sua nota',
       bookmark: 'Seu marcador',
       clip: 'Seu recorte',
       page: 'página',
       location: 'posição',
       dateFormats: [
         "EEEE, d 'de' MMMM 'de' yyyy HH:mm:ss",
       ],
     },
     de: {
       addedOn: 'Hinzugefügt am',
       highlight: 'Ihre Markierung',
       note: 'Ihre Notiz',
       bookmark: 'Ihr Lesezeichen',
       clip: 'Ihr Ausschnitt',
       page: 'Seite',
       location: 'Position',
       dateFormats: [
         'EEEE, d. MMMM yyyy HH:mm:ss',
       ],
     },
     fr: {
       addedOn: 'Ajouté le',
       highlight: 'Votre surlignage',
       note: 'Votre note',
       bookmark: 'Votre signet',
       clip: 'Votre extrait',
       page: 'page',
       location: 'emplacement',
       dateFormats: [
         'EEEE d MMMM yyyy HH:mm:ss',
       ],
     },
     it: {
       addedOn: 'Aggiunto il',
       highlight: 'La tua evidenziazione',
       note: 'La tua nota',
       bookmark: 'Il tuo segnalibro',
       clip: 'Il tuo ritaglio',
       page: 'pagina',
       location: 'posizione',
       dateFormats: [
         'EEEE d MMMM yyyy HH:mm:ss',
       ],
     },
     zh: {
       addedOn: '添加于',
       highlight: '您的标注',
       note: '您的笔记',
       bookmark: '您的书签',
       clip: '您的剪贴',
       page: '页',
       location: '位置',
       dateFormats: [
         'yyyy年M月d日EEEE ahh:mm:ss',
       ],
     },
     ja: {
       addedOn: '追加日',
       highlight: 'ハイライト',
       note: 'メモ',
       bookmark: 'ブックマーク',
       clip: 'クリップ',
       page: 'ページ',
       location: '位置',
       dateFormats: [
         'yyyy年M月d日EEEE H:mm:ss',
       ],
     },
     ko: {
       addedOn: '추가됨',
       highlight: '하이라이트',
       note: '메모',
       bookmark: '북마크',
       clip: '클립',
       page: '페이지',
       location: '위치',
       dateFormats: [
         'yyyy년 M월 d일 EEEE a h:mm:ss',
       ],
     },
     nl: {
       addedOn: 'Toegevoegd op',
       highlight: 'Uw markering',
       note: 'Uw notitie',
       bookmark: 'Uw bladwijzer',
       clip: 'Uw knipsel',
       page: 'pagina',
       location: 'locatie',
       dateFormats: [
         'EEEE d MMMM yyyy HH:mm:ss',
       ],
     },
     ru: {
       addedOn: 'Добавлено',
       highlight: 'Ваше выделение',
       note: 'Ваша заметка',
       bookmark: 'Ваша закладка',
       clip: 'Ваша вырезка',
       page: 'страница',
       location: 'позиция',
       dateFormats: [
         'EEEE, d MMMM yyyy г. H:mm:ss',
       ],
     },
   };
   
   // Regex patterns
   export const PATTERNS = {
     SEPARATOR: /={10,}/,
     SEPARATOR_WITH_NEWLINES: /\r?\n={10,}\r?\n/,
     BOM: /^\uFEFF/,
     TITLE_AUTHOR: /^(.+?)\s*\(([^)]+)\)\s*$/,
     SIDELOAD_EXTENSIONS: /\.(pdf|epub|mobi|azw3?|txt|doc|docx|html)$/i,
     EBOK_SUFFIX: /_EBOK$/i,
     LOCATION_RANGE: /(\d+)-(\d+)/,
     LOCATION_SINGLE: /(\d+)/,
     PAGE_NUMBER: /\d+/,
     MULTIPLE_SPACES: /\s{2,}/g,
     CONTROL_CHARS: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
   };
   
   // DRM limit messages en diferentes idiomas
   export const DRM_LIMIT_MESSAGES = [
     'You have reached the clipping limit',
     'Has alcanzado el límite de recortes',
     'Você atingiu o limite de recortes',
     'Sie haben das Markierungslimit erreicht',
     'Vous avez atteint la limite',
     '<You have reached the clipping limit for this item>',
   ];
   ```

6. Crear esquemas Zod en `src/schemas/`

**Entregables:**
- Todas las interfaces TypeScript definidas
- Constantes completas para todos los idiomas
- Esquemas Zod para validación

---

### 🟡 FASE 3: Utilidades Core
**Objetivo:** Implementar todas las funciones de utilidad necesarias.

**Tareas:**

1. **`src/utils/normalizers.ts`** - Normalización de texto:
   ```typescript
   /**
    * Aplica Unicode NFC normalization al texto.
    * Esto es CRÍTICO para evitar duplicados fantasma donde caracteres
    * visualmente idénticos tienen diferente representación binaria.
    * 
    * Ejemplo: "café" puede escribirse como:
    * - "café" (é como un solo carácter U+00E9)
    * - "café" (e + combining acute accent U+0301)
    * 
    * NFC los unifica a la forma compuesta.
    */
   export function normalizeUnicode(text: string): string;
   
   /**
    * Elimina el BOM (Byte Order Mark) del inicio del archivo.
    * El BOM es un carácter invisible (U+FEFF) que algunos editores añaden.
    */
   export function removeBOM(text: string): string;
   
   /**
    * Normaliza saltos de línea a Unix style (\n).
    * Kindle puede usar \r\n (Windows) o \n (Unix).
    */
   export function normalizeLineEndings(text: string): string;
   
   /**
    * Limpia espacios: trim, colapsa múltiples espacios, 
    * normaliza non-breaking spaces.
    */
   export function normalizeWhitespace(text: string): string;
   
   /**
    * Elimina caracteres de control invisibles que pueden causar problemas.
    */
   export function removeControlCharacters(text: string): string;
   
   /**
    * Pipeline completo de normalización de texto.
    */
   export function normalizeText(text: string): string;
   ```

2. **`src/utils/sanitizers.ts`** - Limpieza de metadatos:
   ```typescript
   /**
    * Limpia el título del libro:
    * - Elimina extensiones de archivo (.pdf, .epub, .mobi, etc.)
    * - Elimina sufijos _EBOK
    * - Trim y normaliza espacios
    * 
    * Ejemplo: "Mi Libro.pdf" → "Mi Libro"
    * Ejemplo: "Otro Libro_EBOK" → "Otro Libro"  
    */
   export function sanitizeTitle(title: string): string;
   
   /**
    * Extrae autor del formato "Título (Autor)" 
    * Maneja casos complejos como:
    * - "El Quijote (Miguel de Cervantes)" → autor: "Miguel de Cervantes"
    * - "Book (Author, Name)" → autor: "Author, Name"
    * - "Book ((Nested) Author)" → autor: "(Nested) Author"
    * - "Book Without Author" → autor: "Unknown"
    */
   export function extractAuthor(rawTitle: string): { title: string; author: string };
   
   /**
    * Normaliza el nombre del autor:
    * - "APELLIDO, Nombre" → "Nombre Apellido"
    * - Capitalización correcta
    */
   export function normalizeAuthorName(author: string): string;
   
   /**
    * Detecta si un libro es sideloaded (no comprado en Amazon).
    * Los libros sideloaded suelen tener extensiones o patrones específicos.
    */
   export function isSideloaded(title: string): boolean;
   
   /**
    * Limpia el contenido del highlight/nota:
    * - Normaliza whitespace
    * - Elimina caracteres problemáticos
    * - Detecta contenido vacío o de error DRM
    */
   export function sanitizeContent(content: string): {
     content: string;
     isEmpty: boolean;
     isLimitReached: boolean;
   };
   ```

3. **`src/utils/dates.ts`** - Parsing robusto de fechas:
   ```typescript
   /**
    * Parsea una fecha en formato Kindle a objeto Date.
    * 
    * El formato varía significativamente por idioma:
    * - EN: "Friday, January 1, 2024 10:30:45 AM"
    * - ES: "viernes, 1 de enero de 2024 10:30:45"
    * - DE: "Freitag, 1. Januar 2024 10:30:45"
    * - ZH: "2024年1月1日星期五 上午10:30:45"
    * 
    * @param dateString - String de fecha raw del archivo
    * @param language - Idioma para seleccionar patrones
    * @returns Date object o null si falla el parseo
    */
   export function parseKindleDate(
     dateString: string, 
     language: SupportedLanguage
   ): Date | null;
   
   /**
    * Intenta parsear la fecha probando múltiples formatos.
    * Útil cuando no se conoce el idioma con certeza.
    */
   export function parseKindleDateAuto(dateString: string): {
     date: Date | null;
     detectedLanguage: SupportedLanguage | null;
   };
   ```

4. **`src/utils/hashing.ts`** - IDs deterministas:
   ```typescript
   /**
    * Genera un ID único y DETERMINISTA para un clipping.
    * 
    * El ID debe ser:
    * 1. Determinista: mismo input = mismo output SIEMPRE
    * 2. Único: diferentes clippings = diferentes IDs
    * 3. Corto: para URLs y referencias
    * 
    * Componentes del hash:
    * - Título del libro (normalizado)
    * - Ubicación (location)
    * - Tipo (highlight/note/bookmark)
    * - Primeros N caracteres del contenido
    * 
    * NO usar: fecha (puede variar en formato), contenido completo (muy largo)
    * 
    * @returns String de 12 caracteres alfanuméricos
    */
   export function generateClippingId(
     title: string,
     location: string,
     type: ClippingType,
     contentPrefix: string
   ): string;
   
   /**
    * Genera hash para detección de duplicados.
    * Más estricto que el ID: incluye contenido completo.
    */
   export function generateDuplicateHash(
     title: string,
     location: string,
     content: string
   ): string;
   ```

5. **`src/utils/stats.ts`** - Estadísticas:
   ```typescript
   /**
    * Calcula estadísticas completas de un array de clippings.
    */
   export function calculateStats(clippings: Clipping[]): ClippingsStats;
   
   /**
    * Agrupa clippings por libro.
    */
   export function groupByBook(clippings: Clipping[]): Map<string, Clipping[]>;
   
   /**
    * Cuenta palabras en un texto.
    */
   export function countWords(text: string): number;
   ```

**Entregables:**
- Todas las utilidades implementadas con JSDoc
- Tests unitarios para cada función
- Edge cases cubiertos

---

### 🟠 FASE 4: Core Parser
**Objetivo:** Implementar el parser principal que convierte el archivo raw en Clipping[].

**Tareas:**

1. **`src/core/tokenizer.ts`** - División del archivo:
   ```typescript
   /**
    * Divide el archivo My Clippings.txt en bloques individuales.
    * 
    * Cada bloque está separado por una línea de "==========" (10 o más =).
    * 
    * El tokenizer:
    * 1. Elimina BOM si existe
    * 2. Normaliza saltos de línea
    * 3. Divide por el separador
    * 4. Filtra bloques vacíos
    * 5. Mantiene índice original de cada bloque
    * 
    * @param content - Contenido raw del archivo
    * @returns Array de bloques con su índice
    */
   export function tokenize(content: string): TokenizedBlock[];
   
   interface TokenizedBlock {
     index: number;      // Índice original en el archivo
     raw: string;        // Contenido raw del bloque
     lines: string[];    // Líneas del bloque
   }
   ```

2. **`src/core/language-detector.ts`** - Detección de idioma:
   ```typescript
   /**
    * Detecta el idioma del archivo analizando patrones en los bloques.
    * 
    * Estrategia:
    * 1. Analiza los primeros N bloques (default: 10)
    * 2. Busca patrones conocidos de cada idioma
    * 3. Cuenta "votos" por cada idioma
    * 4. Retorna el idioma con más votos
    * 5. Fallback: 'en' (inglés)
    * 
    * Patrones a buscar:
    * - "Added on" / "Añadido el" / "Ajouté le" etc.
    * - "Your Highlight" / "Tu subrayado" / "Votre surlignage" etc.
    * - "Location" / "Posición" / "Position" etc.
    */
   export function detectLanguage(blocks: TokenizedBlock[]): SupportedLanguage;
   
   /**
    * Detecta idioma de un solo bloque.
    * Útil cuando hay archivos con múltiples idiomas mezclados.
    */
   export function detectBlockLanguage(block: TokenizedBlock): SupportedLanguage | null;
   ```

3. **`src/core/parser.ts`** - Extracción de datos:
   ```typescript
   /**
    * Parsea un bloque tokenizado y extrae todos los metadatos.
    * 
    * Estructura típica de un bloque (inglés):
    * ```
    * Book Title (Author Name)
    * - Your Highlight on page 42 | Location 123-125 | Added on Friday, January 1, 2024 10:30:45 AM
    * 
    * This is the highlighted text content.
    * ```
    * 
    * El parser debe extraer:
    * - Línea 1: Título y autor
    * - Línea 2: Tipo, página, ubicación, fecha
    * - Línea 3+: Contenido (puede ser multilínea)
    */
   export function parseBlock(
     block: TokenizedBlock, 
     language: SupportedLanguage
   ): Clipping | null;
   
   /**
    * Parsea la línea de metadatos (segunda línea del bloque).
    * 
    * Ejemplos:
    * - "- Your Highlight on page 42 | Location 123-125 | Added on Friday..."
    * - "- Tu subrayado en la página 42 | posición 123-125 | Añadido el viernes..."
    * - "- Your Note on Location 123 | Added on Friday..."
    */
   export function parseMetadataLine(
     line: string, 
     language: SupportedLanguage
   ): {
     type: ClippingType;
     page: number | null;
     location: ClippingLocation;
     dateRaw: string;
   } | null;
   ```

4. **`src/core/processor.ts`** - Post-procesamiento:
   ```typescript
   /**
    * Procesa el array de clippings aplicando todas las transformaciones.
    * 
    * Pipeline de procesamiento:
    * 1. Filtrar clippings vacíos o inválidos
    * 2. Aplicar normalización Unicode
    * 3. Limpiar títulos y autores
    * 4. Limpiar contenido
    * 5. Detectar límites DRM
    * 6. Eliminar duplicados exactos
    * 7. Smart Merge de highlights solapados
    * 8. Vincular notas con highlights
    * 9. Generar IDs finales
    * 10. Calcular estadísticas
    */
   export function process(
     clippings: Clipping[], 
     options: ParseOptions
   ): ProcessedResult;
   
   /**
    * SMART MERGING - Funcionalidad crítica
    * 
    * Cuando un usuario subraya un texto y luego lo extiende, Kindle crea
    * DOS entradas en lugar de actualizar la primera. Esto genera duplicados
    * que son "casi iguales" pero no exactamente.
    * 
    * Estrategia de Smart Merge:
    * 1. Agrupar highlights por libro
    * 2. Ordenar por ubicación (location start)
    * 3. Detectar overlapping:
    *    - Si highlight A termina en posición X y highlight B empieza en X-N (solapamiento)
    *    - O si el contenido de A es substring del contenido de B
    * 4. Fusionar manteniendo:
    *    - La versión más larga del contenido
    *    - La fecha más reciente
    *    - El rango de ubicación combinado
    * 
    * Ejemplo:
    * - Highlight A: Location 100-105, "This is some text"
    * - Highlight B: Location 100-110, "This is some text that continues"
    * - Resultado: Location 100-110, "This is some text that continues"
    */
   export function smartMergeHighlights(clippings: Clipping[]): Clipping[];
   
   /**
    * VINCULACIÓN DE NOTAS
    * 
    * Kindle almacena las notas del usuario como entradas separadas,
    * justo después del highlight al que pertenecen, con la MISMA ubicación.
    * 
    * Esta función:
    * 1. Encuentra notas cuya ubicación coincida con un highlight
    * 2. Vincula la nota al highlight mediante linkedNoteId/linkedHighlightId
    * 3. Opcionalmente, fusiona la nota dentro del objeto highlight
    */
   export function linkNotesToHighlights(clippings: Clipping[]): Clipping[];
   
   /**
    * Elimina duplicados exactos basados en hash de contenido + ubicación.
    */
   export function removeDuplicates(clippings: Clipping[]): {
     clippings: Clipping[];
     removedCount: number;
   };
   ```

**Entregables:**
- Parser funcional que procesa archivos en todos los idiomas soportados
- Smart Merging implementado
- Tests con fixtures reales

---

### 🔴 FASE 5: Exporters
**Objetivo:** Implementar todos los exporters siguiendo el patrón Strategy.

**Tareas:**

1. **`src/exporters/base.ts`** - Interfaz base:
   ```typescript
   export interface ExporterOptions {
     outputPath?: string;      // Ruta de salida (para file exporters)
     groupByBook?: boolean;    // Agrupar por libro
     includeStats?: boolean;   // Incluir estadísticas
     template?: string;        // Template personalizado (para MD)
   }
   
   export interface Exporter {
     name: string;
     extension: string;
     export(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult>;
   }
   
   export interface ExportResult {
     success: boolean;
     output: string | Buffer;  // Contenido generado
     files?: ExportedFile[];   // Si genera múltiples archivos
     error?: Error;
   }
   
   export interface ExportedFile {
     path: string;
     content: string | Buffer;
   }
   ```

2. **`src/exporters/json.exporter.ts`**:
   ```typescript
   /**
    * Exporta a JSON con estructura limpia.
    * 
    * Opciones:
    * - pretty: boolean (indentación)
    * - groupByBook: boolean
    * - includeRaw: boolean (incluir campos *Raw)
    */
   export class JsonExporter implements Exporter { }
   ```

3. **`src/exporters/csv.exporter.ts`**:
   ```typescript
   /**
    * Exporta a CSV compatible con Excel.
    * 
    * Consideraciones:
    * - BOM para Excel (caracteres especiales)
    * - Escapar comillas y comas en contenido
    * - Columnas: id, title, author, type, page, location, date, content
    */
   export class CsvExporter implements Exporter { }
   ```

4. **`src/exporters/markdown.exporter.ts`** - Básico:
   ```typescript
   /**
    * Exporta a Markdown básico.
    * Un archivo por libro con estructura:
    * 
    * # Título del Libro
    * *Autor*
    * 
    * ## Highlights
    * 
    * > Texto del highlight
    * — Page 42, Location 123
    * 
    * ### Note
    * Mi nota personal
    */
   export class MarkdownExporter implements Exporter { }
   ```

5. **`src/exporters/obsidian.exporter.ts`** - Obsidian-optimized:
   ```typescript
   /**
    * Exporta a Markdown optimizado para Obsidian.
    * 
    * Características:
    * - Un archivo .md por libro en carpeta separada
    * - YAML Frontmatter con metadatos
    * - Callouts para notas (>[!NOTE])
    * - Wikilinks opcionales
    * - Tags automáticos
    * 
    * Estructura de salida:
    * ```
    * output/
    * ├── Book Title 1/
    * │   └── Highlights.md
    * ├── Book Title 2/
    * │   └── Highlights.md
    * └── _index.md  (opcional, índice de todos los libros)
    * ```
    * 
    * Ejemplo de archivo:
    * ```markdown
    * ---
    * title: "El Quijote"
    * author: "Miguel de Cervantes"
    * type: book-highlights
    * created: 2024-01-01
    * highlights: 42
    * tags:
    *   - kindle
    *   - highlights
    * ---
    * 
    * # El Quijote
    * 
    * > En un lugar de la Mancha, de cuyo nombre no quiero acordarme...
    * > — Page 1, Location 123
    * 
    * > [!NOTE] Mi nota
    * > Esta es una nota que hice mientras leía.
    * ```
    */
   export class ObsidianExporter implements Exporter { }
   ```

6. **`src/exporters/joplin.exporter.ts`** - Exportación a Joplin JEX:
   ```typescript
   /**
    * Exporta a formato Joplin JEX (archivo .jex).
    * 
    * JEX es un archivo tar que contiene:
    * - Notas en formato Markdown con metadatos
    * - Estructura de notebooks
    * - Tags
    * 
    * Consideraciones:
    * - IDs deterministas para permitir re-importación sin duplicados
    * - Estructura de notebooks: uno por libro
    * - Tags: "kindle", nombre del autor
    */
   export class JoplinExporter implements Exporter { }
   ```

7. **`src/exporters/html.exporter.ts`** - Preview HTML:
   ```typescript
   /**
    * Genera un archivo HTML standalone con preview visual.
    * 
    * Características:
    * - Diseño moderno y responsive
    * - Filtros por libro/autor
    * - Búsqueda
    * - Dark mode
    * - Exportar a PDF desde el navegador
    */
   export class HtmlExporter implements Exporter { }
   ```

**Entregables:**
- Todos los exporters implementados
- Tests de cada exporter
- Documentación de uso

---

### 🟣 FASE 6: CLI Tool
**Objetivo:** Crear una herramienta de línea de comandos.

**Tareas:**

1. **`src/cli.ts`** - Entry point CLI:
   ```typescript
   #!/usr/bin/env node
   
   /**
    * CLI de kindle-tools-ts
    * 
    * Comandos:
    * 
    * kindle-tools parse <file>
    *   Parsea el archivo y muestra estadísticas
    *   --json: Output en JSON
    *   --lang: Forzar idioma (auto por defecto)
    * 
    * kindle-tools export <file> --format=<format>
    *   Exporta a formato especificado
    *   Formatos: json, csv, md, obsidian, joplin, html
    *   --output: Directorio/archivo de salida
    *   --group-by-book: Agrupar por libro
    * 
    * kindle-tools stats <file>
    *   Muestra estadísticas detalladas
    * 
    * kindle-tools validate <file>
    *   Valida el formato del archivo
    * 
    * Flags globales:
    *   --help: Ayuda
    *   --version: Versión
    *   --verbose: Output detallado
    *   --quiet: Solo errores
    */
   ```

2. Usar una librería ligera para CLI parsing (ej: `citty` o construir manual)

3. Output con colores y formato bonito

**Entregables:**
- CLI funcional
- Binario `kindle-tools` disponible via npx
- Tests E2E del CLI

---

### ⚪ FASE 7: Testing y Documentación
**Objetivo:** Asegurar calidad y documentar todo.

**Tareas:**

1. **Fixtures de testing**:
   - Crear archivos `My Clippings.txt` de ejemplo en cada idioma
   - Incluir edge cases:
     - Títulos con paréntesis anidados
     - Autores con comas
     - Contenido multilínea
     - Fechas en diferentes formatos
     - Archivos con BOM
     - Contenido con emojis
     - Highlights con límite DRM

2. **Tests unitarios**: 100% coverage en core

3. **Tests de integración**: Pipeline completo

4. **Tests E2E**: CLI con archivos reales

5. **README.md completo**:
   - Badges (npm, coverage, types)
   - Instalación
   - Quick start
   - API completa
   - Ejemplos de uso
   - Contribución

6. **JSDoc**: Documentar todas las funciones públicas

**Entregables:**
- Coverage > 90%
- README profesional
- Ejemplos funcionales

---

### ⚫ FASE 8: Publicación
**Objetivo:** Publicar en npm y configurar CI/CD.

**Tareas:**

1. **GitHub Actions**:
   - CI en PRs (lint, test, build)
   - Publish a npm en release
   - Generar changelog automático

2. **npm package.json** final:
   - Keywords SEO
   - Repository, homepage, bugs
   - Engines (node >= 18)

3. **Changesets** para versionado semántico

4. **Release inicial**: v1.0.0

**Entregables:**
- Paquete publicado en npm
- CI/CD funcionando
- Documentación en npm

---

## Modelado de Datos

### Interface Clipping (Completa)

```typescript
/**
 * Representa un único highlight, nota o bookmark extraído del archivo My Clippings.txt
 * 
 * Esta es la estructura principal de datos del proyecto. Cada entrada en el archivo
 * se convierte en un objeto Clipping después del parseo y procesamiento.
 * 
 * @example
 * ```typescript
 * const clipping: Clipping = {
 *   id: 'a1b2c3d4e5f6',
 *   title: 'The Pragmatic Programmer',
 *   titleRaw: 'The Pragmatic Programmer (David Thomas, Andrew Hunt)',
 *   author: 'David Thomas, Andrew Hunt',
 *   authorRaw: 'David Thomas, Andrew Hunt',
 *   content: 'Care about your craft.',
 *   contentRaw: 'Care about your craft.',
 *   type: 'highlight',
 *   page: 1,
 *   location: { raw: '123-125', start: 123, end: 125 },
 *   date: new Date('2024-01-01T10:30:45'),
 *   dateRaw: 'Friday, January 1, 2024 10:30:45 AM',
 *   isLimitReached: false,
 *   isEmpty: false,
 *   language: 'en',
 *   source: 'kindle',
 *   wordCount: 4,
 *   charCount: 22,
 *   blockIndex: 0,
 * };
 * ```
 */
export interface Clipping {
  /** ID único y determinista (12 caracteres alfanuméricos) */
  id: string;
  
  /** Título del libro, limpio y normalizado */
  title: string;
  
  /** Título original sin procesar */
  titleRaw: string;
  
  /** Nombre del autor, extraído y normalizado */
  author: string;
  
  /** Autor original sin procesar */
  authorRaw: string;
  
  /** Contenido del highlight o nota, limpio y normalizado */
  content: string;
  
  /** Contenido original sin procesar */
  contentRaw: string;
  
  /** Tipo de clipping */
  type: ClippingType;
  
  /** Número de página (null si no está disponible) */
  page: number | null;
  
  /** Ubicación en el libro */
  location: ClippingLocation;
  
  /** Fecha parseada (null si el parseo falla) */
  date: Date | null;
  
  /** Fecha original como string */
  dateRaw: string;
  
  /** True si se alcanzó el límite de clipping por DRM */
  isLimitReached: boolean;
  
  /** True si el contenido está vacío */
  isEmpty: boolean;
  
  /** Idioma del bloque (detectado de los metadatos) */
  language: SupportedLanguage;
  
  /** Origen del libro: Kindle (Amazon) o sideloaded */
  source: 'kindle' | 'sideload';
  
  /** Número de palabras en el contenido */
  wordCount: number;
  
  /** Número de caracteres en el contenido */
  charCount: number;
  
  /** ID de la nota vinculada (si este es un highlight con nota) */
  linkedNoteId?: string;
  
  /** ID del highlight vinculado (si este es una nota) */
  linkedHighlightId?: string;
  
  /** Contenido de la nota vinculada (si mergeNotes está activo) */
  note?: string;
  
  /** Índice del bloque original en el archivo */
  blockIndex: number;
}
```

---

## Entregables Solicitados

Por favor, implementa el proyecto siguiendo las fases descritas. Para cada fase:

1. **Genera el código** completo y funcional
2. **Incluye tests** para cada módulo
3. **Documenta** con JSDoc
4. **Maneja errores** apropiadamente

### Prioridades

1. **FASE 1-2**: Crítico - Sin esto no se puede empezar
2. **FASE 3-4**: Core - Es la funcionalidad principal
3. **FASE 5**: Importante - Hace útil la librería
4. **FASE 6-8**: Nice to have - Mejora la UX y distribución

---

## Notas Finales

- **Legibilidad > Optimización prematura**: El código debe ser fácil de entender y mantener
- **Errores descriptivos**: Los mensajes de error deben ayudar al usuario a solucionar el problema
- **Backwards compatible**: Una vez publicado, no romper la API sin mayor version bump
- **Inspiración**: Revisa `morehardy/kindle-clipping` y `@darylserrano/kindle-clippings` para patrones útiles
