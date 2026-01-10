# Architecture

Technical overview of kindle-tools-ts for contributors and developers who want to understand or extend the codebase.

> **Note:** This is a **pure TypeScript library**. The CLI has been removed. A visual workbench for testing is available in `tests/workbench/`.

## Project Structure

```
kindle-tools-ts/
├── src/
│   ├── core/               # Orchestration & System-wide logic
│   │   ├── constants.ts    # System constants
│   │   ├── processor.ts    # Dedup, merge, link notes (The "Processor")
│   │   └── processing/     # Processing modules (dedup, merge, link, quality)
│   │
│   ├── domain/             # Pure Business Logic (Entities & Rules)
│   │   ├── index.ts        # Barrel export for all domain modules
│   │   ├── stats.ts        # Statistics logic
│   │   ├── geography.ts    # Coordinates & Distance
│   │   ├── tags.ts         # Business rules for cleaning tags
│   │   ├── locations.ts    # Page/location utilities
│   │   └── sanitizers.ts   # Title/Author cleaning rules
│   │
│   ├── importers/          # Data Ingestion
│   │   ├── index.ts        # Barrel export
│   │   ├── core/           # Factory & types
│   │   ├── formats/        # Concrete implementations (txt, json, csv)
│   │   │   └── txt/        # Kindle TXT parser (tokenizer, parser, language detector)
│   │   └── shared/         # Base classes & utilities
│   │
│   ├── exporters/          # Export Adapters
│   │   ├── index.ts        # Barrel export
│   │   ├── core/           # Factory & types
│   │   ├── formats/        # Concrete implementations (json, csv, md, obsidian, joplin, html)
│   │   └── shared/         # Base classes & utilities
│   │
│   ├── utils/              # Generic, App-Agnostic Utilities
│   │   ├── text/           # Normalizers, patterns, similarity, encoding
│   │   ├── fs/             # Archive creation (tar, zip)
│   │   ├── system/         # Dates, errors
│   │   └── security/       # CSV sanitizer
│   │
│   ├── types/              # Shared Types
│   ├── schemas/            # Zod validation schemas
│   ├── templates/          # Handlebars templates
│   ├── plugins/            # Plugin system (registry, hooks, discovery)
│   ├── errors/             # Error handling (neverthrow Result types)
│   ├── config/             # Configuration loading (cosmiconfig)
│   ├── node/               # Node.js-specific entry point (parseFile)
│   └── index.ts            # Public API (browser-safe)
│
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Pipeline tests
│   ├── fixtures/           # Test data
│   └── workbench/          # Visual testing GUI (Vite app)
│
└── dist/                   # Build output
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

- **Node.js**: File system access for `parseFile()` (import from `kindle-tools-ts/node`)
- **Browser**: String parsing only via `parseString()` (import from `kindle-tools-ts`)

The workbench (`tests/workbench/`) uses Vite for development and demonstrates browser usage.

## Error Handling & Result Pattern

The project uses **neverthrow** for type-safe error handling, avoiding try-catch blocks in favor of explicit Result types.

### Result Types

```typescript
// src/errors/result.ts
import { Result, ResultAsync, ok, err } from 'neverthrow';

// Import operations return typed results
type ImportResult = Result<ImportSuccess, ImportError>;
type ExportResult = Result<ExportSuccess, ExportError>;

// Factory functions for consistent error creation
importSuccess(clippings, warnings);
importParseError(message, { path, line, cause });
exportSuccess(output, files);
exportUnknownFormat(format);
```

### Centralized Error Codes

```typescript
// src/errors/codes.ts
export const ErrorCode = {
  // Import errors
  IMPORT_PARSE_ERROR: 'IMPORT_PARSE_ERROR',
  IMPORT_EMPTY_FILE: 'IMPORT_EMPTY_FILE',
  IMPORT_INVALID_FORMAT: 'IMPORT_INVALID_FORMAT',

  // Export errors
  EXPORT_UNKNOWN_FORMAT: 'EXPORT_UNKNOWN_FORMAT',
  EXPORT_WRITE_FAILED: 'EXPORT_WRITE_FAILED',
  EXPORT_TEMPLATE_ERROR: 'EXPORT_TEMPLATE_ERROR',
  // ...
} as const;
```

### Pattern Matching Usage

```typescript
// In CLI and GUI
const result = await importer.import(content);

