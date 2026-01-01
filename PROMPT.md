# kindle-tools-ts — Project Status & Implementation Guide

**Last Updated:** 2026-01-01  
**Current Phase:** Phase 4 Complete, Ready for Phase 5 & 6  
**Build Status:** ✅ Passing  
**Test Status:** ✅ 34 tests passing  

---

## 📊 Project Progress Overview

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 🔵 1 | Scaffolding & Tooling | ✅ **COMPLETE** | 100% |
| 🟢 2 | Types & Constants | ✅ **COMPLETE** | 100% |
| 🟡 3 | Core Utilities | ✅ **COMPLETE** | 100% |
| 🟠 4 | Core Parser & Processor | ✅ **COMPLETE** | 100% |
| 🔴 5 | Exporters | 🔄 **PARTIAL** | 50% |
| 🟣 6 | CLI Tool | 📋 **PLACEHOLDER** | 10% |
| ⚪ 7 | Testing & Documentation | 🔄 **IN PROGRESS** | 40% |
| ⚫ 8 | Publishing | ⏳ **PENDING** | 0% |

---

## ✅ What Has Been Done

### Phase 1: Scaffolding & Tooling ✅

- [x] Project initialized with `pnpm`
- [x] `package.json` configured with:
  - Dual ESM/CJS exports
  - CLI binary (`kindle-tools`)
  - Scripts: build, test, lint, typecheck
  - Keywords for npm SEO
- [x] `tsconfig.json` with strict mode, ES2022, NodeNext
- [x] `tsup.config.ts` for dual build (ESM + CJS + DTS)
- [x] `vitest.config.ts` with v8 coverage, 80% thresholds
- [x] `biome.json` for linting/formatting (basic config)
- [x] Husky + lint-staged configured for pre-commit hooks
- [x] Changesets configured for versioning
- [x] `.gitignore` complete
- [x] `LICENSE` (MIT)
- [x] `README.md` initial version

### Phase 2: Types & Constants ✅

- [x] `src/types/language.ts` — SupportedLanguage (11 languages), LanguagePatterns
- [x] `src/types/clipping.ts` — Clipping, ClippingType, ClippingLocation, RawClipping
- [x] `src/types/config.ts` — ParseOptions, ParseResult, ParseWarning, ProcessOptions
- [x] `src/types/stats.ts` — ClippingsStats, BookStats
- [x] `src/types/exporter.ts` — Exporter, ExporterOptions, ExportResult
- [x] `src/types/index.ts` — Re-exports all types
- [x] `src/core/constants.ts` — LANGUAGE_MAP (11 languages), PATTERNS, DRM_LIMIT_MESSAGES

### Phase 3: Core Utilities ✅

- [x] `src/utils/normalizers.ts` — Unicode NFC, BOM removal, whitespace normalization
- [x] `src/utils/sanitizers.ts` — Title/author extraction, DRM detection, content cleaning
- [x] `src/utils/dates.ts` — Multi-language date parsing with date-fns
- [x] `src/utils/hashing.ts` — Deterministic ID generation with SHA-256
- [x] `src/utils/stats.ts` — Statistics calculation, groupByBook, countWords

### Phase 4: Core Parser & Processor ✅

- [x] `src/core/tokenizer.ts` — Splits file into blocks (COMPLETE & TESTED)
- [x] `src/core/language-detector.ts` — Auto-detects language (COMPLETE)
- [x] `src/core/parser.ts` — Full parser with multi-language support (COMPLETE)
- [x] `src/core/processor.ts` — Deduplication, Smart Merging, Note Linking (COMPLETE)

### Phase 5: Exporters (PARTIAL)

- [x] `src/exporters/json.exporter.ts` — JSON export (COMPLETE)
- [x] `src/exporters/csv.exporter.ts` — CSV export with BOM (COMPLETE)
- [x] `src/exporters/markdown.exporter.ts` — Basic Markdown export (COMPLETE)
- [ ] `src/exporters/obsidian.exporter.ts` — NOT CREATED
- [ ] `src/exporters/joplin.exporter.ts` — NOT CREATED
- [ ] `src/exporters/html.exporter.ts` — NOT CREATED

### Phase 6: CLI Tool (PLACEHOLDER)

- [x] `src/cli.ts` — Structure and help text (PLACEHOLDER)
- [ ] Actual command implementations (parse, export, stats, validate)

### Phase 7: Testing (PARTIAL)

- [x] `tests/unit/tokenizer.test.ts` — 10 tests ✅
- [x] `tests/unit/normalizers.test.ts` — 8 tests ✅
- [x] `tests/unit/sanitizers.test.ts` — 16 tests ✅
- [ ] `tests/unit/parser.test.ts` — NOT CREATED
- [ ] `tests/unit/processor.test.ts` — NOT CREATED
- [ ] `tests/unit/dates.test.ts` — NOT CREATED
- [ ] `tests/unit/language-detector.test.ts` — NOT CREATED
- [ ] `tests/integration/` — NOT CREATED
- [ ] `tests/e2e/cli.test.ts` — NOT CREATED
- [ ] Test fixtures (sample My Clippings.txt files) — NOT CREATED

