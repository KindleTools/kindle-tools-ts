# Architecture

Technical overview of kindle-tools-ts for contributors and developers who want to understand or extend the codebase.

## Project Structure

```
kindle-tools-ts/
├── src/
│   ├── core/               # Core parsing and processing
│   │   ├── constants.ts    # Language patterns, DRM messages
│   │   ├── tokenizer.ts    # Splits file into blocks
│   │   ├── language-detector.ts  # Auto-detects language
│   │   ├── parser.ts       # Parses blocks into clippings
│   │   └── processor.ts    # Dedup, merge, link notes
│   │
│   ├── exporters/          # Export format implementations
│   │   ├── json.exporter.ts
│   │   ├── csv.exporter.ts
│   │   ├── markdown.exporter.ts
│   │   ├── obsidian.exporter.ts
│   │   ├── joplin.exporter.ts
│   │   └── html.exporter.ts
│   │
│   ├── utils/              # Utility functions
│   │   ├── normalizers.ts  # Unicode, BOM, whitespace
│   │   ├── sanitizers.ts   # Title/author extraction
│   │   ├── dates.ts        # Multi-language date parsing
│   │   ├── hashing.ts      # Deterministic ID generation
│   │   ├── similarity.ts   # Jaccard similarity, fuzzy matching
│   │   ├── stats.ts        # Statistics calculation
│   │   ├── tag-extractor.ts # Extract tags from notes
│   │   ├── text-cleaner.ts # PDF artifact removal
│   │   ├── page-utils.ts   # Page formatting, estimation
│   │   └── geo-location.ts # Optional location metadata
│   │
│   ├── types/              # TypeScript interfaces
│   │   ├── clipping.ts     # Clipping, ClippingType
│   │   ├── config.ts       # ParseOptions, ProcessOptions
│   │   ├── exporter.ts     # Exporter, ExporterOptions
│   │   ├── language.ts     # SupportedLanguage, patterns
│   │   └── stats.ts        # ClippingsStats, BookStats
│   │
│   ├── gui/                # Browser-based testing GUI
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   │
│   ├── index.ts            # Library entry point
│   └── cli.ts              # CLI implementation
│
├── tests/
│   ├── unit/               # Unit tests per module
│   ├── integration/        # Full pipeline tests
│   └── fixtures/           # Test data
│
└── dist/                   # Build output (ESM + CJS + DTS)
```

## Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        My Clippings.txt                              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. TOKENIZER                                                        │
│     - Split by "==========" separator                                │
│     - Normalize line endings                                         │
│     - Remove BOM                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. LANGUAGE DETECTOR                                                │
│     - Analyze metadata patterns ("Added on", "Añadido el", etc.)     │
│     - Support: EN, ES, PT, DE, FR, IT, ZH, JA, KO, NL, RU            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. PARSER                                                           │
│     - Extract: title, author, type, page, location, date, content    │
│     - Generate deterministic ID (SHA-256 truncated)                  │
│     - Detect DRM limit messages                                      │
│     - Identify sideloaded books (.pdf, .epub)                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. PROCESSOR (optional steps)                                       │
│     ├─ removeDuplicates()     → Exact duplicate removal              │
│     ├─ smartMergeHighlights() → Merge overlapping selections         │
│     ├─ linkNotesToHighlights()→ Associate notes with highlights      │
│     ├─ extractTagsFromLinkedNotes() → Parse #tags from notes         │
│     ├─ flagSuspiciousHighlights()   → Mark accidental/fragments      │
│     └─ flagFuzzyDuplicates()  → Jaccard similarity detection         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. EXPORTER                                                         │
│     - JSON, CSV, Markdown, Obsidian, Joplin JEX, HTML                │
│     - Configurable folder structure and author case                  │
│     - Tag synchronization across formats                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Model

### Clipping

The core data structure representing a single clipping:

```typescript
interface Clipping {
  // Identification
  id: string;                    // Deterministic SHA-256 hash (12 chars)
  blockIndex: number;            // Original position in file

  // Book metadata
  title: string;                 // Clean title
  titleRaw: string;              // Original title (preserved)
  author: string;                // Extracted author
  authorRaw: string;             // Original author (preserved)

  // Content
  content: string;               // Clean content
  contentRaw: string;            // Original content (preserved)
  type: 'highlight' | 'note' | 'bookmark' | 'clip' | 'article';

  // Location
  page: number | null;
  location: {
    raw: string;                 // "100-105"
    start: number;
    end: number | null;
  };

  // Date
  date: Date | null;
  dateRaw: string;               // Original date string

  // Flags
  isLimitReached: boolean;       // DRM limit detected
  isEmpty: boolean;              // No content
  language: SupportedLanguage;
  source: 'kindle' | 'sideload';

  // Stats
  wordCount: number;
  charCount: number;

  // Linking (after processing)
  linkedNoteId?: string;         // ID of linked note
  linkedHighlightId?: string;    // ID of linked highlight
  note?: string;                 // Merged note content
  tags?: string[];               // Extracted tags
}
```

## Key Algorithms

### Deterministic ID Generation

IDs are generated using SHA-256 hash of normalized content, ensuring:
- Same clipping always gets same ID
- Idempotent imports (no duplicates on re-import)
- Collision-resistant (12-char hex prefix)

```typescript
const id = sha256(`${title}|${author}|${type}|${location.raw}|${contentPrefix}`).slice(0, 12);
```

### Smart Merge (Overlapping Highlights)

When you extend a highlight in Kindle, it creates a new entry. Smart merge detects these overlaps:

