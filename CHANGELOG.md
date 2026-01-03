# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-01-03

### Added

#### Core Functionality
- Multi-language support for 11 languages (EN, ES, PT, DE, FR, IT, ZH, JA, KO, NL, RU)
- Automatic language detection from clipping metadata
- Smart merging of overlapping highlights with configurable threshold
- Deduplication with deterministic SHA-256 based IDs
- Note-to-highlight linking based on location proximity
- Tag extraction from notes (hashtag format)
- Suspicious highlight flagging (DRM limits, very long/short content)

#### Export Formats
- **JSON Exporter**: Structured export with optional grouping by book, stats, and raw field inclusion
- **CSV Exporter**: Excel-compatible with UTF-8 BOM, includes tags column
- **Markdown Exporter**: Clean formatting with blockquotes and headers
- **Obsidian Exporter**: YAML frontmatter, Obsidian callouts, wikilinks, tag support
- **Joplin Exporter**: JEX format with 3-level notebook hierarchy, deterministic IDs, tags
- **HTML Exporter**: Standalone with embedded CSS, dark mode toggle, search functionality

#### CLI Tool
- `kindle-tools parse <file>` - Parse and show summary with colored output
- `kindle-tools export <file>` - Export to multiple formats
- `kindle-tools stats <file>` - Show detailed statistics
- `kindle-tools validate <file>` - Validate file format
- JSON output mode for scripting (`--json`)
- Verbose mode for extra details (`--verbose`)

#### Export Configuration Options
- Configurable folder structure: flat, by-book, by-author, by-author-book
- Author case transformation: original, uppercase, lowercase
- Clipping tags inclusion in all export formats
- Group by book option for JSON and CSV
- Pretty print option for JSON

#### Testing GUI
- Web-based testing interface for parsing and previewing exports
- Live preview of all export formats
- Configurable parse and export options
- Download button for exports

### Technical Details
- TypeScript with strict mode
- Dual ESM/CJS build with tsup
- Vitest test framework with 259+ tests
- Biome for linting and formatting
- Changesets for versioning
- Husky + lint-staged for pre-commit hooks
