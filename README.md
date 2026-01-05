# kindle-tools-ts

[![npm version](https://img.shields.io/npm/v/kindle-tools-ts.svg?style=flat-square)](https://www.npmjs.com/package/kindle-tools-ts)
[![CI](https://github.com/KindleTools/kindle-tools-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/KindleTools/kindle-tools-ts/actions/workflows/ci.yml)
[![install size](https://packagephobia.com/badge?p=kindle-tools-ts)](https://packagephobia.com/result?p=kindle-tools-ts)
[![Downloads](https://img.shields.io/npm/dm/kindle-tools-ts.svg?style=flat-square)](https://www.npmjs.com/package/kindle-tools-ts)
[![license](https://img.shields.io/npm/l/kindle-tools-ts.svg?style=flat-square)](https://github.com/KindleTools/kindle-tools-ts/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

A robust TypeScript library to parse and process Amazon Kindle `My Clippings.txt` files with smart merging, deduplication, and multiple export formats.

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🧠 Technical Details](#-technical-details)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [💻 CLI Usage](#-cli-usage)
- [📚 API Reference](#-api-reference)
- [📤 Export Formats](#-export-formats)
- [🌍 Supported Languages](#-supported-languages)
- [🛠️ Development](#️-development)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

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
- 🖥️ **CLI included** — Full command-line interface for quick operations
- 📘 **TypeScript-first** — Full type definitions with strict mode
- 🪶 **Lightweight** — Only 2 runtime dependencies (date-fns, zod)
- 🔒 **Non-destructive** — Always preserves original data (titleRaw, contentRaw) for user review

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

---

## 📦 Installation

### As a library

```bash
npm install kindle-tools-ts
# or
pnpm add kindle-tools-ts
# or
yarn add kindle-tools-ts
```

### As a CLI tool (global)

```bash
npm install -g kindle-tools-ts
# Then use:
kindle-tools --help
```

### Requirements

- Node.js 18.18.0 or higher
- Works on Windows, macOS, and Linux

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { parseFile, JsonExporter } from 'kindle-tools-ts';

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
import { parseFile, MarkdownExporter, ObsidianExporter, JoplinExporter } from 'kindle-tools-ts';

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

## 💻 CLI Usage

After installing globally or using `npx`, you can use the CLI:

```bash
kindle-tools <command> [options]
```

### Commands

#### `parse` — Parse and show summary

```bash
kindle-tools parse "My Clippings.txt"
kindle-tools parse "My Clippings.txt" --verbose
kindle-tools parse "My Clippings.txt" --json --pretty
```

Output:
```
📚 Kindle Clippings Parsed Successfully
────────────────────────────────────────

  • Total clippings: 1,234
  • Highlights: 1,100
  • Notes: 89
  • Bookmarks: 45

  • Books: 42
  • Authors: 38
  • Total words: 25,000

  Language: EN | Parsed in 45ms | 23 duplicates removed
```

#### `export` — Export to different formats

```bash
# Export to JSON
kindle-tools export "My Clippings.txt" --format=json --output=clippings.json

# Export to Markdown
kindle-tools export "My Clippings.txt" --format=md --output=highlights.md

# Export to CSV (Excel compatible)
kindle-tools export "My Clippings.txt" --format=csv --output=clippings.csv

# Export to Obsidian vault (one file per book)
kindle-tools export "My Clippings.txt" --format=obsidian --output=./vault/books/

# Export to Joplin JEX archive
kindle-tools export "My Clippings.txt" --format=joplin --output=clippings.jex

# Export to standalone HTML (with dark mode and search)
kindle-tools export "My Clippings.txt" --format=html --output=clippings.html

# Convert JSON to CSV (use previously exported file as input)
kindle-tools export clippings.json --format=csv --output=clippings.csv

# Convert CSV to Markdown
kindle-tools export clippings.csv --format=md --output=notes.md
```

#### `stats` — Show detailed statistics

```bash
kindle-tools stats "My Clippings.txt"
kindle-tools stats "My Clippings.txt" --json --pretty
```

Output:
```
📊 Kindle Clippings Statistics
══════════════════════════════════════════════════════════════

  Overview
  ────────────────────────────────────────
  Total Clippings:     1,234
  ├─ Highlights:       1,100
  ├─ Notes:            89
  ├─ Bookmarks:        45
  └─ Clips/Articles:   0

  Books:               42
  Authors:             38

  Content
  ────────────────────────────────────────
  Total Words:         25,000
  Avg Words/Highlight: 23
  Avg Highlights/Book: 26

  Top 10 Books by Highlights
  ────────────────────────────────────────────────────────────
   1) Deep Work
      by Cal Newport
      89 highlights | 12 notes | 2,100 words
  ...
```

#### `validate` — Validate file format

```bash
kindle-tools validate "My Clippings.txt"
kindle-tools validate "My Clippings.txt" --json
```

Output:
```
  Kindle Clippings File Validation
  ─────────────────────────────────

  File: My Clippings.txt
  Size: 1.2 MB
  Detected Language: EN

  ✓ Valid Kindle clippings file

  • Total blocks: 1,300
  • Valid clippings: 1,234
  • Unparseable blocks: 66
```

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--format <fmt>` | `-f` | Export format: `json`, `csv`, `md`, `obsidian`, `joplin`, `html` |
| `--output <path>` | `-o` | Output file or directory path |
| `--lang <code>` | `-l` | Force language: `en`, `es`, `pt`, `de`, `fr`, `it`, `zh`, `ja`, `ko`, `nl`, `ru` |
| `--no-merge` | | Disable smart merging of overlapping highlights |
| `--no-dedup` | | Disable deduplication |
| `--highlights-only` | | Return only highlights with embedded notes (no separate notes/bookmarks) |
| `--json` | | Output as JSON (for scripting/automation) |
| `--verbose` | | Show detailed output (top books, warnings) |
| `--pretty` | | Pretty print JSON output |
| `--group-by-book` | | Group output by book |
| `--structure <type>` | | Folder structure: `flat`, `by-book`, `by-author`, `by-author-book` |
| `--author-case <case>` | | Author folder case: `original`, `uppercase`, `lowercase` |
| `--extract-tags` | | Extract tags from notes (hashtag format) |
| `--tag-case <case>` | | Tag case: `original` (as typed), `uppercase`, `lowercase` (default) |
| `--include-tags` | | Include clipping tags in exports |
| `--no-tags` | | Exclude tags from output |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version |

### Examples

```bash
# Parse Spanish clippings file
kindle-tools parse "Mis recortes.txt" --lang=es

# Export without smart merging
kindle-tools export "My Clippings.txt" --format=json --no-merge --output=raw.json

# Export to Obsidian with author folders in uppercase
kindle-tools export "My Clippings.txt" --format=obsidian \
  --structure=by-author --author-case=uppercase --output=./vault/

# Export to Joplin with 3-level hierarchy (Root > Author > Book)
kindle-tools export "My Clippings.txt" --format=joplin \
  --structure=by-author-book --output=clippings.jex

# Extract tags from notes and include in export
kindle-tools export "My Clippings.txt" --format=json \
  --extract-tags --include-tags --output=with-tags.json

# Export only highlights with embedded notes (merged output)
kindle-tools export "My Clippings.txt" --format=json \
  --highlights-only --output=merged.json

# Get stats as JSON for scripting
kindle-tools stats "My Clippings.txt" --json | jq '.totalBooks'

# Validate and capture result in script
if kindle-tools validate "My Clippings.txt" --json | jq -e '.valid' > /dev/null; then
  echo "File is valid!"
fi
```

---

## 📚 API Reference

### Core Functions

#### `parseFile(filePath, options?)`

Parse a Kindle clippings file from disk.

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
// Statistics
import { calculateStats, groupByBook, countWords } from 'kindle-tools-ts';

// Hashing
import { generateClippingId, generateDuplicateHash } from 'kindle-tools-ts';

// Normalization
import { normalizeText, normalizeUnicode, removeBOM } from 'kindle-tools-ts';

// Sanitization
import { extractAuthor, sanitizeTitle, sanitizeContent } from 'kindle-tools-ts';

// Date parsing
import { parseKindleDate, parseKindleDateAuto } from 'kindle-tools-ts';

// Tag extraction from notes
import { extractTagsFromNote, looksLikeTagNote } from 'kindle-tools-ts';

// Page utilities
import { 
  formatPage,              // "[0042]" format
  formatPageOrPlaceholder, // with fallback
  estimatePageFromLocation,// ~16 locations per page
  getEffectivePage,        // actual or estimated
  getPageInfo              // complete info with status
} from 'kindle-tools-ts';

// Geo-location utilities
import {
  isValidGeoLocation,
  formatGeoLocation,
  parseGeoLocation,
  toGoogleMapsUrl,
  toOpenStreetMapUrl,
  distanceBetween
} from 'kindle-tools-ts';

// Text cleaning (PDF artifacts)
import { cleanText, needsCleaning } from 'kindle-tools-ts';

// Similarity detection
import { jaccardSimilarity, compareTexts, isSubset } from 'kindle-tools-ts';
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
│   ├── core/           # Parser, processor, tokenizer
│   ├── exporters/      # All export format implementations
│   ├── importers/      # JSON and CSV importers for re-processing
│   ├── types/          # TypeScript interfaces
│   ├── utils/          # Utility functions
│   ├── index.ts        # Library entry point
│   └── cli.ts          # CLI implementation
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test data
├── dist/               # Built output (ESM + CJS + DTS)
└── package.json
```

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