---

## 🔴 What Needs To Be Done

### Priority 1: Complete Core Parser (Phase 4)

**File:** `src/core/parser.ts`

The parser must:
1. Take tokenized blocks and extract structured data
2. Parse the metadata line (type, page, location, date) for each language
3. Extract title and author from the first line
4. Handle all edge cases (missing data, malformed entries)
5. Return `Clipping[]` with all fields populated

**Key functions to implement:**
```typescript
export function parseBlock(block: TokenizedBlock, language: SupportedLanguage): Clipping | null;
export function parseMetadataLine(line: string, language: SupportedLanguage): MetadataResult | null;
export function parseString(content: string, options?: ParseOptions): ParseResult;
export async function parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>;
```

### Priority 2: Complete Processor (Phase 4)

**File:** `src/core/processor.ts`

The processor must implement:
1. **Smart Merging** — Merge overlapping highlights (critical feature)
2. **Note Linking** — Link notes to their associated highlights
3. **Deduplication** — Remove exact duplicates based on hash
4. **Empty/DRM filtering** — Remove empty or DRM-limited clippings
5. **Statistics calculation** — Generate ClippingsStats

**Key functions to implement:**
```typescript
export function process(clippings: Clipping[], options: ProcessOptions): ProcessedResult;
export function smartMergeHighlights(clippings: Clipping[]): Clipping[];
export function linkNotesToHighlights(clippings: Clipping[]): Clipping[];
export function removeDuplicates(clippings: Clipping[]): { clippings: Clipping[]; removedCount: number };
```

### Priority 3: Additional Exporters (Phase 5)

- `src/exporters/obsidian.exporter.ts` — YAML frontmatter, callouts, wikilinks
- `src/exporters/joplin.exporter.ts` — JEX format with deterministic IDs
- `src/exporters/html.exporter.ts` — Standalone HTML preview

### Priority 4: CLI Implementation (Phase 6)

Implement actual functionality in `src/cli.ts`:
- `kindle-tools parse <file>` — Parse and show summary
- `kindle-tools export <file> --format=<fmt>` — Export to format
- `kindle-tools stats <file>` — Show detailed stats
- `kindle-tools validate <file>` — Validate file format

### Priority 5: Testing (Phase 7)

- Create test fixtures (sample My Clippings.txt in multiple languages)
- Unit tests for parser, processor, dates, language-detector
- Integration tests for full pipeline
- E2E tests for CLI
- Achieve 90%+ coverage

### Priority 6: Publishing (Phase 8)

- GitHub Actions for CI/CD
- npm publish workflow
- Generate CHANGELOG with changesets
- Tag v1.0.0 release

---

## 🏗️ Architecture Reference

### Project Structure

```
kindle-tools-ts/
├── src/
│   ├── core/
│   │   ├── constants.ts      ✅ Complete
│   │   ├── tokenizer.ts      ✅ Complete
│   │   ├── language-detector.ts ✅ Complete
│   │   ├── parser.ts         🔄 Placeholder
│   │   └── processor.ts      🔄 Placeholder
│   │
│   ├── exporters/
│   │   ├── json.exporter.ts  ✅ Complete
│   │   ├── csv.exporter.ts   ✅ Complete
│   │   ├── markdown.exporter.ts ✅ Complete
│   │   ├── obsidian.exporter.ts ⏳ Not created
│   │   ├── joplin.exporter.ts   ⏳ Not created
│   │   └── html.exporter.ts     ⏳ Not created
│   │
│   ├── utils/
│   │   ├── normalizers.ts    ✅ Complete
│   │   ├── sanitizers.ts     ✅ Complete
│   │   ├── dates.ts          ✅ Complete
│   │   ├── hashing.ts        ✅ Complete
│   │   └── stats.ts          ✅ Complete
│   │
│   ├── types/
│   │   ├── clipping.ts       ✅ Complete
│   │   ├── config.ts         ✅ Complete
│   │   ├── stats.ts          ✅ Complete
│   │   ├── language.ts       ✅ Complete
│   │   ├── exporter.ts       ✅ Complete
│   │   └── index.ts          ✅ Complete
│   │
│   ├── index.ts              ✅ Complete
│   └── cli.ts                🔄 Placeholder
│
├── tests/
│   └── unit/
│       ├── tokenizer.test.ts ✅ 10 tests
│       ├── normalizers.test.ts ✅ 8 tests
│       └── sanitizers.test.ts ✅ 16 tests
│
├── dist/                     ✅ Build output working
├── package.json              ✅ Complete
├── tsconfig.json             ✅ Complete
├── tsup.config.ts            ✅ Complete
├── vitest.config.ts          ✅ Complete
├── biome.json                ✅ Basic config
├── .gitignore                ✅ Complete
├── LICENSE                   ✅ MIT
└── README.md                 ✅ Initial version
```

