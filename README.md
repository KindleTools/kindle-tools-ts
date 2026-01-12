# kindle-tools-ts

[![npm version](https://img.shields.io/npm/v/kindle-tools-ts.svg?style=flat-square)](https://www.npmjs.com/package/kindle-tools-ts)
[![CI](https://github.com/KindleTools/kindle-tools-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/KindleTools/kindle-tools-ts/actions/workflows/ci.yml)
[![install size](https://packagephobia.com/badge?p=kindle-tools-ts)](https://packagephobia.com/result?p=kindle-tools-ts)
[![Downloads](https://img.shields.io/npm/dm/kindle-tools-ts.svg?style=flat-square)](https://www.npmjs.com/package/kindle-tools-ts)
[![license](https://img.shields.io/npm/l/kindle-tools-ts.svg?style=flat-square)](https://github.com/KindleTools/kindle-tools-ts/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Biome](https://img.shields.io/badge/Maintained%20with-Biome-60a5fa?style=flat-square&logo=biome)](https://biomejs.dev/)

A robust TypeScript library to parse and process Amazon Kindle `My Clippings.txt` files with smart merging, deduplication, and multiple export formats.

---

## 📑 Table of Contents

- [💡 Why This Library?](#-why-this-library)
- [✨ Features](#-features)
- [🧠 Technical Details](#-technical-details)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [📚 API Reference](#-api-reference)
- [📤 Export Formats](#-export-formats)
- [🔌 Plugin System](#-plugin-system)
- [🌍 Supported Languages](#-supported-languages)
- [🌐 Browser Compatibility](#-browser-compatibility)
- [🛠️ Workbench (Visual Testing)](#️-workbench-visual-testing)
- [❓ FAQ](#-faq)
- [🛠️ Development](#️-development)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

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

- 🌍 **Multi-language support** — English, Spanish, Portuguese, German, French, Italian, Chinese, Japanese, Korean, Dutch, Russian
- 🔍 **Automatic language detection** — Detects the language of your clippings file automatically
- 🧠 **Smart merging** — Merges overlapping highlights when you extend a selection in Kindle
- 🔄 **Deduplication** — Removes exact duplicate clippings with deterministic IDs
- 🔗 **Note linking** — Links notes to their associated highlights based on location
- 🏷️ **Tag extraction** — Automatically extracts tags from notes (comma/semicolon/newline separated)
- 🧹 **Advanced text cleaning** — De-hyphenation for PDF artifacts, space normalization, edition markers removal
- ⚠️ **Quality flags** — Detects suspicious highlights (accidental, incomplete, fragments)
- 📊 **Fuzzy duplicate detection** — Uses Jaccard similarity to find near-duplicates
- 📑 **Page utilities** — Zero-padded page formatting `[0042]` and estimation from Kindle locations
- 📍 **Geo-location support** — Optional location metadata for personal knowledge management
- 📥 **Multiple input formats** — Parse from Kindle TXT, or re-import from previously exported JSON/CSV
- 📚 **6 export formats** — JSON, CSV, Markdown, Obsidian, Joplin JEX, HTML
- 📊 **Extended statistics** — Avg words/highlight, avg highlights/book, and more
- 📘 **TypeScript-first** — Full type definitions with strict mode
- 🔌 **Plugin system** — Extend with custom importers/exporters
- 🪶 **Lightweight** — Minimal runtime dependencies (date-fns, zod, handlebars, jszip)
- 🔒 **Non-destructive** — Always preserves original data (titleRaw, contentRaw) for user review
- 🛡️ **Security hardened** — CSV export includes formula injection protection (OWASP compliant)

---

## 🧠 Technical Details

### Deduplication Strategy
**Config:** `removeDuplicates` (default: `true`)
The library doesn't just delete duplicates; it aggressively preserves data. If two clippings are identical (same content + title + location) but have different tags (extracted from notes), the system **merges the tags into the surviving clipping** before removing the duplicate.

### Smart Merging Logic
**Config:** `mergeOverlapping` (default: `true`)
Overlapping highlights are merged using a robust heuristic:
- **Location Check**: Highlights must overlap or be within **5 characters** of each other.
- **Content Check**: One highlight must be a substring of the other, OR they must share **>50% of the same words**.
- **Result**: Creates a single merged entry with the longest content, combined location range, and most recent date.

### Note Linking Algorithm
**Config:** `mergeNotes` (default: `true`)
Notes are linked to highlights using a two-phase strategy:
1.  **Range Match (Primary)**: If the note's location falls strictly within the highlight's start/end range.
2.  **Proximity Fallback**: If no range match is found, it searches for the nearest highlight within **10 location positions**.

### Quality Flags
The system doesn't just delete data; it flags potential issues for user review via the `isSuspiciousHighlight` property.
- **`too_short`**: Content < 5 characters (likely accidental tap).
- **`fragment`**: Starts with lowercase (likely mid-sentence selection).
- **`incomplete`**: No terminal punctuation (cut off).
- **`exact_duplicate`**: Copy of another highlight (only visible if `removeDuplicates: false`).
- **`overlapping`**: Subset of another highlight (only visible if `mergeOverlapping: false`).

### Tag Extraction
**Config:** `extractTags` (default: `false`)
Turn your Kindle notes into a tagging system.
- If a note contains only comma/semicolon-separated words (e.g., "productivity, habit"), it's treated as a tag list.
- Tags are assigned to the linked highlight.
- Options: `tagCase` ("original" | "lowercase" | "uppercase").

### Normalization Pipeline
**Config:** `normalizeUnicode` (default: `true`)
Before processing, text undergoes strict normalization to ensure data integrity:
- **Unicode NFC**: Unifies characters (e.g., `ñ` vs `n+~`) to ensure duplicates are detected correctly.
- **BOM Removal**: Strips Byte Order Marks often found in Kindle files.
- **Line Endings**: Standardizes to Unix style `\n`.

### Advanced Cleaning
**Config:** `cleanContent`, `cleanTitles` (default: `true`)
- **Content**: De-hyphenates words broken by PDF line endings (`pro-\nblem` → `problem`) and fixes spacing around punctuation.
- **Titles**: Aggressively cleans Amazon noise, removing patterns like `_EBOK`, `(Spanish Edition)`, `[Print Replica]`, and file extensions (`.mobi`, `.pdf`).

### Filtering & Constraints
**Config:** `excludeBooks`, `onlyBooks`, `excludeTypes`, `minContentLength`
The library includes powerful pre-parsing filters that are often overlooked:
- **Blocklists/Allowlists**: Filter books by exact title matching (`excludeBooks`, `onlyBooks`).
- **Type Filtering**: Ignore specific types like `'bookmark'` or `'note'` (`excludeTypes`).
- **Noise Reduction**: Use `minContentLength` (e.g., 10) to automatically discard accidental one-word highlights or gibberish.

### Security: CSV Injection Protection
CSV exports are automatically protected against formula injection attacks (also known as CSV Injection or Formula Injection). This is a security vulnerability where malicious content can be interpreted as formulas by spreadsheet applications like Excel, Google Sheets, or LibreOffice Calc.

**Protection mechanism:**
- Fields starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with a single quote (`'`)
- This neutralizes formula execution while preserving the original data
- Applied automatically to all CSV exports via the `escapeCSV()` function

**Example:**
```
Original:  =SUM(A1:A10)
Sanitized: '=SUM(A1:A10)
```

> 📖 **Reference:** [OWASP - CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)

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

- Node.js 18.18.0 or higher (use `.nvmrc` to ensure consistency)
- Works on Windows, macOS, and Linux

---

## 🚀 Quick Start

### Basic Usage

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

### Parse from String

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

// Export to Markdown
const mdExporter = new MarkdownExporter();
const markdown = await mdExporter.export(result.clippings);

// Export to Obsidian (creates multiple files, one per book)
const obsidianExporter = new ObsidianExporter();
const obsidian = await obsidianExporter.export(result.clippings, {
  outputPath: './vault/books/'
});

// Export to Joplin JEX (importable archive)
const joplinExporter = new JoplinExporter();
const jex = await joplinExporter.export(result.clippings, {
  outputPath: './clippings.jex'
});
```

---

## 📚 API Reference

### Core Functions

#### `parseFile(filePath, options?)`

#### `parseFile(filePath, options?)`

Parse a Kindle clippings file from disk (Node.js only).

> **Note**: Import this from `kindle-tools-ts/node`.

```typescript
const result = await parseFile('./My Clippings.txt', {
  language: 'auto',           // 'auto' | 'en' | 'es' | ...
  removeDuplicates: true,     // Remove exact duplicates
  mergeOverlapping: true,     // Merge extended highlights
  mergeNotes: true,           // Link notes to highlights
  extractTags: false,         // Extract tags from notes
  tagCase: 'lowercase',       // Tag case: 'original' | 'uppercase' | 'lowercase'
  highlightsOnly: false,      // Return only highlights with embedded notes
  normalizeUnicode: true,     // NFC normalization
  cleanContent: true,         // Clean whitespace
  cleanTitles: true,          // Remove file extensions from titles
});
```

#### `parseString(content, options?)`

Parse clippings from a string.

```typescript
const result = parseString(fileContent, { language: 'en' });
```

#### `parse(content, options?)`

Alias for `parseString`.

### ParseResult Object

```typescript
interface ParseResult {
  clippings: Clipping[];      // Array of parsed clippings
  stats: ClippingsStats;      // Statistics
  warnings: ParseWarning[];   // Any parsing warnings
  meta: {
    fileSize: number;         // Original file size in bytes
    parseTime: number;        // Parse time in milliseconds
    detectedLanguage: string; // Detected language code
    totalBlocks: number;      // Total blocks found
    parsedBlocks: number;     // Successfully parsed blocks
  };
}
```

### Clipping Object

```typescript
interface Clipping {
  id: string;                    // Deterministic hash (12 chars)
  title: string;                 // Clean book title
  author: string;                // Extracted author name
  content: string;               // Highlight/note content
  type: 'highlight' | 'note' | 'bookmark' | 'clip' | 'article';
  page: number | null;           // Page number (if available)
  location: {
    raw: string;                 // Original location string
    start: number;               // Start position
    end: number | null;          // End position
  };
  date: Date | null;             // Parsed date
  dateRaw: string;               // Original date string
  isLimitReached: boolean;       // DRM limit message detected
  isEmpty: boolean;              // Empty content
  language: string;              // Detected language
  source: 'kindle' | 'sideload'; // Book source
  wordCount: number;             // Word count
  charCount: number;             // Character count
  note?: string;                 // Linked note content
  linkedNoteId?: string;         // ID of linked note
  linkedHighlightId?: string;    // ID of linked highlight
  blockIndex: number;            // Position in original file
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

interface ExporterOptions {
  outputPath?: string;           // Output file/directory
  groupByBook?: boolean;         // Group by book
  includeStats?: boolean;        // Include statistics
  pretty?: boolean;              // Pretty print (JSON)
  includeRaw?: boolean;          // Include raw fields
  folderStructure?: 'flat' | 'by-book' | 'by-author' | 'by-author-book';
  authorCase?: 'original' | 'uppercase' | 'lowercase';
  includeClippingTags?: boolean; // Include tags extracted from notes
}
```

#### Available Exporters

| Exporter | Format | Output |
|----------|--------|--------|
| `JsonExporter` | JSON | Single file, optional grouping, tags column |
| `CsvExporter` | CSV | Single file with BOM for Excel, tags column |
| `MarkdownExporter` | Markdown | Single file with blockquotes |
| `ObsidianExporter` | Obsidian MD | Multiple files with YAML frontmatter, configurable folder structure |
| `JoplinExporter` | JEX | Importable Joplin archive with 3-level notebook hierarchy |
| `HtmlExporter` | HTML | Standalone page with dark mode & search |

### Importers

Importers allow you to re-process previously exported files. This enables workflows where you export to JSON, edit the file, and then convert to another format.

```typescript
import { JsonImporter, CsvImporter } from 'kindle-tools-ts';

// Import from JSON
const jsonImporter = new JsonImporter();
const jsonContent = await fs.readFile('clippings.json', 'utf-8');
const result = await jsonImporter.import(jsonContent);

console.log(`Imported ${result.clippings.length} clippings`);

// Import from CSV
const csvImporter = new CsvImporter();
const csvContent = await fs.readFile('clippings.csv', 'utf-8');
const csvResult = await csvImporter.import(csvContent);
```

#### Available Importers

| Importer | Format | Description |
|----------|--------|-------------|
| `JsonImporter` | JSON | Imports flat or grouped-by-book JSON exports |
| `CsvImporter` | CSV | Imports CSV exports with standard columns |

### Utility Functions

```typescript
// Basic stats
import { calculateStats } from 'kindle-tools-ts';

// Detailed utilities are now grouped under the Utils namespace
import { Utils } from 'kindle-tools-ts';

// Access specific utilities through the namespace
const cleanText = Utils.normalizeText("Some   text");
const distance = Utils.distanceBetween(locA, locB);
const pageInfo = Utils.getPageInfo(150);

// Or import specific sub-modules if you prefer deep linking (not recommended)
// import { normalizeText } from 'kindle-tools-ts/dist/utils/normalizers'; // Requires checking specific paths
```

### Error Handling

The library uses a mix of `neverthrow` Results (for operations that might fail predictably) and explicit `AppException` (for structural/validation errors).

```typescript
import { 
  parseFile, 
  AppException, 
  isImportError, 
  isValidationError 
} from 'kindle-tools-ts';

try {
  const result = await parseFile('invalid.txt');
  
  // neverthrow pattern (if used by the API):
  if (result.isErr()) {
    console.error('Operation failed:', result.error.message);
  }
} catch (error) {
  if (error instanceof AppException) {
     console.error(`Error Code: ${error.code}`);
     
     if (isImportError(error.appError)) {
       console.error('Import specific error:', error.appError.detailedMessage);
     } else if (isValidationError(error.appError)) {
       console.error('Validation issues:', error.appError.issues);
     }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

The `AppError` type union covers:
- `IMPORT_*`: specific parsing errors
- `EXPORT_*`: export failures
- `CONFIG_*`: loader issues
- `VALIDATION_*`: schema or argument errors
- `FS_*`: file system errors

### Custom Logger

By default, the library logs errors and warnings to `console`. You can inject your own logger to redirect logs to your preferred backend (Pino, Winston, Sentry, Datadog, etc.):

```typescript
import { setLogger, resetLogger, type Logger } from 'kindle-tools-ts';
import pino from 'pino';

const pinoLogger = pino();

// Inject custom logger
setLogger({
  error: (entry) => pinoLogger.error(entry),
  warn: (entry) => pinoLogger.warn(entry),
});

// Later, reset to default console logger
resetLogger();
```

To silence all logs (useful for tests or production):

```typescript
import { setLogger, nullLogger } from 'kindle-tools-ts';

setLogger(nullLogger);
```

---

## 📤 Export Formats

### JSON

Standard JSON with clippings array and metadata.

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

Excel-compatible CSV with BOM for proper UTF-8 handling.

```csv
id,title,author,type,page,location,date,content,wordCount
a6439ae5832a,The Art of War,Sun Tzu,highlight,42,100-105,2024-01-01,"All warfare...",6
```

### Markdown

Clean Markdown with blockquotes.

```markdown
# Kindle Highlights

## The Art of War
*Sun Tzu*

> All warfare is based on deception.
> — Page 42, Location 100-105

---
```

#### 🎨 Advanced Template Customization

You have full control over the Markdown output using [Handlebars](https://handlebarsjs.com/) templates.

**1. Using Presets**

```typescript
const exporter = new MarkdownExporter();
exporter.export(clippings, { templatePreset: 'obsidian' });
// Presets: 'default', 'minimal', 'obsidian', 'notion', 'academic', 'compact', 'verbose'
```

**2. Custom Templates**

You can override specific levels of the export hierarchy:

```typescript
exporter.export(clippings, {
  customTemplates: {
    // Level 1: How each clipping looks
    clipping: `> {{content}}\n> *({{page}})*\n`,
    
    // Level 2: How clippings are grouped into a book file
    book: `# {{title}}\n\n{{#each clippings}}{{> clipping}}{{/each}}`,
    
    // Level 3: (Optional) How books are combined if exporting to a single file
    export: `{{#each books}}{{> book}}{{/each}}`
  }
});
```

**📚 Variable Reference**

**Clipping Context** (Available in `clipping` template):
| Variable | Description |
|----------|-------------|
| `content` | The highlight text or note content |
| `title` | Book title |
| `author` | Book author |
| `type` | `highlight`, `note`, or `bookmark` |
| `page` | Page number string (e.g. "42" or "?") |
| `location` | Location string (e.g. "100-105") |
| `date` | Formatted date string |
| `dateIso` | ISO date string for machine parsing |
| `note` | Content of the linked user note (if any) |
| `tags` | Array of strings extracted from note |
| `tagsHashtags` | Tags formatted as hashtags: `#tag1 #tag2` |
| `hasNote` | Boolean true if a note is attached |
| `hasTags` | Boolean true if tags exist |
| `isLimitReached`| Boolean true if DRM limit hit |

**Book Context** (Available in `book` template):
| Variable | Description |
|----------|-------------|
| `title` | Book title |
| `author` | Book author |
| `clippings` | Array of all clippings in the book |
| `highlights` | Array of only highlights |
| `notes` | Array of only standalone notes |
| `bookmarks` | Array of only bookmarks |
| `highlightCount`| Number of highlights |
| `noteCount` | Number of notes |
| `tags` | Array of all unique tags found in this book |

**🛠️ Helper Reference**

**Logic & Comparison:**
- `eq a b`, `neq a b`: Equality check
- `gt a b`, `lt a b`, `gte`, `lte`: Numeric parsing comparison
- `and a b`, `or a b`, `not a`: Boolean logic
- `isHighlight`, `isNote`, `isBookmark`: Block helpers (e.g. `{{#isHighlight}}...{{/isHighlight}}`)

**Formatting:**
- `formatDate date "short"|"long"|"iso"|"relative"`: Date formatting
- `truncate text length`: Truncates text with ellipses
- `upper`, `lower`, `capitalize`: String case transformation
- `replace text "old" "new"`: String replacement
- `blockquote text`: Prefixes every line with `> `
- `yamlTags tags`: Formats array as YAML list items

**Example: Detailed Obsidian Template**
```handlebars
---
title: "{{title}}"
author: "{{author}}"
tags:
{{yamlTags tags}}
---

# {{title}}

{{#each highlights}}
> {{content}}
> — Loc {{location}} {{#if hasNote}}[[Note]]{{/if}}

{{#if hasNote}}
> [!NOTE] User Note
> {{note}}
{{/if}}
{{/each}}
```

### Obsidian

One file per book with YAML frontmatter and callouts. Supports configurable folder structure.

**Folder structures:**
- `flat` — All files in root folder (default)
- `by-book` — `books/Title/Title.md`
- `by-author` — `books/Author/Title.md`
- `by-author-book` — `books/Author/Title/Title.md`

```markdown
---
title: "The Art of War"
author: "Sun Tzu"
source: kindle
type: book
total_highlights: 25
total_notes: 3
date_imported: 2024-01-01
tags:
  - strategy  # clipping tags merged here
---

# The Art of War

**Author:** [[Sun Tzu]]

## 📊 Summary

- **Highlights:** 25
- **Notes:** 3
- **Bookmarks:** 0

## 📝 Highlights

> [!quote] Page 42, Location 100-105
> All warfare is based on deception.
```

### Joplin JEX

Importable archive with notebooks, notes, and tags. Uses deterministic IDs for idempotent imports (won't create duplicates when re-imported).

**Notebook hierarchy:**
- `flat` — `Kindle Highlights > Book > Notes`
- `by-author` or `by-author-book` — `Kindle Highlights > AUTHOR > Book > Notes`

Author names can be transformed to UPPERCASE or lowercase via `authorCase` option.

### HTML

Standalone HTML page with:
- Responsive design
- Dark mode toggle (persisted in localStorage)
- Search/filter functionality
- Print-friendly styles
- XSS protection

---

## 🌍 Supported Languages

| Code | Language | "Added on" Pattern |
|------|----------|--------------------|
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

Language is auto-detected by analyzing the clippings file content.

---

## 🌐 Browser Compatibility

The library is **isomorphic** — it works in both Node.js and browsers:

| Environment | Parsing | Exporting | File System Access |
|-------------|---------|-----------|--------------------|
| **Node.js** | ✅ `parseFile()` + `parseString()` | ✅ All formats | ✅ Native fs |
| **Browser** | ✅ `parseString()` only | ✅ All formats (output as string/Blob) | ❌ Use File API |

**Browser usage example:**

```typescript
import { parseString, JsonExporter } from 'kindle-tools-ts';

// Get file content from <input type="file">
const file = inputElement.files[0];
const content = await file.text();

// Parse and export
const result = parseString(content);
const exporter = new JsonExporter();
const json = await exporter.export(result.clippings);
```

---

## 🔌 Plugin System

KindleTools provides an extensible plugin architecture for adding custom importers and exporters.

### Basic Plugin Registration

```typescript
import {
  pluginRegistry,
  type ExporterPlugin,
  type ImporterPlugin,
} from 'kindle-tools-ts/plugins';

// Register a custom exporter
const notionPlugin: ExporterPlugin = {
  name: 'notion-exporter',
  version: '1.0.0',
  format: 'notion',
  description: 'Export clippings to Notion',
  create: () => new NotionExporter(),
};

pluginRegistry.registerExporter(notionPlugin);

// Register a custom importer
const koboPlugin: ImporterPlugin = {
  name: 'kobo-importer',
  version: '1.0.0',
  extensions: ['.kobo', '.xml'],
  description: 'Import Kobo annotations',
  create: () => new KoboImporter(),
};

pluginRegistry.registerImporter(koboPlugin);
```

### Built-in Plugin Example: Anki Exporter

A ready-to-use Anki exporter is included as an example:

```typescript
import { pluginRegistry, ankiExporterPlugin } from 'kindle-tools-ts/plugins';

// Register the Anki exporter
pluginRegistry.registerExporter(ankiExporterPlugin);

// Use it
const exporter = pluginRegistry.getExporter('anki');
const result = await exporter.export(clippings, {
  deckName: 'My Kindle Highlights',
  cardStyle: 'basic', // 'basic' | 'cloze' | 'reversed'
});
```

The Anki exporter creates TSV files compatible with Anki's import feature, converting your highlights into flashcards.

### Lifecycle Hooks

Transform data during import/export with hooks:

```typescript
import { hookRegistry } from 'kindle-tools-ts/plugins';

// Filter out short highlights before export
hookRegistry.add('beforeExport', (clippings) => {
  return clippings.filter(c => (c.content?.length ?? 0) > 20);
});

// Add a header to exported output
hookRegistry.add('afterExport', (output, format) => {
  if (format === 'md') {
    return `<!-- Generated by KindleTools -->\n\n${output}`;
  }
  return output;
});

// Transform content after import
hookRegistry.add('afterImport', (clippings) => {
  return clippings.map(c => ({
    ...c,
    content: c.content?.trim(),
  }));
});
```

**Available hooks:**
- `beforeImport` - Transform raw file content before parsing
- `afterImport` - Transform/filter clippings after parsing
- `beforeExport` - Transform/filter clippings before export
- `afterExport` - Transform output after export

### Auto-Discovery from npm

Plugins can be automatically discovered from `node_modules`:

```typescript
import { discoverPlugins, loadPlugin } from 'kindle-tools-ts/plugins';

// Discover all packages matching 'kindletools-plugin-*'
const discovered = await discoverPlugins();
console.log('Found plugins:', discovered);
// ['kindletools-plugin-notion', '@myorg/kindletools-plugin-kobo']

// Load a specific plugin
const result = await loadPlugin('kindletools-plugin-notion');
if (result.success) {
  console.log('Loaded:', result.plugins.map(p => p.name));
}

// Discover and load all at once
import { discoverAndLoadPlugins } from 'kindle-tools-ts/plugins';
await discoverAndLoadPlugins();
```

### Creating a Plugin Package

Create an npm package following this structure:

```typescript
// kindletools-plugin-notion/index.ts
import type { ExporterPlugin } from 'kindle-tools-ts/plugins';

class NotionExporter {
  name = 'Notion Exporter';
  extension = '.json';
  
  async export(clippings, options) {
    // Your export logic
    return { success: true, output: JSON.stringify(data) };
  }
}

export const plugin: ExporterPlugin = {
  name: 'notion-exporter',
  version: '1.0.0',
  format: 'notion',
  create: () => new NotionExporter(),
};

// Or export as default
export default plugin;
```

**package.json:**
```json
{
  "name": "kindletools-plugin-notion",
  "version": "1.0.0",
  "main": "dist/index.js",
  "keywords": ["kindletools", "kindletools-plugin"]
}
```

### Plugin API Reference

| Type | Description |
|------|-------------|
| `ExporterPlugin` | Adds new export formats (e.g., Notion, Anki) |
| `ImporterPlugin` | Adds new import formats (e.g., Kobo, Apple Books) |
| `pluginRegistry` | Central registry for managing plugins |
| `hookRegistry` | Registry for lifecycle hooks |

**Plugin Interface:**
```typescript
interface ExporterPlugin {
  name: string;           // Unique identifier (kebab-case)
  version: string;        // Semver (e.g., "1.0.0")
  format: string;         // CLI format name (e.g., 'notion')
  aliases?: string[];     // Alternative format names
  description?: string;   // Human-readable description
  create: () => Exporter; // Factory function
}

interface ImporterPlugin {
  name: string;
  version: string;
  extensions: string[];   // File extensions (e.g., ['.xml', '.kobo'])
  description?: string;
  create: () => Importer;
}
```

---

## ❓ FAQ


<details>
<summary><strong>Where is my <code>My Clippings.txt</code> file?</strong></summary>

Connect your Kindle via USB. The file is at:
- **Kindle e-reader**: `Kindle/documents/My Clippings.txt`
- **Kindle for PC/Mac**: Check `Documents/My Kindle Content/`

</details>

<details>
<summary><strong>Why are some highlights marked as "suspicious"?</strong></summary>

The library flags potentially problematic highlights:
- **`too_short`**: Less than 5 characters (accidental tap?)
- **`fragment`**: Starts with lowercase (mid-sentence selection)
- **`incomplete`**: No terminal punctuation (cut off)

These are NOT deleted — just flagged for your review via `isSuspiciousHighlight`.

</details>

<details>
<summary><strong>Can I edit exported files and re-import them?</strong></summary>

Yes! Export to JSON or CSV, edit in your favorite tool, then re-import:

```typescript
import { JsonImporter, ObsidianExporter } from 'kindle-tools-ts';

// Import from edited JSON
const importer = new JsonImporter();
const result = await importer.import(editedJsonContent);

// Re-export to Obsidian
const exporter = new ObsidianExporter();
await exporter.export(result.clippings, { outputPath: './vault/' });
```

</details>

<details>
<summary><strong>How do I extract tags from my notes?</strong></summary>

Add tags to your Kindle notes in these formats:
- Hashtags: `#productivity #habits`
- Comma-separated: `productivity, habits`
- Newline-separated (one tag per line)

Then enable tag extraction in your parse options:

```typescript
const result = parseString(content, { extractTags: true });
// Tags will be in each clipping's `tags` array
```

</details>

<details>
<summary><strong>What's the difference between <code>mergeNotes</code> and <code>highlightsOnly</code>?</strong></summary>

- **`mergeNotes: true`** (default): Links notes to their associated highlights. Both remain as separate entries, but highlights gain a `note` field and `linkedNoteId`.
- **`highlightsOnly: true`**: Returns ONLY highlights with their notes embedded. Notes and bookmarks are excluded from the output entirely.

Use `highlightsOnly` when you want a clean "what I highlighted + thought" view.

</details>

<details>
<summary><strong>Can I use this in a Cloudflare Worker / Deno / Bun?</strong></summary>

The library is designed for Node.js 18+ but should work in:
- **Bun**: Fully compatible ✅
- **Deno**: Use with `npm:` specifier ✅
- **Cloudflare Workers**: `parseString()` works, but `parseFile()` requires fs module ⚠️

</details>

---

## 🛠️ Workbench (Visual Testing)

A browser-based workbench is included for testing and demonstration purposes:

```bash
# Clone the repository
git clone https://github.com/KindleTools/kindle-tools-ts.git
cd kindle-tools-ts

# Install dependencies
pnpm install

# Start the workbench
pnpm gui
```

This opens a local Vite server where you can:
- 📤 Drag and drop your `My Clippings.txt` file
- 👀 Preview parsed clippings with search and filter
- 📊 View statistics about your reading habits
- 💾 Export to any supported format

> **Note**: The workbench is for development/testing only and is not distributed with the npm package.

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/KindleTools/kindle-tools-ts.git
cd kindle-tools-ts

# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format
```

### Project Structure

```
kindle-tools-ts/
├── src/
│   ├── core/           # Processor, processing modules (dedup, merge, link, quality)
│   ├── domain/         # Pure business logic (stats, sanitizers, tags, languages)
│   ├── exporters/      # Export format implementations (JSON, CSV, MD, Obsidian, Joplin, HTML)
│   ├── importers/      # Import implementations (TXT, JSON, CSV)
│   ├── plugins/        # Plugin system (registry, hooks, discovery)
│   ├── schemas/        # Zod validation schemas
│   ├── templates/      # Handlebars template presets
│   ├── types/          # TypeScript interfaces and type definitions
│   ├── utils/          # Utility functions (text, fs, system, security)
│   ├── errors/         # Error handling (neverthrow Result types)
│   ├── config/         # Configuration loading (cosmiconfig)
│   ├── node/           # Node.js-specific entry point (parseFile)
│   └── index.ts        # Library entry point (browser-safe)
├── tests/
│   ├── unit/           # Unit tests per module
│   ├── integration/    # Full pipeline tests
│   ├── fixtures/       # Test data and sample clippings
│   └── workbench/      # Visual testing GUI (Vite app)
├── dist/               # Built output (ESM + CJS + DTS)
└── package.json
```

### Strict ESM & Imports

This project enforces **NodeNext** module resolution for strict compliance with modern Node.js ESM standards.

- **Internal Imports**: We use **Native Node Subpath Imports** (`#core/processor.js`) instead of fragile tsconfig paths.
- **Extensions**: All imports must include the `.js` extension (e.g., `import ... from "./utils.js"`).
- **Validation**: The `check:exports` script runs `arethetypeswrong` to ensure our package exports are valid for all consumers.

See [ARCHITECTURE.md](ARCHITECTURE.md) for deeper technical details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Write tests for new features
- Follow the existing code style (Biome is used for formatting)
- Update documentation as needed
- Keep commits atomic and well-described

---

## 📄 License

[MIT](LICENSE) © 2025

---

<p align="center">
  Made with ❤️ for Kindle readers who love to highlight
</p>
