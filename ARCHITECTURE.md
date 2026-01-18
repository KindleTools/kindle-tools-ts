# Architecture

Technical overview of kindle-tools-ts for contributors and developers who want to understand or extend the codebase.

> **Note:** This is a **pure TypeScript library**. A visual workbench for testing is available in `tests/workbench/`.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Processing Pipeline](#processing-pipeline)
3. [Data Model](#data-model)
4. [Module Reference](#module-reference)
5. [Constants & Thresholds](#constants--thresholds)
6. [Key Algorithms](#key-algorithms)
7. [Template System](#template-system)
8. [Error Handling](#error-handling)
9. [Schema Validation](#schema-validation)
10. [Supported Languages](#supported-languages)
11. [Design Decisions](#design-decisions)
12. [Testing Strategy](#testing-strategy)
13. [Dependencies](#dependencies)
14. [Architecture Principles](#architecture-principles)
15. [How to Add a New Exporter](#how-to-add-a-new-exporter)
16. [How to Add a New Language](#how-to-add-a-new-language)
17. [Build & Release Process](#build--release-process)
18. [Performance Considerations](#performance-considerations)

---

## Project Structure

```
kindle-tools-ts/
├── src/
│   ├── core/                    # 🧠 Orchestration & System-wide logic
│   │   ├── limits.ts            # System limits (file size, filename lengths)
│   │   ├── processor.ts         # Main processing orchestrator (dedup, merge, link, quality)
│   │   └── processing/          # Processing step implementations
│   │       ├── deduplicator.ts  # Exact duplicate removal
│   │       ├── filter.ts        # Type/book/length filtering
│   │       ├── linker.ts        # Note-to-highlight linking
│   │       ├── merger.ts        # Overlapping highlight merging
│   │       ├── note-merger.ts   # Linked note removal
│   │       ├── quality.ts       # Suspicious/fuzzy detection
│   │       └── tag-processor.ts # Tag extraction from notes
│   │
│   ├── domain/                  # 📦 Pure Business Logic (Entities & Rules)
│   │   ├── index.ts             # Barrel export for all domain modules
│   │   ├── rules.ts             # Business Rules (Thresholds, Heuristics, Regex)
│   │   ├── analytics/           # Statistics & Aggregation
│   │   │   └── stats.ts         # calculateStats(), groupByBook()
│   │   ├── core/                # Core entities
│   │   │   ├── comparison.ts    # Text comparison (Jaccard similarity)
│   │   │   ├── identity.ts      # ID generation (SHA-256 hashing)
│   │   │   └── locations.ts     # Page utilities (formatting, estimation)
│   │   └── parsing/             # Parsing logic
│   │       ├── block-structure.ts # Block structure constants
│   │       ├── dates.ts         # Date parsing utilities
│   │       ├── languages.ts     # Language definitions (11 languages)
│   │       ├── sanitizers.ts    # Title/author cleaning
│   │       └── tags.ts          # Tag extraction from notes
│   │
│   ├── importers/               # 📥 Data Ingestion
│   │   ├── index.ts             # Barrel export
│   │   ├── core/                # Factory & types
│   │   │   ├── factory.ts       # ImporterFactory
│   │   │   └── types.ts         # Importer interface
│   │   ├── formats/             # Concrete implementations
│   │   │   ├── txt/             # Kindle TXT parser
│   │   │   │   ├── constants.ts # Parser constants
│   │   │   │   ├── file-parser.ts # File reading wrapper
│   │   │   │   ├── language-detector.ts # Auto language detection
│   │   │   │   ├── parser.ts    # Main parser (13KB, ~450 lines)
│   │   │   │   ├── text-cleaner.ts # PDF artifact cleaning
│   │   │   │   └── tokenizer.ts # Block splitting
│   │   │   ├── json.importer.ts # JSON re-import
│   │   │   ├── csv.importer.ts  # CSV re-import
│   │   │   └── txt.importer.ts  # TXT importer wrapper
│   │   └── shared/              # Base classes & utilities
│   │       ├── base.ts          # BaseImporter class
│   │       ├── builder.ts       # Clipping builder
│   │       ├── location-parser.ts # Location string parsing
│   │       └── utils.ts         # ID generation, toError
│   │
│   ├── exporters/               # 📤 Export Adapters
│   │   ├── index.ts             # Barrel export
│   │   ├── core/                # Factory & types
│   │   │   ├── factory.ts       # ExporterFactory
│   │   │   └── types.ts         # Exporter interface, ExporterOptions
│   │   ├── formats/             # Concrete implementations
│   │   │   ├── csv.exporter.ts  # CSV with BOM, injection protection
│   │   │   ├── html.exporter.ts # Standalone HTML with dark mode
│   │   │   ├── html.styles.ts   # CSS for HTML export
│   │   │   ├── joplin.exporter.ts # Joplin JEX archive (16KB, largest)
│   │   │   ├── json.exporter.ts # JSON with optional grouping
│   │   │   ├── markdown.exporter.ts # Markdown with templates
│   │   │   └── obsidian.exporter.ts # Obsidian with YAML frontmatter
│   │   └── shared/              # Base classes & utilities
│   │       ├── base.ts          # BaseExporter class
│   │       ├── exporter-utils.ts # Shared exporter utilities
│   │       ├── formatters.ts    # Date/text formatting
│   │       └── grouping.ts      # Group by book/author
│   │
│   ├── utils/                   # 🛠️ Generic, App-Agnostic Utilities
│   │   ├── archive/             # Archive creation
│   │   │   ├── index.ts         # Barrel export
│   │   │   ├── tar.ts           # TAR creation (Joplin JEX)
│   │   │   ├── jex.ts           # JEX-specific helpers
│   │   │   └── zip.ts           # ZIP creation
│   │   ├── fs/                  # File system helpers
│   │   │   ├── index.ts         # Barrel export
│   │   │   └── filename.ts      # Filename sanitization
│   │   ├── geo/                 # Geographic utilities
│   │   │   └── index.ts         # Location formatting
│   │   ├── security/            # Security utilities
│   │   │   ├── csv-sanitizer.ts # CSV injection protection
│   │   │   ├── hashing.ts       # SHA-256 implementation
│   │   │   └── xss.ts           # XSS protection for HTML
│   │   ├── system/              # System utilities
│   │   │   ├── dates.ts         # Date formatting
│   │   │   ├── encoding.ts      # BOM handling
│   │   │   ├── errors.ts        # Error utilities (toError, Zod formatting)
│   │   │   └── platform.ts      # Platform detection
│   │   └── text/                # Text utilities
│   │       ├── index.ts         # Barrel export
│   │       ├── normalizers.ts   # Unicode NFC, whitespace
│   │       ├── patterns.ts      # Common regex patterns
│   │       ├── similarity.ts    # Jaccard similarity
│   │       ├── encoding.ts      # Encoding detection
│   │       └── truncators.ts    # Text truncation
│   │
│   ├── schemas/                 # 📋 Zod Validation Schemas
│   │   ├── index.ts             # Barrel export
│   │   ├── clipping.schema.ts   # ClippingImportSchema, ClippingStrictSchema
│   │   ├── config.schema.ts     # ParseOptionsSchema
│   │   ├── exporter.schema.ts   # ExporterOptionsSchema
│   │   └── shared.schema.ts     # Shared enums (SupportedLanguage, etc.)
│   │
│   ├── templates/               # 🎨 Handlebars Templates
│   │   ├── index.ts             # Barrel export
│   │   ├── engine.ts            # TemplateEngine class (12KB)
│   │   ├── helpers.ts           # Custom Handlebars helpers (30+)
│   │   ├── presets.ts           # 7 template presets
│   │   └── types.ts             # Template type definitions
│   │
│   ├── errors/                  # ⚠️ Error Handling (neverthrow)
│   │   ├── index.ts             # Barrel export
│   │   ├── codes.ts             # Error code definitions (5 domains)
│   │   ├── formatting.ts        # Error formatting
│   │   ├── logger.ts            # Dependency-injectable logger
│   │   ├── result.ts            # Result type factories
│   │   └── types.ts             # Error type definitions
│   │
│   ├── ports/                   # 🔌 Dependency Injection Ports
│   │   ├── index.ts             # Barrel export
│   │   ├── filesystem.ts        # FileSystem interface
│   │   └── adapters/            # Concrete adapters
│   │       ├── memory-filesystem.ts # In-memory FS for testing
│   │       └── node-filesystem.ts   # Node.js fs adapter
│   │
│   ├── types/                   # 📝 Shared Type Definitions
│   │   ├── index.ts             # Barrel export
│   │   ├── clipping.ts          # Clipping, ClippingLocation, RawClipping
│   │   ├── config.ts            # ParseOptions, ProcessOptions, ParseResult
│   │   ├── geo.ts               # GeoLocation
│   │   ├── language.ts          # SupportedLanguage, LanguagePatterns
│   │   └── stats.ts             # ClippingsStats, BookStats
│   │
│   ├── config/                  # ⚙️ Configuration Constants
│   │   ├── index.ts             # Barrel export
│   │   └── defaults.ts          # DEFAULTS, LOCATION_CONSTANTS
│   │
│   ├── node/                    # 🟢 Node.js-Specific Entry Point
│   │   └── index.ts             # parseFile() with fs access
│   │
│   └── index.ts                 # 📦 Public API (60+ exports)
│
├── tests/
│   ├── unit/                    # Unit tests (~800 tests)
│   ├── integration/             # Pipeline tests
│   ├── fixtures/                # Test data
│   └── workbench/               # Visual testing GUI (Vite app)
│
└── dist/                        # Build output (ESM + CJS + DTS)
```

---

## Processing Pipeline

The processing pipeline transforms raw Kindle clippings through 8 distinct steps:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           My Clippings.txt                                   │
│                    (or JSON/CSV from previous export)                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. TOKENIZER (importers/formats/txt/tokenizer.ts)                           │
│     • Split by "==========" separator (10 equal signs)                       │
│     • Normalize line endings (\r\n → \n)                                     │
│     • Remove BOM (Byte Order Mark)                                           │
│     • Output: Array of raw text blocks                                       │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. LANGUAGE DETECTOR (importers/formats/txt/language-detector.ts)           │
│     • Analyze metadata patterns ("Added on", "Añadido el", etc.)             │
│     • Score each block against 11 language patterns                          │
│     • Supported: EN, ES, PT, DE, FR, IT, ZH, JA, KO, NL, RU                  │
│     • Output: Detected language code                                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. PARSER (importers/formats/txt/parser.ts)                                 │
│     For each block:                                                          │
│     • Line 1: Extract title and author                                       │
│     • Line 2: Extract type, page, location, date                             │
│     • Lines 3+: Extract content                                              │
│     • Generate deterministic ID (SHA-256, 12 chars)                          │
│     • Detect DRM limit messages                                              │
│     • Identify sideloaded books (.pdf, .epub patterns)                       │
│     • Calculate word count and char count                                    │
│     • Output: Array of Clipping objects                                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. PROCESSOR (core/processor.ts) - 8 STEPS                                  │
│                                                                              │
│  Step 0: filterClippings()      → Apply type/book/length filters             │
│  Step 1: Remove empty           → Filter out empty content (keep bookmarks)  │
│  Step 2: removeDuplicates()     → Exact duplicate removal (default: true)    │
│  Step 3: smartMergeHighlights() → Merge overlapping highlights (default: true)│
│  Step 4: linkNotesToHighlights()→ Associate notes with highlights (default)  │
│  Step 5: extractTags()          → Parse #tags from notes (optional)          │
│  Step 5.5: removeLinkedNotes()  → Consume linked notes (optional)            │
│  Step 6: filterToHighlightsOnly()→ Remove notes/bookmarks (optional)         │
│  Step 7: flagSuspiciousHighlights()→ Mark accidental/fragments (always)      │
│  Step 8: flagFuzzyDuplicates()  → Jaccard similarity detection (always)      │
│                                                                              │
│  Note: Steps 7-8 only ADD flags, never remove clippings                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. EXPORTER (exporters/)                                                    │
│     • JSON: Standard JSON with metadata                                      │
│     • CSV: Excel-compatible with BOM, injection protection                   │
│     • Markdown: Blockquotes with customizable templates                      │
│     • Obsidian: YAML frontmatter, folder structure options                   │
│     • Joplin JEX: TAR archive with notebooks, notes, tags                    │
│     • HTML: Standalone page with dark mode and search                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Processing Step Details

| Step | Function | Default | Mutates | Description |
|------|----------|---------|---------|-------------|
| 0 | `filterClippings()` | Always | Removes | Apply `excludeTypes`, `excludeBooks`, `onlyBooks`, `minContentLength` |
| 1 | (inline) | Always | Removes | Remove clippings with `isEmpty: true` (except bookmarks) |
| 2 | `removeDuplicates()` | `true` | Removes | Remove exact duplicates by content hash, merge tags |
| 3 | `smartMergeHighlights()` | `true` | Merges | Merge overlapping location ranges, keep longest |
| 4 | `linkNotesToHighlights()` | `true` | Links | Add `linkedNoteId`/`linkedHighlightId` references |
| 5 | `extractTagsFromLinkedNotes()` | `false` | Modifies | Parse tags from `note` field, apply `tagCase` |
| 5.5 | `removeLinkedNotes()` | `false` | Removes | Remove notes that have been linked (content in highlight) |
| 6 | `filterToHighlightsOnly()` | `false` | Removes | Keep only highlights (removes notes, bookmarks) |
| 7 | `flagSuspiciousHighlights()` | Always | Flags | Set `isSuspiciousHighlight`, `suspiciousReason` |
| 8 | `flagFuzzyDuplicates()` | Always | Flags | Set `similarityScore`, `possibleDuplicateOf` |

---

## Data Model

### Clipping Interface

The core data structure representing a single highlight, note, bookmark, or clip:

```typescript
interface Clipping {
  // ===== IDENTIFICATION =====
  id: string;                    // Deterministic SHA-256 hash (12 alphanumeric chars)
  blockIndex: number;            // Original position in source file (0-indexed)

  // ===== BOOK METADATA =====
  title: string;                 // Clean, normalized book title
  titleRaw: string;              // Original title (preserved for debugging)
  author: string;                // Extracted and normalized author name
  authorRaw: string;             // Original author (preserved)

  // ===== CONTENT =====
  content: string;               // Clean, normalized content
  contentRaw: string;            // Original content (preserved)
  type: ClippingType;            // 'highlight' | 'note' | 'bookmark' | 'clip' | 'article'

  // ===== LOCATION =====
  page: number | null;           // Page number (null if not available)
  location: ClippingLocation;    // Structured location object
  // location.raw: string        // e.g., "100-105"
  // location.start: number      // e.g., 100
  // location.end: number | null // e.g., 105 (null if single location)

  // ===== DATE =====
  date: Date | null;             // Parsed JavaScript Date (null if parsing failed)
  dateRaw: string;               // Original date string for debugging

  // ===== FLAGS =====
  isLimitReached: boolean;       // True if DRM "clipping limit" message detected
  isEmpty: boolean;              // True if content is empty or whitespace-only
  language: SupportedLanguage;   // Detected language code ('en', 'es', 'pt', etc.)
  source: 'kindle' | 'sideload'; // 'kindle' = Amazon book, 'sideload' = PDF/EPUB

  // ===== STATISTICS =====
  wordCount: number;             // Number of words in content
  charCount: number;             // Number of characters in content

  // ===== LINKING (populated by processor) =====
  linkedNoteId?: string;         // ID of linked note (if this is a highlight)
  linkedHighlightId?: string;    // ID of linked highlight (if this is a note)
  note?: string;                 // Merged note content (if mergeNotes enabled)
  tags?: string[];               // Extracted tags (if extractTags enabled)

  // ===== QUALITY FLAGS (populated by processor) =====
  isSuspiciousHighlight?: boolean;  // Flagged by quality check
  suspiciousReason?: SuspiciousReason; // Why it was flagged
  // 'too_short' | 'fragment' | 'incomplete' | 'exact_duplicate' | 'overlapping'

  similarityScore?: number;      // Jaccard similarity (0-1) with another clipping
  possibleDuplicateOf?: string;  // ID of the similar clipping

  // ===== METADATA FLAGS =====
  titleWasCleaned?: boolean;     // True if title cleaning was applied
  contentWasCleaned?: boolean;   // True if content cleaning was applied
}
```

### ParseOptions Interface

All available parsing and processing options:

```typescript
interface ParseOptions {
  // ===== LANGUAGE =====
  language?: SupportedLanguage | 'auto';  // Default: 'auto'

  // ===== PROCESSING FLAGS =====
  removeDuplicates?: boolean;      // Default: true. Remove exact duplicates.
  mergeOverlapping?: boolean;      // Default: true. Merge extended highlights.
  mergeNotes?: boolean;            // Default: true. Link notes to highlights.
  extractTags?: boolean;           // Default: false. Extract tags from notes.
  tagCase?: TagCase;               // Default: 'uppercase'. 'original'|'uppercase'|'lowercase'
  highlightsOnly?: boolean;        // Default: false. Return only highlights.
  mergedOutput?: boolean;          // Default: false. Remove consumed notes.
  removeUnlinkedNotes?: boolean;   // Default: false. Also remove unlinked notes.

  // ===== NORMALIZATION =====
  normalizeUnicode?: boolean;      // Default: true. Apply NFC normalization.
  cleanContent?: boolean;          // Default: true. Trim, collapse spaces.
  cleanTitles?: boolean;           // Default: true. Remove _EBOK, editions, etc.

  // ===== FILTERING =====
  excludeTypes?: ClippingType[];   // Filter out specific types.
  excludeBooks?: string[];         // Exclude books by title (case-insensitive).
  onlyBooks?: string[];            // Only include these books.
  minContentLength?: number;       // Minimum content length to include.

  // ===== DATES =====
  dateLocale?: string;             // e.g., 'en-US', 'es-ES' for date parsing.

  // ===== LOCATION =====
  geoLocation?: GeoLocation;       // Optional geo metadata for PKM.

  // ===== MODE =====
  strict?: boolean;                // Default: false. Throw on errors vs collect warnings.
}
```

### ExporterOptions Interface

Options available for all exporters:

```typescript
interface ExporterOptions {
  outputPath?: string;              // Output file/directory path
  groupByBook?: boolean;            // Group clippings by book
  includeStats?: boolean;           // Include statistics in output
  pretty?: boolean;                 // Pretty print (JSON)
  includeRaw?: boolean;             // Include *Raw fields
  folderStructure?: FolderStructure; // 'flat' | 'by-book' | 'by-author' | 'by-author-book'
  authorCase?: AuthorCase;          // 'original' | 'uppercase' | 'lowercase'
  includeClippingTags?: boolean;    // Include tags in output
  title?: string;                   // Custom title for export
  creator?: string;                 // Custom author for export
  templatePreset?: TemplatePreset;  // Template preset name
  customTemplates?: CustomTemplates; // Custom Handlebars templates
}
```

### ProcessResult Interface

Returned by `processClippings()`:

```typescript
interface ProcessResult {
  clippings: Clipping[];           // Processed clippings
  duplicatesRemoved: number;       // Count of exact duplicates removed
  mergedHighlights: number;        // Count of overlapping merges
  linkedNotes: number;             // Count of notes linked
  emptyRemoved: number;            // Count of empty clippings removed
  suspiciousFlagged: number;       // Count flagged as suspicious
  fuzzyDuplicatesFlagged: number;  // Count flagged as fuzzy duplicates
  tagsExtracted: number;           // Count with tags extracted
  filteredForHighlightsOnly: number; // Count removed by highlightsOnly
  notesConsumed: number;           // Count of notes removed by mergedOutput
}
```

### ClippingsStats Interface

Comprehensive statistics:

```typescript
interface ClippingsStats {
  total: number;                   // Total clippings
  totalHighlights: number;
  totalNotes: number;
  totalBookmarks: number;
  totalClips: number;              // clip + article types
  totalBooks: number;              // Unique books
  totalAuthors: number;            // Unique authors
  booksList: BookStats[];          // Per-book statistics
  duplicatesRemoved: number;       // Set by processor
  mergedHighlights: number;        // Set by processor
  linkedNotes: number;             // Set by processor
  emptyRemoved: number;            // Set by processor
  drmLimitReached: number;         // Count with isLimitReached
  dateRange: { earliest: Date | null; latest: Date | null };
  totalWords: number;
  avgWordsPerHighlight: number;
  avgHighlightsPerBook: number;
}

interface BookStats {
  title: string;
  author: string;
  highlights: number;
  notes: number;
  bookmarks: number;
  wordCount: number;
  dateRange: { earliest: Date | null; latest: Date | null };
}
```

---

## Module Reference

### core/ - Orchestration Layer

| File | Exports | Description |
|------|---------|-------------|
| `processor.ts` | `processClippings()`, `ProcessResult` | Main processing orchestrator |
| `limits.ts` | System limit constants | File size limits, filename constraints |
| `processing/deduplicator.ts` | `removeDuplicates()`, `mergeTags()` | Exact duplicate removal |
| `processing/filter.ts` | `filterClippings()`, `filterToHighlightsOnly()` | Type/book/length filtering |
| `processing/linker.ts` | `linkNotesToHighlights()` | Note-to-highlight linking |
| `processing/merger.ts` | `smartMergeHighlights()` | Overlapping highlight merging |
| `processing/note-merger.ts` | `removeLinkedNotes()` | Consumed note removal |
| `processing/quality.ts` | `flagSuspiciousHighlights()`, `flagFuzzyDuplicates()` | Quality flagging |
| `processing/tag-processor.ts` | `extractTagsFromLinkedNotes()` | Tag extraction |

### domain/ - Business Logic Layer

| File | Exports | Description |
|------|---------|-------------|
| `rules.ts` | All thresholds and patterns | Business rules constants |
| `analytics/stats.ts` | `calculateStats()`, `groupByBook()` | Statistics calculation |
| `core/comparison.ts` | `compareTexts()`, `isSubset()`, `SimilarityResult` | Text comparison |
| `core/identity.ts` | `generateClippingId()`, `generateDuplicateHash()` | ID generation |
| `core/locations.ts` | `formatPage()`, `estimatePageFromLocation()`, `getEffectivePage()`, `getPageInfo()` | Page utilities |
| `parsing/dates.ts` | Date parsing utilities | Multi-locale date parsing |
| `parsing/languages.ts` | `SUPPORTED_LANGUAGES`, `LANGUAGE_MAP` | Language definitions |
| `parsing/sanitizers.ts` | `sanitizeTitle()`, `sanitizeContent()`, `extractAuthor()`, `isSideloaded()` | Cleaning utilities |
| `parsing/tags.ts` | `extractTagsFromNote()`, `looksLikeTagNote()`, `TagCase`, `TagExtractionResult` | Tag extraction |

### importers/ - Data Ingestion Layer

| File | Exports | Description |
|------|---------|-------------|
| `core/factory.ts` | `ImporterFactory` | Creates importer by format |
| `core/types.ts` | `Importer`, `ImportResult` | Importer interface |
| `formats/txt.importer.ts` | `TxtImporter` | Kindle TXT wrapper |
| `formats/txt/parser.ts` | `parse()`, `parseString()` | Main TXT parser |
| `formats/txt/tokenizer.ts` | `tokenize()` | Block splitting |
| `formats/txt/language-detector.ts` | `detectLanguage()` | Auto language detection |
| `formats/txt/text-cleaner.ts` | `cleanText()` | PDF artifact cleaning |
| `formats/json.importer.ts` | `JsonImporter` | JSON re-import |
| `formats/csv.importer.ts` | `CsvImporter` | CSV re-import |

### exporters/ - Data Export Layer

| Exporter | Format | Output Type | Key Features |
|----------|--------|-------------|--------------|
| `JsonExporter` | JSON | `string` | Pretty print, grouping, metadata |
| `CsvExporter` | CSV | `string` | BOM for Excel, injection protection |
| `MarkdownExporter` | MD | `string` | Template presets, blockquotes |
| `ObsidianExporter` | MD | `ExportedFile[]` | YAML frontmatter, folder structures |
| `JoplinExporter` | JEX | `Uint8Array` | TAR archive, notebooks, tags |
| `HtmlExporter` | HTML | `string` | Dark mode, search, responsive |

### utils/ - Generic Utilities

| Module | Key Exports | Description |
|--------|-------------|-------------|
| `archive/tar.ts` | `createTar()` | TAR archive creation |
| `archive/jex.ts` | JEX helpers | Joplin-specific utilities |
| `archive/zip.ts` | `createZip()` | ZIP archive creation |
| `fs/filename.ts` | `sanitizeFilename()` | Safe filename generation |
| `geo/index.ts` | Location formatting | Geographic utilities |
| `security/csv-sanitizer.ts` | `escapeCSV()` | Formula injection protection |
| `security/hashing.ts` | `sha256Sync()` | SHA-256 implementation |
| `security/xss.ts` | `escapeHtml()` | XSS protection |
| `system/dates.ts` | Date formatting | Human-readable dates |
| `system/encoding.ts` | BOM handling | Byte Order Mark utilities |
| `system/errors.ts` | `toError()`, `formatZodError()` | Error utilities |
| `text/normalizers.ts` | `normalizeText()`, `normalizeUnicode()` | Unicode NFC, whitespace |
| `text/similarity.ts` | `jaccardSimilarity()` | Fuzzy duplicate detection |

### templates/ - Template Engine

| File | Exports | Description |
|------|---------|-------------|
| `engine.ts` | `TemplateEngine` | Handlebars compilation and rendering |
| `helpers.ts` | 30+ helpers | Custom Handlebars helpers |
| `presets.ts` | 7 presets | Pre-defined template sets |
| `types.ts` | `TemplatePreset`, `CustomTemplates`, `ClippingContext`, `BookContext` | Type definitions |

### errors/ - Error Handling

| File | Exports | Description |
|------|---------|-------------|
| `codes.ts` | Error code constants | 5 domains: Import, Export, Config, Validation, FS |
| `logger.ts` | `setLogger()`, `resetLogger()`, `logInfo()`, `logError()` | Injectable logger |
| `result.ts` | Result factories | neverthrow Result helpers |
| `types.ts` | Error type definitions | AppError, ImportError, ExportError, etc. |
| `formatting.ts` | Error formatting | Human-readable error messages |

---

## Constants & Thresholds

### Business Rule Thresholds (`domain/rules.ts`)

```typescript
// Analysis Thresholds
ANALYSIS_THRESHOLDS = {
  DEFAULT_SIMILARITY_THRESHOLD: 0.8,  // 80% word overlap = fuzzy duplicate
  LINKER_MAX_DISTANCE: 10,            // Max locations distance for note linking
}

// Suspicious Highlight Detection
SUSPICIOUS_HIGHLIGHT_THRESHOLDS = {
  GARBAGE_LENGTH: 5,                  // < 5 chars = likely garbage
  SHORT_LENGTH: 75,                   // < 75 chars = needs additional checks
  VALID_ENDINGS: /[.!?"")\]]$/,       // Valid sentence endings
}

// Processing Thresholds
PROCESSING_THRESHOLDS = {
  IDENTITY_CONTENT_PREFIX_LENGTH: 50, // Chars from content for ID hash
  IDENTITY_ID_LENGTH: 12,             // Length of generated ID
  TAG_MAX_LENGTH: 50,                 // Max length for a valid tag
  TAG_MIN_LENGTH: 2,                  // Min length for a valid tag
  TAG_NOTE_MAX_LENGTH: 200,           // Max length for tag-only note
  TAG_NOTE_SHORT_LENGTH: 50,          // Short notes without spaces = tags
  PREVIEW_CONTENT_LENGTH: 50,         // Preview length for titles
}
```

### Location Constants (`domain/core/locations.ts`)

```typescript
LOCATIONS_PER_PAGE = 16;              // Kindle locations per page estimate
PAGE_PADDING_LENGTH = 4;              // Digits for zero-padding (e.g., [0042])
```

### Common Patterns (`domain/rules.ts`)

```typescript
COMMON_PATTERNS = {
  SIDELOAD_EXTENSIONS: /\.(pdf|epub|mobi|azw3?|txt|doc|docx|html|fb2|rtf)/i,
  EBOK_SUFFIX: /_EBOK$/i,
}

TITLE_NOISE_PATTERNS = [
  /\s*\(Spanish Edition\)/i,
  /\s*\(English Edition\)/i,
  /\s*\(Kindle Edition\)/i,
  /\s*\[Print Replica\]/i,
  /^\d+\s+/,  // Leading numbers from series
  // ... 15+ patterns total
]

DRM_LIMIT_MESSAGES = [
  "You have reached the clipping limit",
  "Has alcanzado el límite de recortes",
  "Você atingiu o limite de recortes",
  "Sie haben das Markierungslimit erreicht",
  // ... 8 languages total
]
```

### Default Values (`config/defaults.ts`)

```typescript
DEFAULTS = {
  UNKNOWN_AUTHOR: "Unknown Author",
  EXPORT_TITLE: "Kindle Highlights",
}
```

---

## Key Algorithms

### Deterministic ID Generation

IDs are generated using SHA-256 hash of normalized content:

```typescript
function generateClippingId(title, location, type, contentPrefix): string {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedLocation = location.trim();
  const prefix = contentPrefix.slice(0, 50).toLowerCase().trim();
  
  const input = `${normalizedTitle}|${normalizedLocation}|${type}|${prefix}`;
  const hash = sha256Sync(input);
  
  return hash.slice(0, 12); // First 12 hex chars
}
```

**Benefits:**
- Same clipping always gets same ID (idempotent imports)
- Collision-resistant (48 bits = very low probability)
- Cross-platform (works in Node.js and browser)

### Smart Merge Algorithm

Detects and merges overlapping highlights when user extends a selection:

```typescript
function smartMergeHighlights(clippings): MergeResult {
  // 1. Group highlights by book title
  // 2. Sort by location start
  // 3. For each pair, check:
  //    a. Overlapping locations OR within 5 characters
  //    b. One content is substring of other OR >50% Jaccard similarity
  // 4. If match: keep longer content, merge location range, merge tags
  // 5. Return merged clippings with count
}
```

### Note-to-Highlight Linking

Two-phase linking algorithm:

```typescript
function linkNotesToHighlights(clippings): LinkResult {
  // Phase 1: Range Match (preferred)
  // For each note, find highlight where:
  //   note.location.start >= highlight.location.start AND
  //   note.location.start <= highlight.location.end
  
  // Phase 2: Proximity Fallback
  // If no range match, find nearest highlight within 10 locations:
  //   abs(note.location.start - highlight.location.start) <= 10
  
  // Link by setting linkedNoteId/linkedHighlightId
  // Merge note content into highlight.note field
}
```

### Jaccard Similarity

Used for fuzzy duplicate detection:

```typescript
function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = words1.filter(w => words2.has(w)).size;
  const union = new Set([...words1, ...words2]).size;
  
  return intersection / union; // 0.0 to 1.0
}

// Threshold: 0.8 (80%) for flagging as possible duplicate
```

### Tag Extraction

Parses tags from note content:

```typescript
function extractTagsFromNote(noteContent: string, options): TagExtractionResult {
  // 1. Split by separators: comma, semicolon, period, newline
  // 2. For each part:
  //    a. Remove leading # or @
  //    b. Apply tagCase transformation
  //    c. Validate: 2-50 chars, starts with letter, <4 spaces
  //    d. Reject sentence patterns (the, is, are, was, etc.)
  // 3. Deduplicate (case-insensitive)
  // 4. Return { tags, hasTags, isTagOnlyNote }
}
```

---

## Template System

The template system uses Handlebars for customizable Markdown output.

### Template Presets

7 built-in presets (`templates/presets.ts`):

| Preset | Description | Key Features |
|--------|-------------|--------------|
| `default` | Standard blockquote format | Page, location, date, notes, tags |
| `minimal` | Condensed output | Just content and location |
| `obsidian` | Obsidian-optimized | Callouts, wikilinks, frontmatter |
| `notion` | Notion-compatible | Toggle blocks, databases |
| `academic` | Citation-focused | Page numbers, formal quotes |
| `compact` | Space-efficient | One-line per highlight |
| `verbose` | Maximum detail | All metadata, raw fields |

### Template Levels

Templates are organized in 3 levels:

1. **Clipping Template** - Renders a single clipping
2. **Book Template** - Groups clippings by book
3. **Export Template** - Top-level document structure

### Handlebars Helpers

30+ custom helpers (`templates/helpers.ts`):

**Logic & Comparison:**
- `eq a b`, `neq a b` - Equality checks
- `gt`, `lt`, `gte`, `lte` - Numeric comparisons
- `and`, `or`, `not` - Boolean logic
- `isHighlight`, `isNote`, `isBookmark` - Type checks (block helpers)

**Formatting:**
- `formatDate date format` - 'short', 'long', 'iso', 'relative'
- `truncate text length` - Truncate with ellipses
- `upper`, `lower`, `capitalize` - Case transformation
- `replace text "old" "new"` - String replacement
- `blockquote text` - Prefix lines with `> `
- `yamlTags tags` - Format as YAML list items

**Conditional:**
- `ifEq a b`, `ifNeq a b` - Block conditionals
- `unless` - Inverse conditional

### Template Context Variables

**Clipping Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `content` | `string` | The highlight/note text |
| `title` | `string` | Book title |
| `author` | `string` | Book author |
| `type` | `string` | highlight, note, bookmark |
| `page` | `string` | Page number or "?" |
| `location` | `string` | Location range |
| `date` | `string` | Formatted date |
| `dateIso` | `string` | ISO date string |
| `note` | `string` | Linked note content |
| `tags` | `string[]` | Extracted tags |
| `tagsHashtags` | `string` | `#tag1 #tag2` |
| `hasNote` | `boolean` | Note is attached |
| `hasTags` | `boolean` | Tags exist |
| `isLimitReached` | `boolean` | DRM limit hit |

**Book Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `title` | `string` | Book title |
| `author` | `string` | Book author |
| `clippings` | `array` | All clippings in book |
| `highlights` | `array` | Only highlights |
| `notes` | `array` | Only notes |
| `bookmarks` | `array` | Only bookmarks |
| `highlightCount` | `number` | Count of highlights |
| `noteCount` | `number` | Count of notes |
| `tags` | `string[]` | All unique tags |

---

## Error Handling

### Error Domains

5 error domains (`errors/codes.ts`):

| Domain | Prefix | Codes |
|--------|--------|-------|
| Import | `IMPORT_` | `PARSE_ERROR`, `EMPTY_FILE`, `INVALID_FORMAT`, `VALIDATION_ERROR`, `UNKNOWN` |
| Export | `EXPORT_` | `UNKNOWN_FORMAT`, `WRITE_FAILED`, `INVALID_OPTIONS`, `NO_CLIPPINGS`, `TEMPLATE_ERROR`, `UNKNOWN` |
| Config | `CONFIG_` | `NOT_FOUND`, `INVALID`, `PARSE_ERROR` |
| Validation | `VALIDATION_` | `SCHEMA`, `ARGS`, `REQUIRED` |
| FileSystem | `FS_` | `NOT_FOUND`, `PERMISSION_DENIED`, `READ_ERROR`, `WRITE_ERROR` |

### Result Pattern (neverthrow)

Type-safe error handling:

```typescript
import { Result, ok, err } from 'neverthrow';

type ImportResult = Result<ImportSuccess, ImportError>;

// Usage
const result = importer.import(content);

result.match(
  (success) => console.log(`Imported ${success.clippings.length}`),
  (error) => console.error(`[${error.code}] ${error.message}`)
);

// Or functional chaining
const processed = result
  .map(s => processClippings(s.clippings))
  .andThen(r => exporter.export(r.clippings))
  .orElse(e => handleError(e));
```

### Logger Injection

Redirect logs to custom backend:

```typescript
import { setLogger, nullLogger } from 'kindle-tools-ts';

// Custom logger (e.g., Pino, Winston)
setLogger({
  error: (entry) => myLogger.error(entry),
  warn: (entry) => myLogger.warn(entry),
  info: (msg, ctx) => myLogger.info(ctx, msg),
  debug: (msg, ctx) => myLogger.debug(ctx, msg),
});

// Silence all logs
setLogger(nullLogger);

// Reset to console
resetLogger();
```

---

## Schema Validation

### Zod Schemas

All external data is validated at boundaries:

| Schema | Purpose | Strictness |
|--------|---------|------------|
| `ClippingImportSchema` | External data import | Lenient (all optional) |
| `ClippingStrictSchema` | Internal validation | Strict (required fields) |
| `ParseOptionsSchema` | Parse function options | With defaults |
| `ExporterOptionsSchema` | Export function options | With defaults |

### Lenient vs Strict

```typescript
// Lenient: For importing external data
const ClippingImportSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  type: ClippingTypeSchema.optional(),
  // All fields optional for tolerance
});

// Strict: For internal validation
const ClippingStrictSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: ClippingTypeSchema,
  // Required fields enforced
});
```

### Schema Exports

Available for external validation:

```typescript
import {
  ClippingImportSchema,
  ClippingStrictSchema,
  ParseOptionsSchema,
  ExporterOptionsSchema,
  parseParseOptions,
  safeParseParseOptions,
} from 'kindle-tools-ts';

// Validate options with defaults
const options = parseParseOptions(userInput);

// Safe parse (returns Result)
const result = safeParseParseOptions(userInput);
```

---

## Supported Languages

11 languages with full parsing support:

| Code | Language | "Added on" Pattern | Example Date Format |
|------|----------|-------------------|---------------------|
| `en` | English | "Added on" | Friday, January 1, 2024 10:30:45 AM |
| `es` | Spanish | "Añadido el" | viernes, 1 de enero de 2024 10:30:45 |
| `pt` | Portuguese | "Adicionado em" | sexta-feira, 1 de janeiro de 2024 10:30:45 |
| `de` | German | "Hinzugefügt am" | Freitag, 1. Januar 2024 10:30:45 |
| `fr` | French | "Ajouté le" | vendredi 1 janvier 2024 10:30:45 |
| `it` | Italian | "Aggiunto il" | venerdì 1 gennaio 2024 10:30:45 |
| `zh` | Chinese | "添加于" | 2024年1月1日星期五 上午10:30:45 |
| `ja` | Japanese | "追加日" | 2024年1月1日金曜日 10:30:45 |
| `ko` | Korean | "추가됨" | 2024년 1월 1일 금요일 오전 10:30:45 |
| `nl` | Dutch | "Toegevoegd op" | vrijdag 1 januari 2024 10:30:45 |
| `ru` | Russian | "Добавлено" | пятница, 1 января 2024 г. 10:30:45 |

### Language Pattern Structure

Each language defines:

```typescript
interface LanguagePatterns {
  addedOn: string;     // "Added on" / "Añadido el"
  highlight: string;   // "Your Highlight" / "Tu subrayado"
  note: string;        // "Your Note" / "Tu nota"
  bookmark: string;    // "Your Bookmark" / "Tu marcador"
  clip: string;        // "Your Clip" / "Tu recorte"
  page: string;        // "page" / "página"
  location: string;    // "Location" / "posición"
  dateFormats: string[]; // date-fns format strings
}
```

---

## Design Decisions

### 1. Hashing as a Domain Concept

**Decision:** `identity.ts` is in `domain/core/`, not `utils/`.

**Rationale:** Clipping ID generation is a fundamental business rule that defines identity. Changing the hash algorithm fundamentally changes duplicate detection behavior.

### 2. Preserve Raw Fields

**Decision:** Every cleaned field has a `*Raw` counterpart.

**Rationale:**
- Users can verify cleaning was correct
- Debugging parsing issues
- Potential re-processing with different options
- Non-destructive by design

### 3. SHA-256 for IDs

**Decision:** Use SHA-256 truncated to 12 hex characters.

**Rationale:**
- Deterministic: same input = same output
- Collision-resistant: 48 bits = ~280 trillion possible values
- Cross-platform: Web Crypto API works everywhere
- URL-safe: alphanumeric only

### 4. Flags vs Filters

**Decision:** Quality checks (steps 7-8) add flags, never remove clippings.

**Rationale:** User maintains full control. They can filter based on `isSuspiciousHighlight` or `possibleDuplicateOf` in their own code.

### 5. Universal vs Node Entry Points

**Decision:** Split `index.ts` (universal) and `node/index.ts` (Node.js).

**Rationale:** Main entry point must work in browsers and edge workers. Node-specific `fs` access is isolated.

### 6. neverthrow for Errors

**Decision:** Use Result types instead of try/catch.

**Rationale:**
- Type-safe: errors are part of function signature
- Explicit: cannot forget to handle errors
- Composable: chain with `.andThen()`, `.map()`, `.orElse()`

### 7. Dependency Injection for Ports

**Decision:** FileSystem and Logger are injectable.

**Rationale:**
- Testable: inject mocks in tests
- Flexible: redirect logs to Sentry, Datadog, etc.
- Library-friendly: no forced console output

---

## Testing Strategy

### Test Organization

```
tests/
├── unit/                    # Isolated function tests
│   ├── tokenizer.test.ts    # Block splitting
│   ├── parser.test.ts       # Metadata extraction
│   ├── processor.test.ts    # Dedup, merge, link
│   ├── exporters.test.ts    # All export formats
│   ├── normalizers.test.ts  # Unicode, BOM
│   ├── sanitizers.test.ts   # Title/author cleaning
│   ├── tags.test.ts         # Tag extraction
│   ├── similarity.test.ts   # Jaccard algorithm
│   ├── hashing.test.ts      # ID generation
│   └── ...
│
├── integration/             # Full pipeline tests
│   └── pipeline.test.ts     # Parse → Process → Export
│
└── fixtures/
    └── sample-clippings.ts  # Test data
```

### Coverage Targets

- **Lines:** 80%+
- **Functions:** 80%+
- **Branches:** 80%+
- **Statements:** 80%+

### Test Count

- **818 tests** across all modules
- **~10 languages** tested for parsing
- **6 export formats** tested

---

## Dependencies

### Runtime (7 total)

| Package | Purpose | Size Impact |
|---------|---------|-------------|
| `date-fns` | Multi-locale date parsing | ~50KB |
| `handlebars` | Template engine | ~70KB |
| `jszip` | Archive creation | ~90KB |
| `zod` | Schema validation | ~50KB |
| `neverthrow` | Result type system | ~5KB |
| `@noble/hashes` | SHA-256 (browser-safe) | ~10KB |

### Development

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking |
| `tsup` | Build (ESM + CJS + DTS) |
| `vitest` | Testing |
| `biome` | Linting + formatting |
| `husky` | Git hooks |
| `changesets` | Versioning |

---

## Architecture Principles

### 1. Factory Pattern & Dependency Injection

```typescript
// Importers
const importer = ImporterFactory.create('txt'); // or 'json', 'csv'
const result = await importer.import(content);

// Exporters
const exporter = new ObsidianExporter();
const output = await exporter.export(clippings, options);
```

### 2. Clean Architecture Layers

```
┌─────────────────────────────────────────┐
│             External World              │
│  (CLI, GUI, Tests, API Consumers)       │
├─────────────────────────────────────────┤
│           Adapters (I/O)                │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  Importers  │  │    Exporters    │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│         Application (Orchestration)     │
│  ┌─────────────────────────────────┐   │
│  │    core/processor.ts            │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│           Domain (Business Rules)       │
│  ┌───────────────────────────────────┐ │
│  │  domain/ (rules, identity, stats) │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│        Infrastructure (Utilities)       │
│  ┌────────────────────────────────────┐│
│  │  utils/, ports/, schemas/          ││
│  └────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 3. Subpath Imports

Native Node subpath imports (`#alias`) instead of fragile `tsconfig` paths:

```json
// package.json
{
  "imports": {
    "#core/*.js": "./src/core/*.ts",
    "#domain/*.js": "./src/domain/*.ts",
    "#utils/*.js": "./src/utils/*.ts",
    "#app-types/*.js": "./src/types/*.ts"
  }
}
```

**Benefits:**
- Native Node.js support
- Works in TypeScript, esbuild, Vite without transforms
- Identical behavior in dev, test, and production

### 4. Unified Processing Pipeline

All data flows through the same pipeline regardless of source:

```
Raw TXT ─┐
         │
JSON ────┼──→ Importer ──→ Clipping[] ──→ Processor ──→ Exporter
         │
CSV ─────┘
```

This ensures JSON/CSV re-imports get the same cleanup and deduplication as raw Kindle files.

---

## How to Add a New Exporter

Step-by-step guide for contributors.

### 1. Create the Exporter File

```bash
# Create new file
touch src/exporters/formats/myformat.exporter.ts
```

### 2. Implement the Exporter Interface

```typescript
// src/exporters/formats/myformat.exporter.ts
import { BaseExporter } from "../shared/base.js";
import type { Clipping } from "#app-types/clipping.js";
import type { ExporterOptions, ExportResult } from "../core/types.js";

export class MyFormatExporter extends BaseExporter {
  readonly name = "myformat";
  readonly extension = ".myf";

  async export(
    clippings: Clipping[],
    options?: ExporterOptions
  ): Promise<ExportResult> {
    // 1. Group clippings if needed
    const grouped = this.groupByBook(clippings);
    
    // 2. Transform to your format
    const output = this.transform(grouped, options);
    
    // 3. Return result
    return {
      output,
      stats: options?.includeStats ? this.calculateStats(clippings) : undefined,
    };
  }

  private transform(grouped: Map<string, Clipping[]>, options?: ExporterOptions): string {
    // Your transformation logic here
    return "";
  }
}
```

### 3. Register in Factory

```typescript
// src/exporters/core/factory.ts
import { MyFormatExporter } from "../formats/myformat.exporter.js";

export class ExporterFactory {
  static create(format: string): Exporter {
    switch (format) {
      // ... existing cases
      case "myformat":
        return new MyFormatExporter();
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }
}
```

### 4. Export from Index

```typescript
// src/exporters/index.ts
export { MyFormatExporter } from "./formats/myformat.exporter.js";

// src/index.ts
export { MyFormatExporter } from "#exporters/formats/myformat.exporter.js";
```

### 5. Add Tests

```typescript
// tests/unit/exporters/myformat.exporter.test.ts
import { describe, it, expect } from "vitest";
import { MyFormatExporter } from "../../../src/exporters/formats/myformat.exporter.js";
import { createTestClipping } from "../../fixtures/sample-clippings.js";

describe("MyFormatExporter", () => {
  it("exports clippings", async () => {
    const exporter = new MyFormatExporter();
    const result = await exporter.export([createTestClipping()]);
    
    expect(result.output).toBeDefined();
  });
});
```

### 6. Update README

Add your exporter to the "Available Exporters" table.

---

## How to Add a New Language

Step-by-step guide for adding Kindle language support.

### 1. Add Language Patterns

```typescript
// src/domain/parsing/languages.ts

// Add to SUPPORTED_LANGUAGES array
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  "en", "es", "pt", "de", "fr", "it", "zh", "ja", "ko", "nl", "ru",
  "tr", // <-- New language
] as const;

// Add to LANGUAGE_MAP
export const LANGUAGE_MAP: Record<SupportedLanguage, LanguagePatterns> = {
  // ... existing languages
  tr: {
    addedOn: "Eklendi",                    // "Added on"
    highlight: "Vurgulama",                // "Your Highlight"
    note: "Notunuz",                       // "Your Note"
    bookmark: "Yer İşareti",               // "Your Bookmark"
    clip: "Alıntı",                        // "Your Clip"
    page: "sayfa",                         // "page"
    location: "konum",                     // "Location"
    dateFormats: [
      "EEEE, d MMMM yyyy HH:mm:ss",        // Cuma, 1 Ocak 2024 10:30:45
    ],
  },
};
```

### 2. Add Type Definition

```typescript
// src/types/language.ts
export type SupportedLanguage =
  | "en" | "es" | "pt" | "de" | "fr" | "it"
  | "zh" | "ja" | "ko" | "nl" | "ru"
  | "tr"; // <-- Add here
```

### 3. Update Schema

```typescript
// src/schemas/shared.schema.ts
export const SupportedLanguageSchema = z.enum([
  "en", "es", "pt", "de", "fr", "it", "zh", "ja", "ko", "nl", "ru",
  "tr", // <-- Add here
]);
```

### 4. Add DRM Message

```typescript
// src/domain/rules.ts
DRM_LIMIT_MESSAGES = [
  // ... existing messages
  "Kırpma sınırına ulaştınız", // Turkish
];
```

### 5. Add Tests

```typescript
// tests/unit/languages/turkish.test.ts
import { describe, it, expect } from "vitest";
import { parseString } from "../../../src/index.js";

describe("Turkish language", () => {
  it("parses Turkish clippings", () => {
    const content = `
Kitap Adı (Yazar Adı)
- Sayfa 42'deki vurgulama | konum 100-105 | Eklendi Cuma, 1 Ocak 2024 10:30:45

Test içeriği.

==========
`;
    const result = parseString(content, { language: "tr" });
    expect(result.clippings).toHaveLength(1);
    expect(result.meta.detectedLanguage).toBe("tr");
  });
});
```

### 6. Update README

Add your language to the "Supported Languages" table.

---

## Build & Release Process

### Local Development

```bash
# Install dependencies
pnpm install

# Run in watch mode
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint + format
pnpm check

# Build
pnpm build
```

### Build Output

```bash
pnpm build
# Generates:
# dist/
# ├── index.js        # ESM entry
# ├── index.cjs       # CJS entry
# ├── index.d.ts      # TypeScript declarations
# ├── node/
# │   ├── index.js
# │   ├── index.cjs
# │   └── index.d.ts
# └── ... (all modules)
```

### Release Process (Changesets)

```bash
# 1. Create a changeset
pnpm changeset

# 2. Select packages (kindle-tools-ts)
# 3. Select version bump (patch/minor/major)
# 4. Write changelog entry
# 5. Commit the changeset

git add .
git commit -m "chore: add changeset for feature X"

# 6. When ready to release, version packages
pnpm changeset version

# 7. Commit version bump
git add .
git commit -m "chore: release v1.0.1"

# 8. Publish to npm (CI does this automatically)
pnpm publish --access public
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]

jobs:
  test:
    - pnpm install
    - pnpm check          # Lint + format
    - pnpm typecheck      # TypeScript
    - pnpm test --coverage # Vitest
    - pnpm build          # tsup

  release:
    if: github.ref == 'refs/heads/main'
    - pnpm changeset publish
```

---

## Performance Considerations

### File Size Limits

| Scenario | Recommendation |
|----------|----------------|
| < 1 MB | No issues, parse directly |
| 1-10 MB | Works fine, may take 1-2 seconds |
| 10-50 MB | Consider showing progress indicator |
| > 50 MB | Consider streaming (not currently supported) |

### Memory Usage

The library loads the entire file into memory. For very large files:

```typescript
// Memory estimate
const estimatedMemory = fileSize * 3; // ~3x for parsed objects

// For a 10 MB file: ~30 MB RAM
// For a 50 MB file: ~150 MB RAM
```

### Optimization Tips

```typescript
// 1. Disable unused features
const result = parseString(content, {
  extractTags: false,      // Skip tag extraction
  normalizeUnicode: false, // Skip NFC normalization
  cleanContent: false,     // Skip content cleaning
});

// 2. Filter early
const result = parseString(content, {
  excludeTypes: ["bookmark"], // Skip bookmarks entirely
  minContentLength: 10,       // Skip very short highlights
  onlyBooks: ["Specific Book"], // Only parse specific books
});

// 3. Process in chunks (advanced)
const blocks = tokenize(content);
const chunks = chunkArray(blocks, 1000);
for (const chunk of chunks) {
  const clippings = parseBlocks(chunk);
  await processAndExport(clippings);
}
```

### Benchmarks

Typical performance on a modern laptop (M1/Intel i7):

| File Size | Clippings | Parse Time | Process Time |
|-----------|-----------|------------|--------------|
| 100 KB | ~100 | ~50 ms | ~10 ms |
| 1 MB | ~1,000 | ~200 ms | ~50 ms |
| 10 MB | ~10,000 | ~2 sec | ~500 ms |
| 50 MB | ~50,000 | ~10 sec | ~2 sec |

---

*Last Updated: 2026-01-18 | v1.0 Feature Complete*

