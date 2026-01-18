# KindleToolsTS - Architecture

This document describes the architecture and key design decisions of the KindleToolsTS library.

## Project Overview

**Type:** Pure TypeScript Library (no CLI)
**Architecture:** Clean Architecture / Domain-Driven Design
**Build:** tsup (ESM + CJS dual build)
**Toolchain:** Biome 2.3+ (linting/formatting) + ESLint (neverthrow rules) + Vitest 4+ (testing)

## Directory Structure

```
src/
├── config/           # Configuration helpers and constants
├── core/             # Core processing logic
│   └── processing/   # Deduplication, merging, filtering, quality flags
├── domain/           # Domain models and business logic
│   ├── analytics/    # Statistics calculation
│   ├── core/         # Core entities (identity, locations, comparison)
│   └── parsing/      # Date parsing, language detection, sanitization
├── errors/           # Error handling (AppException, Result types, logging)
├── exporters/        # Export formats (JSON, CSV, Markdown, Obsidian, Joplin, HTML)
│   ├── core/         # Exporter factory and types
│   ├── formats/      # Format implementations
│   └── shared/       # Base classes and utilities
├── importers/        # Import formats (TXT, JSON, CSV)
│   ├── core/         # Importer factory and types
│   ├── formats/      # Format implementations (txt/ is the main parser)
│   └── shared/       # Base classes and utilities
├── node/             # Node.js-specific code (parseFile)
├── ports/            # Abstractions for external dependencies
│   └── adapters/     # Implementations (NodeFileSystem, MemoryFileSystem)
├── schemas/          # Zod schemas for validation
├── templates/        # Handlebars template engine
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
    ├── fs/           # File system utilities (zip, tar)
    ├── geo/          # Geolocation utilities
    ├── security/     # Hashing, CSV sanitization
    ├── system/       # Date formatting, env expansion, errors
    └── text/         # Text normalization, patterns, similarity
```

## Key Design Patterns

### 1. Ports & Adapters (Dependency Injection)

External dependencies are abstracted through interfaces, allowing for easy testing and platform portability.

#### FileSystem Abstraction

```typescript
// src/ports/filesystem.ts
export interface FileSystem {
  readFile(path: string): Promise<Uint8Array>;
  readTextFile(path: string, encoding?: string): Promise<string>;
}

// Usage
import { setFileSystem, MemoryFileSystem } from 'kindle-tools-ts';

// For tests - instant, no disk I/O
const memFs = new MemoryFileSystem();
memFs.addFile('/test.txt', 'content');
setFileSystem(memFs);

// Reset to default Node.js implementation
resetFileSystem();
```

**Adapters:**
- `nodeFileSystem` - Default Node.js fs implementation
- `MemoryFileSystem` - In-memory implementation for testing
- `nullFileSystem` - No-op implementation for browser environments

#### Logger Injection

```typescript
// src/errors/logger.ts
export interface Logger {
  error: (entry: ErrorLogEntry) => void;
  warn: (entry: ErrorLogEntry) => void;
}

// Usage
import { setLogger, nullLogger } from 'kindle-tools-ts';

// Redirect to Pino/Winston/Sentry
setLogger({
  error: (entry) => pino.error(entry),
  warn: (entry) => pino.warn(entry),
});

// Silence all logs
setLogger(nullLogger);
```

### 2. Result Types (neverthrow)

Operations that can fail return `Result<T, E>` instead of throwing exceptions.

```typescript
import { Result, ok, err } from 'neverthrow';

function parseDate(input: string): Result<Date, ParseError> {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    return err({ code: 'INVALID_DATE', message: `Invalid date: ${input}` });
  }
  return ok(date);
}
```

**ESLint enforcement:** `eslint-plugin-neverthrow` prevents accidental unwrapping.

### 3. AppException for Structural Errors

When exceptions are necessary (e.g., schema validation failures), use the typed `AppException`:

```typescript
// src/errors/types.ts
export class AppException extends Error {
  readonly code: string;
  readonly appError: AppError;

  constructor(appError: AppError) {
    super(appError.message);
    this.code = appError.code;
    this.appError = appError;
  }
}

// Usage
throw new AppException({
  code: 'VALIDATION_ERROR',
  message: 'Invalid configuration',
  issues: [{ path: ['name'], message: 'Required' }]
});
```

### 4. Configuration

Configuration is passed directly as options to exporters and processors:

```typescript
import { ObsidianExporter } from 'kindle-tools-ts';

const exporter = new ObsidianExporter();
await exporter.export(clippings, {
  folderStructure: "by-author",
  extractTags: true,
});
```

### 5. Template Engine (Handlebars)

Customizable output via Handlebars templates with built-in helpers:

