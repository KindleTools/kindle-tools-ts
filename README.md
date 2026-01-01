# kindle-tools-ts

[![npm version](https://img.shields.io/npm/v/kindle-tools-ts.svg)](https://www.npmjs.com/package/kindle-tools-ts)
[![license](https://img.shields.io/npm/l/kindle-tools-ts.svg)](https://github.com/YOUR_USERNAME/kindle-tools-ts/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

A robust TypeScript library to parse and process Amazon Kindle `My Clippings.txt` files with smart merging, deduplication, and multiple export formats.

---

## 📑 Table of Contents

- [✨ Features](#-features)
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
- 📚 **6 export formats** — JSON, CSV, Markdown, Obsidian, Joplin JEX, HTML
- 📊 **Statistics** — Get detailed stats about your reading habits
- 🖥️ **CLI included** — Full command-line interface for quick operations
- 📘 **TypeScript-first** — Full type definitions with strict mode
- 🪶 **Lightweight** — Only 2 runtime dependencies (date-fns, zod)

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
| `--json` | | Output as JSON (for scripting/automation) |
| `--verbose` | | Show detailed output (top books, warnings) |
| `--pretty` | | Pretty print JSON output |
| `--group-by-book` | | Group output by book |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version |

### Examples

```bash
# Parse Spanish clippings file
kindle-tools parse "Mis recortes.txt" --lang=es

# Export without smart merging
kindle-tools export "My Clippings.txt" --format=json --no-merge --output=raw.json

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
  outputPath?: string;    // Output file/directory
  groupByBook?: boolean;  // Group by book
  includeStats?: boolean; // Include statistics
  pretty?: boolean;       // Pretty print (JSON)
  includeRaw?: boolean;   // Include raw fields
}
```

#### Available Exporters

| Exporter | Format | Output |
|----------|--------|--------|
| `JsonExporter` | JSON | Single file, optional grouping |
| `CsvExporter` | CSV | Single file with BOM for Excel |
| `MarkdownExporter` | Markdown | Single file with blockquotes |
| `ObsidianExporter` | Obsidian MD | Multiple files with YAML frontmatter |
| `JoplinExporter` | JEX | Importable Joplin archive |
| `HtmlExporter` | HTML | Standalone page with dark mode & search |

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

### Obsidian

One file per book with YAML frontmatter and callouts.

```markdown
---
title: "The Art of War"
author: "Sun Tzu"
highlights: 25
tags: [kindle, book]
---

# The Art of War

## Highlights

> [!quote] Page 42
> All warfare is based on deception.
```

### Joplin JEX

Importable archive with notebooks, notes, and tags. Uses deterministic IDs for idempotent imports (won't create duplicates when re-imported).

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
git clone https://github.com/YOUR_USERNAME/kindle-tools-ts.git
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
