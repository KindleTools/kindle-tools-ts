<div align="center">
  <img src="assets/icon.png" alt="Kindle Tools TS Logo" width="120" />
</div>

# kindle-tools-ts

[![npm version](https://img.shields.io/npm/v/kindle-tools-ts.svg?style=flat-square)](https://www.npmjs.com/package/kindle-tools-ts)
[![CI](https://github.com/KindleTools/kindle-tools-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/KindleTools/kindle-tools-ts/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/kindle-tools-ts.svg?style=flat-square)](https://www.npmjs.com/package/kindle-tools-ts)
[![install size](https://packagephobia.com/badge?p=kindle-tools-ts)](https://packagephobia.com/result?p=kindle-tools-ts)
[![license](https://img.shields.io/npm/l/kindle-tools-ts.svg?style=flat-square)](https://github.com/KindleTools/kindle-tools-ts/blob/main/LICENSE)
[![Biome](https://img.shields.io/badge/Maintained%20with-Biome-60a5fa?style=flat-square&logo=biome)](https://biomejs.dev/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Website-blue.svg?style=flat-square&logo=github)](https://kindletools.github.io/kindle-tools-ts/)

A robust TypeScript library to parse and process Amazon Kindle `My Clippings.txt` files with smart merging, deduplication, and multiple export formats.

👉 **Live Demo / Docs:** https://kindletools.github.io/kindle-tools-ts/

> **v1.0 - Feature Complete.** This library is stable and production-ready. Only accepting bug fixes.

---

## TL;DR (Quick Install)

```bash
npm install kindle-tools-ts
```

```typescript
import { parseFile } from 'kindle-tools-ts/node';
import { JsonExporter } from 'kindle-tools-ts';

const result = await parseFile('./My Clippings.txt');
console.log(`Found ${result.stats.total} clippings`);

const exporter = new JsonExporter();
const json = await exporter.export(result.clippings, { pretty: true });
```

---

## 📑 Table of Contents

- [Why This Library?](#-why-this-library)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Export Formats](#-export-formats)
- [Supported Languages](#-supported-languages)
- [Browser Compatibility](#-browser-compatibility)
- [Configuration](#️-configuration)
- [Technical Details](#-technical-details)
- [FAQ](#-faq)
- [Development](#️-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 💡 Why This Library?

| Problem | Solution |
|---------|----------|
| **Duplicate entries** when you re-highlight or edit highlights | Smart deduplication with deterministic IDs |
| **Overlapping highlights** when extending a selection in Kindle | Automatic merging keeps the longest version |
| **Notes disconnected** from their highlights | Intelligent linking based on location proximity |
| **Messy titles** with `_EBOK`, `(Spanish Edition)`, `.mobi` noise | Advanced cleaning preserves original in `titleRaw` |
| **Multi-language files** (device language changes) | Automatic detection for 11 languages |
| **PDF artifacts** like `pro-\nblem` word breaks | De-hyphenation and text cleaning |
| **Export lock-in** to a single format | 6 formats: JSON, CSV, Markdown, Obsidian, Joplin, HTML |

**Perfect for:**
- 📚 **Obsidian/Joplin users** — Import highlights directly into your vault/notebooks
- 🤖 **Automation enthusiasts** — Integrate into your scripts and workflows
- 💻 **Developers** — Full TypeScript types, tree-shakeable, dual ESM/CJS build
- 🌐 **Multilingual readers** — Works with Kindle devices in any supported language

---

## ✨ Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| 🌍 **Multi-language support** | EN, ES, PT, DE, FR, IT, ZH, JA, KO, NL, RU |
| 🔍 **Auto language detection** | Automatically detects your file's language |
| 🧠 **Smart merging** | Merges overlapping highlights when you extend a selection |
| 🔄 **Deduplication** | Removes exact duplicates with deterministic IDs |
| 🔗 **Note linking** | Links notes to their associated highlights |
| 🏷️ **Tag extraction** | Extracts tags from notes (comma/semicolon separated) |

### Quality & Security

| Feature | Description |
|---------|-------------|
| 🧹 **Text cleaning** | De-hyphenation, space normalization, edition markers removal |
| ⚠️ **Quality flags** | Detects suspicious highlights (accidental, incomplete) |
| 📊 **Fuzzy duplicates** | Jaccard similarity to find near-duplicates |
| 🛡️ **CSV protection** | Formula injection protection (OWASP compliant) |

### Export Formats

| Format | Description |
|--------|-------------|
| **JSON** | Standard JSON with metadata |
| **CSV** | Excel-compatible with BOM |
| **Markdown** | Blockquotes with Handlebars templates |
| **Obsidian** | YAML frontmatter, folder structures |
| **Joplin JEX** | Importable archive with notebooks |
| **HTML** | Standalone page with dark mode & search |

### Technical

| Feature | Description |
|---------|-------------|
| 📘 **TypeScript-first** | Full type definitions with strict mode |
| 🪶 **Lightweight** | 7 runtime dependencies |
| 📥 **Multiple inputs** | Parse TXT, re-import JSON/CSV |
| 🌐 **Isomorphic** | Works in Node.js and browsers |
| 🔒 **Non-destructive** | Always preserves original data (`*Raw` fields) |

---

## 📦 Installation

```bash
npm install kindle-tools-ts
# or
pnpm add kindle-tools-ts
# or
yarn add kindle-tools-ts
```

### Requirements

- **Node.js**: 18.18.0+ (use `.nvmrc` for consistency)
- **Platforms**: Windows, macOS, Linux
- **TypeScript**: 5.0+ (optional, JS works too)

---

## 🚀 Quick Start

### Basic Usage (Node.js)

```typescript
import { JsonExporter } from 'kindle-tools-ts';
import { parseFile } from 'kindle-tools-ts/node';

// Parse your clippings file
const result = await parseFile('./My Clippings.txt');

console.log(`Found ${result.stats.total} clippings from ${result.stats.totalBooks} books`);
console.log(`  - Highlights: ${result.stats.totalHighlights}`);
console.log(`  - Notes: ${result.stats.totalNotes}`);
console.log(`  - Bookmarks: ${result.stats.totalBookmarks}`);

// Export to JSON
const exporter = new JsonExporter();
const jsonOutput = await exporter.export(result.clippings, { pretty: true });
console.log(jsonOutput.output);
```

### Parse from String (Browser-safe)

```typescript
import { parseString } from 'kindle-tools-ts';

const content = `
The Art of War (Sun Tzu)
- Your Highlight on page 42 | Location 100-105 | Added on Friday, January 1, 2024 10:30:45 AM

All warfare is based on deception.

==========
`;

const result = parseString(content);
console.log(result.clippings[0]);
// {
//   id: 'a6439ae5832a',
//   title: 'The Art of War',
//   author: 'Sun Tzu',
//   content: 'All warfare is based on deception.',
//   type: 'highlight',
//   page: 42,
//   location: { raw: '100-105', start: 100, end: 105 },
//   ...
// }
```

### Export to Different Formats

```typescript
import { MarkdownExporter, ObsidianExporter, JoplinExporter } from 'kindle-tools-ts';
import { parseFile } from 'kindle-tools-ts/node';

const result = await parseFile('./My Clippings.txt');

// Markdown
const mdExporter = new MarkdownExporter();
const markdown = await mdExporter.export(result.clippings);

// Obsidian (one file per book)
const obsidianExporter = new ObsidianExporter();
const obsidian = await obsidianExporter.export(result.clippings, {
  outputPath: './vault/books/',
  folderStructure: 'by-author'
});

// Joplin JEX archive
const joplinExporter = new JoplinExporter();
const jex = await joplinExporter.export(result.clippings, {
  outputPath: './clippings.jex'
});
```

---

## 📚 API Reference

### Core Functions

#### `parseFile(filePath, options?)`

Parse a Kindle clippings file from disk. **Node.js only.**

```typescript
import { parseFile } from 'kindle-tools-ts/node';

const result = await parseFile('./My Clippings.txt', {
  language: 'auto',           // 'auto' | 'en' | 'es' | 'pt' | ...
  removeDuplicates: true,     // Remove exact duplicates
  mergeOverlapping: true,     // Merge extended highlights
  mergeNotes: true,           // Link notes to highlights
  extractTags: false,         // Extract tags from notes
  tagCase: 'lowercase',       // 'original' | 'uppercase' | 'lowercase'
});
```

#### `parseString(content, options?)`

Parse clippings from a string. **Works in browser.**

```typescript
import { parseString } from 'kindle-tools-ts';

const result = parseString(fileContent, { language: 'en' });
```

### ParseResult

```typescript
interface ParseResult {
  clippings: Clipping[];      // Parsed clippings
  stats: ClippingsStats;      // Statistics
  warnings: ParseWarning[];   // Any parsing warnings
  meta: {
    fileSize: number;         // Original file size
    parseTime: number;        // Parse time in ms
    detectedLanguage: string; // Detected language code
    totalBlocks: number;      // Total blocks found
    parsedBlocks: number;     // Successfully parsed
  };
}
```

### Clipping

```typescript
interface Clipping {
  id: string;                    // Deterministic hash (12 chars)
  title: string;                 // Clean book title
  author: string;                // Extracted author
  content: string;               // Highlight/note content
  type: 'highlight' | 'note' | 'bookmark' | 'clip' | 'article';
  page: number | null;
  location: { raw: string; start: number; end: number | null };
  date: Date | null;
  dateRaw: string;
  isLimitReached: boolean;       // DRM limit detected
  isEmpty: boolean;
  language: string;
  source: 'kindle' | 'sideload';
  wordCount: number;
  charCount: number;
  note?: string;                 // Linked note content
  tags?: string[];               // Extracted tags
  linkedNoteId?: string;
  linkedHighlightId?: string;
}
```

### Exporters

All exporters implement the same interface:

```typescript
interface Exporter {
  name: string;
  extension: string;
  export(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult>;
}
```

#### ExporterOptions

```typescript
interface ExporterOptions {
  outputPath?: string;           // Output file/directory
  groupByBook?: boolean;         // Group by book
  includeStats?: boolean;        // Include statistics
  pretty?: boolean;              // Pretty print (JSON)
  includeRaw?: boolean;          // Include *Raw fields
  folderStructure?: 'flat' | 'by-book' | 'by-author' | 'by-author-book';
  authorCase?: 'original' | 'uppercase' | 'lowercase';
  includeClippingTags?: boolean; // Include extracted tags
  title?: string;                // Custom export title
  creator?: string;              // Custom author
}
```

#### Available Exporters

| Exporter | Format | Output |
|----------|--------|--------|
| `JsonExporter` | JSON | Single file, optional grouping |
| `CsvExporter` | CSV | Excel-compatible with BOM |
| `MarkdownExporter` | Markdown | Single file with blockquotes |
| `ObsidianExporter` | Obsidian MD | Multiple files with YAML frontmatter |
| `JoplinExporter` | JEX | Importable Joplin archive |
| `HtmlExporter` | HTML | Standalone page with dark mode |

### Importers

Re-process previously exported files:

```typescript
import { JsonImporter, CsvImporter } from 'kindle-tools-ts';

// Import from JSON
const jsonImporter = new JsonImporter();
const result = await jsonImporter.import(jsonContent);

// Import from CSV (tolerates fuzzy headers)
const csvImporter = new CsvImporter();
const csvResult = await csvImporter.import(csvContent);
```

### Custom Logger

Inject your own logger (Pino, Winston, etc.):

```typescript
import { setLogger, resetLogger, nullLogger } from 'kindle-tools-ts';

// Custom logger
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

### Error Handling

```typescript
import { parseFile, isImportError, isValidationError } from 'kindle-tools-ts';

try {
  const result = await parseFile('file.txt');
  
  if (result.isErr()) {
    console.error(`[${result.error.code}] ${result.error.message}`);
  }
} catch (error) {
  if (error instanceof AppException) {
    if (isImportError(error.appError)) {
      console.error('Import error:', error.appError.detailedMessage);
    }
  }
}
```

#### Error Codes

| Domain | Code | Description |
|--------|------|-------------|
| Import | `IMPORT_PARSE_ERROR` | Failed to parse content |
| Import | `IMPORT_EMPTY_FILE` | Empty file |
| Import | `IMPORT_INVALID_FORMAT` | Schema validation failed |
| Export | `EXPORT_UNKNOWN_FORMAT` | Unsupported format |
| Export | `EXPORT_WRITE_FAILED` | Failed to write output |
| Export | `EXPORT_TEMPLATE_ERROR` | Template compilation failed |

### Advanced: `processClippings()`

For advanced use cases, you can call the processor directly:

```typescript
import { processClippings, parseString } from 'kindle-tools-ts';

// Parse without processing
const raw = parseString(content, { 
  removeDuplicates: false,
  mergeOverlapping: false,
  mergeNotes: false 
});

// Process manually with custom options
const processed = processClippings(raw.clippings, {
  removeDuplicates: true,
  mergeOverlapping: true,
  extractTags: true,
  tagCase: 'lowercase',
});

console.log(`Duplicates removed: ${processed.duplicatesRemoved}`);
console.log(`Highlights merged: ${processed.mergedHighlights}`);
console.log(`Notes linked: ${processed.linkedNotes}`);
```

### ProcessResult

```typescript
interface ProcessResult {
  clippings: Clipping[];           // Processed clippings
  duplicatesRemoved: number;       // Exact duplicates removed
  mergedHighlights: number;        // Overlapping merges
  linkedNotes: number;             // Notes linked to highlights
  emptyRemoved: number;            // Empty clippings removed
  suspiciousFlagged: number;       // Flagged as suspicious
  fuzzyDuplicatesFlagged: number;  // Flagged as fuzzy duplicates
  tagsExtracted: number;           // Clippings with tags extracted
  notesConsumed: number;           // Notes removed by mergedOutput
}
```

### ExportResult

Each exporter returns a different output type:

```typescript
// String-based exporters (JSON, CSV, Markdown, HTML)
interface ExportResultString {
  output: string;                  // The exported content
  stats?: ClippingsStats;          // Optional statistics
}

// File-based exporters (Obsidian)
interface ExportResultFiles {
  files: ExportedFile[];           // Array of files
  stats?: ClippingsStats;
}
// ExportedFile: { path: string; content: string }

// Binary exporters (Joplin JEX)
interface ExportResultBinary {
  output: Uint8Array;              // TAR archive bytes
  stats?: ClippingsStats;
}
```

**Usage example:**

```typescript
// JSON returns string
const json = await new JsonExporter().export(clippings);
console.log(json.output); // string

// Obsidian returns files array
const obsidian = await new ObsidianExporter().export(clippings);
for (const file of obsidian.files) {
  await fs.writeFile(file.path, file.content);
}

// Joplin returns Uint8Array
const jex = await new JoplinExporter().export(clippings);
await fs.writeFile('export.jex', jex.output);
```

### Utils Namespace

Utility functions are grouped under the `Utils` namespace:

```typescript
import { Utils } from 'kindle-tools-ts';

// Text utilities
Utils.normalizeText("  multiple   spaces  "); // "multiple spaces"
Utils.normalizeUnicode("café");               // NFC normalized

// Similarity
Utils.jaccardSimilarity("hello world", "world hello"); // 1.0

// Page utilities  
Utils.formatPage(42);                         // "[0042]"
Utils.estimatePageFromLocation(160);          // 10 (160 / 16)
Utils.getPageInfo(clipping);                  // { page: 42, estimated: false }

// Date utilities
Utils.formatDateHuman(new Date());            // "January 18, 2024"

// Geo utilities
Utils.formatLocation({ lat: 40.7, lon: -74 }); // "40.7, -74"
```

**Available modules:**

| Module | Functions |
|--------|-----------|
| `Utils.normalizeText()` | Collapse whitespace, trim |
| `Utils.normalizeUnicode()` | NFC normalization |
| `Utils.jaccardSimilarity()` | Word overlap (0-1) |
| `Utils.formatPage()` | Zero-padded `[0042]` |
| `Utils.estimatePageFromLocation()` | Location ÷ 16 |
| `Utils.getPageInfo()` | Page with estimation flag |
| `Utils.formatDateHuman()` | Human-readable date |
| `Utils.formatLocation()` | Geo coordinates |


## 📤 Export Formats

### JSON

```json
{
  "clippings": [
    {
      "id": "a6439ae5832a",
      "title": "The Art of War",
      "author": "Sun Tzu",
      "content": "All warfare is based on deception.",
      "type": "highlight",
      "page": 42
    }
  ],
  "meta": { "total": 1 }
}
```

### CSV

Excel-compatible with BOM for UTF-8:

```csv
id,title,author,type,page,location,date,content,wordCount
a6439ae5832a,The Art of War,Sun Tzu,highlight,42,100-105,2024-01-01,"All warfare...",6
```

### Markdown

```markdown
# Kindle Highlights

## The Art of War
*Sun Tzu*

> All warfare is based on deception.
> — Page 42, Location 100-105
```

#### Template Customization

```typescript
const exporter = new MarkdownExporter();

// Use presets
exporter.export(clippings, { templatePreset: 'obsidian' });
// Presets: 'default', 'minimal', 'obsidian', 'notion', 'academic', 'compact', 'verbose'

// Custom templates
exporter.export(clippings, {
  customTemplates: {
    clipping: `> {{content}}\n> *({{page}})*\n`,
    book: `# {{title}}\n\n{{#each clippings}}{{> clipping}}{{/each}}`,
  }
});
```

**Template Variables:**

| Variable | Description |
|----------|-------------|
| `content` | Highlight text |
| `title` | Book title |
| `author` | Book author |
| `page` | Page number |
| `location` | Location string |
| `date` | Formatted date |
| `tags` | Extracted tags array |
| `tagsHashtags` | `#tag1 #tag2` |
| `note` | Linked note content |
| `hasNote` | Boolean |
| `hasTags` | Boolean |

### Obsidian

One file per book with YAML frontmatter:

```markdown
---
title: "The Art of War"
author: "Sun Tzu"
source: kindle
total_highlights: 25
tags:
  - strategy
---

# The Art of War

**Author:** [[Sun Tzu]]

## 📝 Highlights

> [!quote] Page 42, Location 100-105
> All warfare is based on deception.
```

**Folder structures:**
- `flat` — All files in root
- `by-book` — `books/Title/Title.md`
- `by-author` — `books/Author/Title.md`
- `by-author-book` — `books/Author/Title/Title.md`

### Joplin JEX

Importable archive with notebooks, notes, and tags. Uses deterministic IDs for idempotent imports.

**Hierarchy:**
- `flat` — `Kindle Highlights > Book > Notes`
- `by-author` — `Kindle Highlights > AUTHOR > Book > Notes`

### HTML

Standalone page with:
- Responsive design
- Dark mode toggle
- Search/filter
- Print-friendly styles
- XSS protection

---

## 🌍 Supported Languages

| Code | Language | "Added on" Pattern |
|------|----------|-------------------|
| `en` | English | "Added on Friday, January 1, 2024" |
| `es` | Spanish | "Añadido el viernes, 1 de enero de 2024" |
| `pt` | Portuguese | "Adicionado em sexta-feira, 1 de janeiro de 2024" |
| `de` | German | "Hinzugefügt am Freitag, 1. Januar 2024" |
| `fr` | French | "Ajouté le vendredi 1 janvier 2024" |
| `it` | Italian | "Aggiunto il venerdì 1 gennaio 2024" |
| `zh` | Chinese | "添加于 2024年1月1日星期五" |
| `ja` | Japanese | "追加日 2024年1月1日金曜日" |
| `ko` | Korean | "추가됨 2024년 1월 1일 금요일" |
| `nl` | Dutch | "Toegevoegd op vrijdag 1 januari 2024" |
| `ru` | Russian | "Добавлено пятница, 1 января 2024 г." |

Language is auto-detected by analyzing the file content.

---

## 🌐 Browser Compatibility

The library is **isomorphic** — works in both Node.js and browsers:

| Environment | Parsing | Exporting | File System |
|-------------|---------|-----------|-------------|
| **Node.js** | ✅ `parseFile()` + `parseString()` | ✅ All formats | ✅ Native fs |
| **Browser** | ✅ `parseString()` only | ✅ All formats | ❌ Use File API |

**Browser example:**

```typescript
import { parseString, JsonExporter } from 'kindle-tools-ts';

// From <input type="file">
const file = inputElement.files[0];
const content = await file.text();

const result = parseString(content);
const exporter = new JsonExporter();
const json = await exporter.export(result.clippings);
```

---

## ⚙️ Configuration

### ParseOptions

```typescript
interface ParseOptions {
  // Language
  language?: 'auto' | 'en' | 'es' | 'pt' | 'de' | 'fr' | 'it' | 'zh' | 'ja' | 'ko' | 'nl' | 'ru';

  // Processing
  removeDuplicates?: boolean;      // Default: true
  mergeOverlapping?: boolean;      // Default: true
  mergeNotes?: boolean;            // Default: true
  extractTags?: boolean;           // Default: false
  tagCase?: 'original' | 'uppercase' | 'lowercase';  // Default: 'uppercase'
  highlightsOnly?: boolean;        // Default: false

  // Normalization
  normalizeUnicode?: boolean;      // Default: true
  cleanContent?: boolean;          // Default: true
  cleanTitles?: boolean;           // Default: true

  // Filtering
  excludeTypes?: ClippingType[];   // Exclude specific types
  excludeBooks?: string[];         // Exclude books by title
  onlyBooks?: string[];            // Only these books
  minContentLength?: number;       // Minimum content length
}
```

---

## 🧠 Technical Details

### Smart Merging

Overlapping highlights are merged using:
- **Location check**: Overlap or within 5 characters
- **Content check**: Substring match OR >50% word overlap (Jaccard)
- **Result**: Longest content, combined range, latest date

### Note Linking

Two-phase algorithm:
1. **Range match**: Note location within highlight's range
2. **Proximity fallback**: Within 10 locations

### Quality Flags

Flags added via `isSuspiciousHighlight`:
- `too_short`: < 5 characters
- `fragment`: Starts lowercase
- `incomplete`: No ending punctuation

### Deduplication

Uses deterministic SHA-256 hash of:
- Normalized title
- Location
- Type
- First 50 chars of content

Same input = same ID = idempotent imports.

### Security

- **CSV injection**: Fields starting with `=+−@` are prefixed with `'`
- **XSS protection**: HTML export escapes all content
- **Schema validation**: All inputs validated with Zod

---

## ❓ FAQ

**Q: Does it modify my original file?**
A: No. It only reads the file and produces new output.

**Q: Can I use it in React/Next.js/Vue?**
A: Yes! Use `parseString` for client-side operations.

**Q: Why are there `*Raw` fields?**
A: They preserve original data for debugging and re-processing.

**Q: How do I silence logs?**
A: `setLogger(nullLogger)` from the main export.

**Q: Can I re-import exported JSON/CSV?**
A: Yes! Use `JsonImporter` or `CsvImporter`.

---

## 🛠️ Development

```bash
# Clone
git clone https://github.com/KindleTools/kindle-tools-ts.git
cd kindle-tools-ts

# Install
pnpm install

# Test
pnpm test

# Build
pnpm build

# Visual workbench
pnpm run gui   # Opens http://localhost:5173
```

---

## 🤝 Contributing

PRs are welcome! Please:

1. Run `pnpm run check` before submitting
2. Add tests for new features
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📄 License

MIT © [Andrés M. Jiménez](https://github.com/andresz1)

---

## 📖 More Resources

- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical deep-dive for contributors
- [ROADMAP.md](ROADMAP.md) — Project status and future plans
- [CHANGELOG.md](CHANGELOG.md) — Version history