result.match(
  (success) => {
    console.log(`Imported ${success.clippings.length} clippings`);
    if (success.warnings.length > 0) {
      console.warn('Warnings:', success.warnings);
    }
  },
  (error) => {
    console.error(`[${error.code}] ${error.message}`);
  }
);
```

### Why neverthrow?

- **Type-safe errors**: Errors are part of the function signature
- **Explicit handling**: Cannot forget to handle errors
- **Composable**: Chain operations with `.andThen()`, `.map()`, `.orElse()`
- **Async support**: `ResultAsync` wraps Promise-based operations

## Plugin System

The project includes an extensible plugin architecture for custom importers/exporters.

### Structure

```
src/plugins/
├── types.ts       # Plugin interfaces (ImporterPlugin, ExporterPlugin)
├── registry.ts    # PluginRegistry singleton
├── hooks.ts       # Lifecycle hooks (beforeImport, afterExport, etc.)
├── adapters.ts    # Integration with Factory pattern
├── discovery.ts   # Auto-discovery from node_modules
└── examples/      # Reference implementations (Anki exporter)
```

### Plugin Interface

```typescript
interface ExporterPlugin {
  name: string;           // Unique identifier (kebab-case)
  version: string;        // Semver
  format: string;         // CLI format name
  aliases?: string[];     // Alternative names
  description?: string;
  create: () => Exporter; // Factory function
}
```

### Lifecycle Hooks

```typescript
hookRegistry.add('beforeExport', (clippings, format) => {
  return clippings.filter(c => c.content.length > 20);
});

hookRegistry.add('afterExport', (output, format) => {
  return `<!-- Generated by KindleTools -->\n${output}`;
});
```

## Schema Validation (Zod)

All external data is validated at system boundaries using **Zod** schemas.

### Schema Organization

```
src/schemas/
├── clipping.schema.ts   # ClippingImportSchema, ClippingStrictSchema
├── config.schema.ts     # ConfigFileSchema, ParseOptionsSchema
├── exporter.schema.ts   # ExporterOptionsSchema
├── cli.schema.ts        # CLI argument validation
└── index.ts             # Re-exports
```

### Lenient vs Strict Schemas

```typescript
// Lenient: For importing external data (all fields optional)
const ClippingImportSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  // ...
});

