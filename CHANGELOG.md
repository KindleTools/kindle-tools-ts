# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- See [ROADMAP.md](ROADMAP.md) for future plans

---

## [1.0.0] - 2026-01-18

**🎉 First stable release!** The library is now feature-complete and production-ready.

### Highlights

- ✅ **818 tests** with >80% coverage
- ✅ **11 languages** supported
- ✅ **6 export formats** (JSON, CSV, Markdown, Obsidian, Joplin, HTML)
- ✅ **3 import formats** (TXT, JSON, CSV)
- ✅ **Full TypeScript** with strict mode
- ✅ **Isomorphic** — works in Node.js and browsers

### Changed (since 0.5.0)

- Removed CLI in favor of visual workbench GUI
- Improved documentation (README, ARCHITECTURE, CONTRIBUTING)
- Added comprehensive contributor guides

### Fixed

- Various parser edge cases
- Date parsing for all 11 languages
- Memory handling for large files

---

## [0.5.0] - 2026-01-03

### Added

#### Core Functionality
- **Multi-language support** for 11 languages (EN, ES, PT, DE, FR, IT, ZH, JA, KO, NL, RU)
- **Automatic language detection** from clipping metadata
- **Smart merging** of overlapping highlights with configurable threshold
- **Deduplication** with deterministic SHA-256 based IDs
- **Note-to-highlight linking** based on location proximity
- **Tag extraction** from notes (hashtag format)
- **Suspicious highlight flagging** (DRM limits, accidental selections)
- **Fuzzy duplicate detection** using Jaccard similarity

#### Export Formats
| Format | Features |
|--------|----------|
| **JSON** | Grouping, stats, raw fields, pretty print |
| **CSV** | UTF-8 BOM, formula injection protection |
| **Markdown** | 7 template presets, custom Handlebars |
| **Obsidian** | YAML frontmatter, callouts, wikilinks, folder structures |
| **Joplin JEX** | TAR archive, 3-level notebooks, tags, deterministic IDs |
| **HTML** | Dark mode, search, responsive, XSS protection |

#### Import Formats
| Format | Features |
|--------|----------|
| **TXT** | Native Kindle `My Clippings.txt` |
| **JSON** | Re-import previous exports |
| **CSV** | Re-import with fuzzy header matching |

#### Configuration Options
- Folder structures: `flat`, `by-book`, `by-author`, `by-author-book`
- Author case: `original`, `uppercase`, `lowercase`
- Tag case: `original`, `uppercase`, `lowercase`
- Content filtering: `excludeBooks`, `onlyBooks`, `excludeTypes`, `minContentLength`
- Processing toggles: `removeDuplicates`, `mergeOverlapping`, `mergeNotes`, `extractTags`

#### CLI Tool (Deprecated in 1.0.0)
- `kindle-tools parse <file>` — Parse and show summary
- `kindle-tools export <file>` — Export to multiple formats
- `kindle-tools stats <file>` — Show detailed statistics
- `kindle-tools validate <file>` — Validate file format
- JSON output mode (`--json`) and verbose mode (`--verbose`)

#### Visual Workbench
- Web-based testing interface (`pnpm run gui`)
- Live preview of all export formats
- Configurable parse and export options
- Download button for exports

### Technical

- TypeScript with strict mode
- Dual ESM/CJS build with tsup
- Vitest test framework
- Biome for linting and formatting
- Changesets for versioning
- Husky + lint-staged for pre-commit hooks
- neverthrow for type-safe error handling
- Zod for schema validation
- Injectable logger and filesystem (dependency injection)

---

## [0.4.0] - 2025-12-15

### Added
- Obsidian exporter with YAML frontmatter
- Joplin JEX exporter with notebook hierarchy
- Folder structure options for file-based exporters

### Changed
- Improved title cleaning patterns
- Better author extraction from parentheses

---

## [0.3.0] - 2025-12-01

### Added
- CSV exporter with Excel compatibility
- Markdown exporter with template system
- HTML exporter with dark mode

### Fixed
- Unicode normalization for non-ASCII characters
- BOM handling in Kindle files

---

## [0.2.0] - 2025-11-15

### Added
- Multi-language parsing (initial 5 languages)
- Smart merge algorithm for overlapping highlights
- Note-to-highlight linking

### Changed
- Switched to SHA-256 for ID generation
- Improved deduplication accuracy

---

## [0.1.0] - 2025-11-01

### Added
- Initial release
- Basic Kindle TXT parser
- JSON exporter
- English language support

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| **1.0.0** | 2026-01-18 | 🎉 Stable release, 818 tests, full docs |
| 0.5.0 | 2026-01-03 | 11 languages, 6 exporters, CLI |
| 0.4.0 | 2025-12-15 | Obsidian, Joplin exporters |
| 0.3.0 | 2025-12-01 | CSV, Markdown, HTML exporters |
| 0.2.0 | 2025-11-15 | Multi-language, smart merge |
| 0.1.0 | 2025-11-01 | Initial release |

---

## Upgrade Guide

### From 0.5.x to 1.0.0

**Breaking changes:**
- CLI has been removed — use the visual workbench (`pnpm run gui`) or integrate the library directly

**Migration:**
```typescript
// Old (CLI)
$ kindle-tools export file.txt --format json

// New (Programmatic)
import { parseFile } from 'kindle-tools-ts/node';
import { JsonExporter } from 'kindle-tools-ts';

const result = await parseFile('file.txt');
const exporter = new JsonExporter();
const output = await exporter.export(result.clippings);
```

---

## Links

- [GitHub Releases](https://github.com/KindleTools/kindle-tools-ts/releases)
- [npm Package](https://www.npmjs.com/package/kindle-tools-ts)
- [Documentation](README.md)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)

---

[Unreleased]: https://github.com/KindleTools/kindle-tools-ts/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/KindleTools/kindle-tools-ts/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/KindleTools/kindle-tools-ts/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/KindleTools/kindle-tools-ts/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/KindleTools/kindle-tools-ts/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/KindleTools/kindle-tools-ts/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/KindleTools/kindle-tools-ts/releases/tag/v0.1.0