### Supported Languages (11)

| Code | Language | addedOn Pattern |
|------|----------|-----------------|
| `en` | English | "Added on" |
| `es` | Spanish | "Añadido el" |
| `pt` | Portuguese | "Adicionado em" |
| `de` | German | "Hinzugefügt am" |
| `fr` | French | "Ajouté le" |
| `it` | Italian | "Aggiunto il" |
| `zh` | Chinese | "添加于" |
| `ja` | Japanese | "追加日" |
| `ko` | Korean | "추가됨" |
| `nl` | Dutch | "Toegevoegd op" |
| `ru` | Russian | "Добавлено" |

---

## 📝 Clipping Interface (Reference)

```typescript
interface Clipping {
  // Identification
  id: string;                    // Deterministic hash (12 chars)
  
  // Book info
  title: string;                 // Clean title
  titleRaw: string;              // Original title
  author: string;                // Extracted author
  authorRaw: string;             // Original author
  
  // Content
  content: string;               // Clean content
  contentRaw: string;            // Original content
  
  // Type & Location
  type: ClippingType;            // 'highlight' | 'note' | 'bookmark' | 'clip'
  page: number | null;           // Page number
  location: ClippingLocation;    // { raw, start, end }
  
  // Date
  date: Date | null;             // Parsed date
  dateRaw: string;               // Original date string
  
  // Flags
  isLimitReached: boolean;       // DRM limit reached
  isEmpty: boolean;              // Empty content
  language: SupportedLanguage;   // Detected language
  source: 'kindle' | 'sideload'; // Book source
  
  // Stats
  wordCount: number;
  charCount: number;
  
  // Linking
  linkedNoteId?: string;
  linkedHighlightId?: string;
  note?: string;
  
  // Metadata
  blockIndex: number;            // Original position in file
}
```

---

## 🧠 Smart Merging Algorithm (To Implement)

When a user extends a highlight in Kindle, a NEW entry is created instead of updating the old one. This creates "almost duplicate" entries that should be merged.

**Strategy:**
1. Group highlights by book (title)
2. Sort by location.start
3. For each pair of consecutive highlights:
   - If locations overlap (A.end >= B.start - 1) AND
   - Content of A is substring of B (or vice versa)
   - → Merge into single highlight keeping:
     - Longer content
     - Combined location range
     - More recent date
4. Mark merged highlights with a flag

**Example:**
```
Highlight A: Location 100-105, "This is some"
Highlight B: Location 100-110, "This is some text"
Result:      Location 100-110, "This is some text" (A merged into B)
```

---

## 🔗 Note Linking Algorithm (To Implement)

Notes in Kindle are stored as separate entries with the SAME location as their parent highlight.

**Strategy:**
1. Group all clippings by book
2. For each note, find highlight with:
   - Same book
   - Same location (or within 1-2 positions)
   - Type = 'highlight'
3. Link via `linkedNoteId` / `linkedHighlightId`
4. Optionally merge note content into highlight's `note` field

---

## 🚀 Quick Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm build           # Build ESM + CJS + DTS
pnpm test            # Run tests
pnpm test:coverage   # Run tests with coverage
pnpm typecheck       # TypeScript validation
pnpm lint            # Biome linting

# Versioning (when ready to release)
pnpm changeset       # Create a changeset
pnpm version         # Update versions
pnpm release         # Build and publish
```

---

## 📚 Technical Decisions Made

1. **pnpm** over npm/yarn — Faster, disk efficient, strict dependencies
2. **tsup** over tsc/rollup — Zero-config, esbuild-powered, dual build
3. **Vitest** over Jest — Faster, native TypeScript, modern
4. **Biome** over ESLint+Prettier — Single tool, Rust-powered (but has issues with Vue rules)
5. **date-fns** over moment/dayjs — Tree-shakeable, immutable, locale support
6. **zod** for validation — TypeScript-first schema validation
7. **Changesets** for versioning — Works well with pnpm, generates changelogs

---

## 🐛 Known Issues

1. **Biome Vue rules** — Biome 2.x includes Vue rules that trigger on our code. Current workaround: minimal config.
2. **vitest.config.ts deprecated warning** — `poolOptions.threads.singleThread` is deprecated but still works.

---

## 📅 Session History

### 2026-01-01: Initial Scaffolding
- Created project structure
- Configured all tooling (tsup, vitest, biome, husky)
- Implemented types, constants, utilities
- Created tokenizer, language-detector
- Created 3 exporters (JSON, CSV, Markdown)
- Set up 34 passing tests
- Build and tests working ✅

**Next Session Goals:**
1. Implement full parser.ts with metadata extraction
2. Implement processor.ts with Smart Merging
3. Add more unit tests
4. Create test fixtures

---

*This document serves as the project state tracker. Update it after each session.*