// Strict: For internal validation (required fields enforced)
const ClippingStrictSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  // ...
});
```

## Dependencies

**Runtime**:
- `date-fns`: Multi-locale date parsing
- `handlebars`: Template engine for exports
- `jszip`: Archive creation (Joplin JEX, etc.)
- `zod`: Schema validation
- `neverthrow`: Type-safe error handling
- `cosmiconfig`: Configuration file discovery

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

#### 2. Domain-Driven Design & Clean Architecture
The project is structured to separate "Business Rules" from "Infrastructure" and "Orchestration".

- **`@domain/*` (The "What"):** Contains pure business logic and rules (e.g., *How do we calculate reading stats?*, *What defines a valid tag?*). These modules are completely independent of the rest of the system.
- **`@core/*` (The "How"):** The application layer that orchestrates the data flow. It uses the Domain to process data but doesn't define the rules itself.
- **`@utils/*` (The "Tools"):** Generic, app-agnostic utilities (e.g., *How to zip a file?*, *How to hash a string?*).

#### 3. Strict Layer Boundaries (Path Aliases)
We enforce structure via TypeScript path aliases:

- `#domain/*`: **Pure Business Logic**. No dependencies on Core or Importers.
- `#core/*`: **Orchestration Logic**. Connects Domain, Importers, and Exporters.
- `#importers/*`: **Adapters** for external data formats.
- `#exporters/*`: **Adapters** for output formats.
- `#utils/*`: **Generic Tools**. Zero dependencies on app logic.
- `#app-types/*`: **Shared Domain Types**.

#### 4. Unified Processing Pipeline
Regardless of the input source (Raw Text, JSON backup, CSV), all data flows through the same **Pipeline**:
1. **Import** (Normalize into `Clipping[]`)
2. **Process** (Deduplicate, Merge, Link Notes) -> *Centralized in `@core/processor`*
3. **Export** (Transform into target format)

This ensures that a JSON backup, when re-imported, undergoes the same rigorous cleanup and deduplication as a raw Kindle file.

### Toolchain & DevOps Strategy (2026 Standards)

The project leverages a "Bleeding Edge, Yet Stable" stack to maximize developer velocity and correctness.

#### 1. High-Performance Tooling
We prioritize tools written in Rust/Go for sub-second feedback loops:
- **Biome:** Replaces ESLint + Prettier. 20x faster, zero-config, handles formatting and linting in one pass.
- **Tsup (esbuild):** Instant builds for the library. Zero config required for ESM/CJS interop.
- **Vitest:** Instant test suite execution with Vite integration (replacing Jest).
- **Turborepo:** Intelligent remote caching. If you only touch the GUI, the Library tests won't re-run in CI.

#### 2. Strict Type Safety
- **Strict Mode:** Enabled in `tsconfig`.
- **`arethetypeswrong`:** Validates `package.json` exports to prevent "it works on my machine" issues for consumers using different module resolution strategies (NodeNext, Bundler, etc.).

#### 3. Monorepo-Lite Structure
Even though it's a single library, we treat it as a monorepo (Library + GUI + Docs) using **pnpm workspaces** + **Turbo**. This allows us to scale the "ecosystem" (e.g. adding a VSCode extension or a Web App later) without restructuring the repo.

#### 4. Import Strategy: Native Node Subpath Imports
To ensure rock-solid compatibility with modern Node.js ESM standards (`NodeNext`), we strictly avoid fragile `tsconfig` `paths`. Instead, we use **Native Node Subpath Imports** (`#alias` prefix).

- **Mechanism:** Mapped in `package.json` under `"imports"`.
  ```json
  "imports": {
    "#core/*.js": "./src/core/*.ts"
  }
  ```
- **Benefit:** This is supported natively by Node.js, and correctly resolved by TypeScript, Esbuild, and Vite without relying on brittle build-time path transformations. It guarantees that our internal aliases behave identically in dev, test, and production builds.



## 🏗️ Project Structure

This project follows a **Feature/Domain-based Architecture**, moving away from a traditional Layered Architecture (controllers/services/utils) to better reflect the business domain.

### Core Principles

1.  **Collocation**: Code that changes together stays together.
2.  **Explicit Domain**: The `core` folder contains the business rules, not generic utilities.
3.  **Dependency Rule**: Dependencies point inwards. Importers depend on Core; Core depends on nothing (or minimal Utils).

### Directory Brekadown

```
src/
├── core/                 # 🧠 The Brain: Domain Logic (Business Rules)
│   ├── processor.ts      # Main pipeline orchestration
│   ├── hashing.ts        # ID generation logic (Business Rule)
│   ├── similarity.ts     # Fuzzy duplicate detection logic (Business Rule)
│   └── constants.ts      # Domain constants
│
├── domain/               # 📦 Domain Entities & Pure Logic
│   ├── stats.ts          # Statistics calculation
│   ├── sanitizers.ts     # Data cleaning rules
│   ├── languages.ts      # Language definitions & patterns
│   └── geography.ts      # Geolocation extensions
│
├── importers/            # 📥 Data Ingestion
│   ├── core/             # Base interfaces and factories
│   ├── formats/          # Concrete implementation (txt, json, csv)
│   └── shared/           # Shared utilities
│
├── exporters/            # 📤 Data Egress
│   ├── core/             # Base interfaces and factories
│   ├── formats/          # Concrete implementations (md, json, joplin...)
│   └── shared/           # Shared utilities
│
├── utils/                # 🛠️ Generic Tools (Stateless & Dumb)
│   ├── fs/               # File system helpers (ZIP, TAR)
│   ├── system/           # Date formatting, Error handling
│   └── text/             # Basic string manip (Encoding, Normalizing)
│
├── templates/            # 🎨 Export Templates (Handlebars)
│   └── default.ts        # Default layouts
│
├── node/                 # 🟢 Node.js Entry Point
│   └── index.ts          # Node-specific exports (FileSystem access)
│
├── plugins/              # 🔌 Plugin System
│   └── registry.ts       # Plugin registry, hooks, discovery
│
└── errors/               # ⚠️ Error Handling (neverthrow)
    └── result.ts         # Result types and factory functions
```

> **Note:** The visual workbench for testing is at `tests/workbench/main.ts` (not in src/).

---

## 🧠 Key Design Decisions

### 1. Hashing as a Domain Concept
**Decision**: Moved `hashing.ts` from `utils` to `core`.
**Reason**: The generation of a Clipping ID is not a generic utility. It is a fundamental business rule that defines **identity**. If we change how we hash (e.g., stopping the inclusion of location), we fundamentally change the application's behavior regarding duplicates.

### 2. Similarity Engine location
**Decision**: Moved `similarity.ts` from `utils` to `core`.
**Reason**: The Jaccard similarity logic is the engine behind the "Fuzzy Duplicate Detection" feature. It is core business logic, not a generic string utility.

### 3. Parser-Specific Cleaning
**Decision**: Moved `text-cleaner.ts` inside `importers/txt/core`.
**Reason**: This file handles artifacts specific to the Kindle TXT format (PDF line breaks, etc.). It is not a general text utility and shouldn't be exposed as such. It is highly coupled to the TXT parser.

### 4. Universal Core vs Node Adapters
**Decision**: Split `src/index.ts` (Universal) and `src/node/index.ts` (Node.js).
**Reason**: To ensure the library works in strictly non-Node environments (like Browsers or Edge Workers), the main entry point MUST NOT depend on 'fs' or 'path'. Node-specific functionality (like `parseFile`) is isolated in a separate entry point.

### 5. Languages as a Domain Concept
**Decision**: Moved `languages.ts` to `domain`.
**Reason**:  Knowledge about what languages are supported and their specific patterns (date formats, keywords) is a core part of the "Kindle Domain", not just an implementation detail of the text parser. This decoupling allows other parts of the system to be language-aware without depending on the `txt` importer.

### 6. Importer/Exporter Pattern
**Decision**: Use a Strategy Pattern for Importers and Exporters.
**Reason**: Allows easy extension. New formats (e.g., Readwise CSV, Notion API) can be added as new classes without modifying the core processing pipeline.

### 7. Deterministic Processing
**Decision**: The `process()` function in `core/processor.ts` is pure and deterministic.
**Reason**: It takes raw clippings and returns processed clippings + stats. It does not perform I/O. This makes the core logic 100% testable without mocks.

---

## 🔄 Data Flow

1.  **Import**: Raw file -> `Importer` -> `Clipping[]` (Raw)
2.  **Process**: `Clipping[]` -> `Processor` -> `Clipping[]` (Cleaned, Deduped, Linked)
3.  **Export**: `Clipping[]` -> `Exporter` -> Output (File/String/Archive)

---

## 🔮 Future Improvements

-   **Pipeline Object**: Convert the `process()` function into a composable `Pipeline` class to allow plugins/middleware.
-   **FileSystem Abstraction**: Create a proper `VirtualFileSystem` to handle exports uniformly (whether writing to disk in Node or creating a ZIP in Browser).
