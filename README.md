# kindle-tools-ts

[![npm version](https://img.shields.io/npm/v/kindle-tools-ts.svg)](https://www.npmjs.com/package/kindle-tools-ts)
[![license](https://img.shields.io/npm/l/kindle-tools-ts.svg)](https://github.com/YOUR_USERNAME/kindle-tools-ts/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

A robust TypeScript library to parse and process Amazon Kindle `My Clippings.txt` files with smart merging, deduplication, and multiple export formats.

## ✨ Features

- 🌍 **Multi-language support** - English, Spanish, Portuguese, German, French, Italian, Chinese, Japanese, Korean, Dutch, Russian
- 🔍 **Automatic language detection** - Detects the language of your clippings file automatically
- 🧠 **Smart merging** - Merges overlapping highlights when you extend a selection
- 🔄 **Deduplication** - Removes exact duplicate clippings
- 🔗 **Note linking** - Links notes to their associated highlights
- 📚 **Multiple export formats** - JSON, CSV, Markdown, Obsidian, Joplin JEX, HTML
- 📊 **Statistics** - Get detailed stats about your reading habits
- 🖥️ **CLI included** - Command-line interface for quick operations
- 📘 **TypeScript-first** - Full type definitions included

## 📦 Installation

```bash
npm install kindle-tools-ts
# or
pnpm add kindle-tools-ts
# or
yarn add kindle-tools-ts
```

## 🚀 Quick Start

```typescript
import { parseFile, JsonExporter } from 'kindle-tools-ts';

// Parse your clippings file
const result = await parseFile('./My Clippings.txt');

console.log(`Found ${result.stats.total} clippings from ${result.stats.totalBooks} books`);

// Export to JSON
const exporter = new JsonExporter();
const jsonOutput = await exporter.export(result.clippings, { pretty: true });
console.log(jsonOutput.output);
```

## 📖 Documentation

Full documentation coming soon!

### Supported Languages

| Code | Language | Example Pattern |
|------|----------|-----------------|
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

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## 📄 License

[MIT](LICENSE) © 2025