```typescript
import { TemplateEngine, getTemplatePreset } from 'kindle-tools-ts';

const engine = new TemplateEngine(getTemplatePreset('obsidian'));
const output = engine.renderBook(clippings, {
  wikilinks: true,
  useCallouts: true
});
```

**Available presets:** `default`, `minimal`, `obsidian`, `notion`, `academic`, `compact`, `verbose`

**Custom helpers:** `eq`, `neq`, `gt`, `lt`, `formatDate`, `truncate`, `blockquote`, `yamlTags`, `opt`

### 6. Multi-File Exporters

Base class for exporters that generate multiple files:

```typescript
// src/exporters/shared/multi-file-exporter.ts
export abstract class MultiFileExporter extends BaseExporter {
  // Template method pattern
  protected async doExport(clippings, options): Promise<ExportResult> {
    await this.exportPreamble(clippings, options);
    const groups = groupByBook(clippings);
    for (const [bookKey, bookClippings] of groups) {
      await this.processBook(bookKey, bookClippings, options);
    }
    return this.generateSummaryContent();
  }

  // Subclasses implement
  protected abstract processBook(...): Promise<void>;
}
```

**Implementations:** `MarkdownExporter`, `ObsidianExporter`, `JoplinExporter`

## Security Measures

### CSV Injection Protection

All CSV exports are protected against formula injection attacks:

```typescript
// Fields starting with =, +, -, @, \t, \r are prefixed with '
// Example: =SUM(A1:A10) -> '=SUM(A1:A10)
```

### Path Traversal Prevention

Filenames are sanitized to prevent directory traversal:

```typescript
// src/exporters/shared/exporter-utils.ts
const WINDOWS_RESERVED_NAMES = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', ...];

export function sanitizeFilename(name: string): string {
  // Remove invalid chars: <>:"/\|?*
  // Prefix Windows reserved names: CON -> _CON
  // Enforce max length (100 chars)
}
```

## Testing Strategy

### Unit Tests
Standard Vitest tests for individual functions and classes.

### Type Tests
Using `expectTypeOf` to ensure API types are correct:

```typescript
// tests/types/api.test-d.ts
expectTypeOf(result).toEqualTypeOf<ParseResult>();
expectTypeOf(result).not.toBeAny();
```

### Snapshot Tests
Using `toMatchFileSnapshot` for complex output validation:

```typescript
// tests/snapshots/parser.snapshot.test.ts
await expect(JSON.stringify(result)).toMatchFileSnapshot(snapshotPath);
```

### Property-Based Tests (fast-check)
Fuzzing the parser with arbitrary input:

```typescript
// tests/stress/parser.properties.test.ts
fc.assert(
  fc.property(fc.string(), (input) => {
    const result = parser.parse(input);
    expect(result).toBeDefined(); // Never crashes
  })
);
```

### Stress Tests
Testing with large files, naughty strings, and malformed input:

```
tests/stress/
├── parser.stress.test.ts     # Large files, Unicode edge cases
├── parser.properties.test.ts # fast-check fuzzing
├── generators.ts             # Test data generators
└── fixtures/naughty-strings.ts # Big List of Naughty Strings
```

### Coverage Thresholds

Glob-based coverage requirements in `vitest.config.ts`:

| Module | Statements | Branches |
|--------|------------|----------|
| Global | 80% | 80% |
| `src/core/**` | 95% | 90% |
| `src/errors/**` | 95% | 95% |
| `src/domain/**` | 90% | 85% |
| `src/utils/**` | 85% | 80% |

## Package Exports

The library uses Node.js subpath exports for clean imports:

```json
{
  "exports": {
    ".": "./dist/index.js",           // Main API
    "./node": "./dist/node/index.js"  // Node.js specific (parseFile)
  }
}
```

## Constants and Magic Numbers

Domain-specific constants are centralized:

```typescript
// src/domain/parsing/block-structure.ts
export const BLOCK_STRUCTURE = {
  MIN_BLOCK_LINES: 2,
  CONTENT_START_INDEX: 2,
  TITLE_LINE_INDEX: 0,
  METADATA_LINE_INDEX: 1,
} as const;

// src/core/limits.ts
export const SYSTEM_LIMITS = {
  LARGE_FILE_MB: 50,
  STREAM_CHUNK_SIZE: 64 * 1024,
  MAX_FILENAME_LENGTH: 100,
  HISTORY_MAX_ENTRIES: 1000,
} as const;
```

## Browser Compatibility

The library is isomorphic:

| Environment | Parsing | Exporting | File Access |
|-------------|---------|-----------|-------------|
| Node.js | `parseFile()` + `parseString()` | All formats | Native fs |
| Browser | `parseString()` only | All formats | File API |

Core modules have no `node:fs` dependency. Use the `setFileSystem()` API to provide custom implementations.

---

*Last updated: 2026-01-14*