```
Original:  "The quick brown"
Extended:  "The quick brown fox jumps"
Result:    Keep the longer version, merge tags
```

Detection criteria:
- Same title
- Overlapping location ranges
- One content is subset of the other (or high Jaccard similarity)

### Note-to-Highlight Linking

Notes in Kindle are stored separately. Linking associates them:

1. **Range Coverage** (preferred): Note location within highlight's location range
   ```
   Highlight: locations 100-150
   Note: location 120 → LINKED
   ```

2. **Proximity Fallback**: Distance ≤ 10 locations
   ```
   Highlight: location 100
   Note: location 105 → LINKED (within 10)
   ```

### Tag Extraction

Tags are extracted from note content:
- Hashtag format: `#important #review`
- Comma/semicolon separated: `important, review`
- Newline separated

After extraction:
- Tags are added to the linked highlight's `tags` array
- Original note content is preserved in `note` field

## Joplin JEX Format

The JEX format is a TAR archive containing:

```
clippings.jex/
├── {id}.md              # Root notebook
├── {id}.md              # Author notebook (optional)
├── {id}.md              # Book notebook
├── {id}.md              # Note (clipping)
├── {id}.md              # Tag
└── {id}.md              # Note-Tag association
```

Each file has YAML-like metadata at the bottom:
```markdown
[0042] 📖 Quote content here...

**Book:** Title
**Author:** Author Name

---

> The actual highlight text

id: {32-char-deterministic-id}
parent_id: {notebook-id}
created_time: 2024-01-01T00:00:00.000Z
type_: 1  # 1=note, 2=folder, 5=tag, 6=note_tag
```

Deterministic IDs ensure:
- Re-importing updates existing notes instead of creating duplicates
- Consistent hierarchy across imports

## Design Decisions

### Why SHA-256 for IDs?

- **Deterministic**: Same input always produces same output
- **Collision-resistant**: 12 hex chars = 48 bits = very low collision probability
- **Cross-platform**: Works identically in Node.js and browser

### Why Preserve Raw Fields?

The `titleRaw`, `authorRaw`, `contentRaw` fields preserve original data because:
- User can verify cleaning/normalization was correct
- Debugging parsing issues
- Potential future re-processing with different options

### Why Tags in Frontmatter (Obsidian)?

Following Obsidian best practices:
- Tags in YAML frontmatter are indexed by Obsidian
- No hashtags in YAML (they make tags invalid)
- Merged with default tags (`kindle`, `highlights`)

### Why 3-Level Hierarchy for Joplin?

`Root > Author > Book > Notes` mirrors typical library organization:
- Users with many books can navigate by author first
- Configurable: can disable author level for flat structure

## Testing Strategy

```
tests/
├── unit/                    # Isolated function tests
│   ├── tokenizer.test.ts    # Block splitting
│   ├── parser.test.ts       # Metadata extraction
│   ├── processor.test.ts    # Dedup, merge, link
│   ├── exporters.test.ts    # All export formats
│   ├── normalizers.test.ts  # Unicode, BOM
│   ├── sanitizers.test.ts   # Title/author cleaning
│   └── ...
│
├── integration/             # Full pipeline tests
│   └── pipeline.test.ts     # Parse → Process → Export
│
└── fixtures/
    └── sample-clippings.ts  # Test data
```

**Coverage targets**: 80% for lines, functions, branches, statements

## Browser Compatibility

The library is isomorphic (works in Node.js and browser):

- **Node.js**: File system access for `parseFile()`
- **Browser**: String parsing only via `parseString()`

The GUI (`src/gui/`) uses Vite for development and demonstrates browser usage.

## Dependencies

**Runtime** (only 2):
- `date-fns`: Multi-locale date parsing
- `zod`: Schema validation

**Development**:
- `tsup`: Build (ESM + CJS + DTS)
- `vitest`: Testing
- `biome`: Linting/formatting
- `husky`: Git hooks
- `changesets`: Versioning

### Architecture Principles (Refactor 2026)

This project strictly adheres to Clean Architecture principles to ensure scalability and maintainability.

#### 1. Factory Pattern & Dependency Injection
We use **Factory Method** patterns to instantiate Importers and Exporters. This decouples the CLI/Consumer from concrete implementations.

- **ImporterFactory:** Dynamically selects the correct parser based on file signature/extension.
- **ExporterFactory:** Provides the requested `Exporter` implementation based on the format string.

#### 2. Clean Layer Boundaries (Path Aliases)
The project structure is enforced via TypeScript path aliases to prevent tight coupling and circular dependencies.

- `@core/*`: Pure domain logic (Processing, Tokenizing). Zero dependencies on I/O.
- `@importers/*`: Adapters that convert external formats (TXT, JSON, CSV) into our Domain Entity (`Clipping`).
- `@exporters/*`: Adapters that convert Domain Entities into external formats.
- `@utils/*`: Shared, pure helper functions (Dates, Hashing, Sanitization).
- `@app-types/*`: **Shared Domain Types** (`Clipping`, `Stats`). These are the "language" spoken across the entire app.
- `@exporters/types`: **Module-Specific Types** (Options, Structures) relevant *only* for export logic.

#### 3. Unified Processing Pipeline
Regardless of the input source (Raw Text, JSON backup, CSV), all data flows through the same **Pipeline**:
1. **Import** (Normalize into `Clipping[]`)
2. **Process** (Deduplicate, Merge, Link Notes) -> *This logic is centralized in `@core/processor`*
3. **Export** (Transform into target format)

This ensures that a JSON backup, when re-imported, undergoes the same rigorous cleanup and deduplication as a raw Kindle file.
