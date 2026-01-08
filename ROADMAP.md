# KindleToolsTS - Roadmap Unificado

Documento consolidado con todas las mejoras identificadas, organizadas por prioridad y con implementaciones detalladas basadas en mejores practicas de la industria 2025-2026.

**Estado del proyecto:** Clean Architecture / DDD con toolchain moderno (Biome, Vitest, tsup, Turborepo).

---

## Indice

1. [Mejoras Criticas (Fundamentos)](#1-mejoras-criticas-fundamentos)
2. [Seguridad y Calidad](#2-seguridad-y-calidad)
3. [Arquitectura y Escalabilidad](#3-arquitectura-y-escalabilidad)
4. [CLI y Configuracion](#4-cli-y-configuracion)
5. [Exporters y Formatos](#5-exporters-y-formatos)
6. [GUI Improvements](#6-gui-improvements)
7. [Integraciones Externas](#7-integraciones-externas)
8. [Funcionalidades Avanzadas](#8-funcionalidades-avanzadas)
9. [Documentacion y DevEx](#9-documentacion-y-devex)
10. [Testing y Robustez](#10-testing-y-robustez)
11. [Code Cleanup y Refactoring](#11-code-cleanup-y-refactoring)
12. [Not Planned](#12-not-planned)

---

## 1. Mejoras Criticas (Fundamentos)

### 1.1 Habilitar `noUncheckedIndexedAccess`

**Prioridad:** CRITICA | **Esfuerzo:** Medio-Alto

TypeScript 2025 recomienda esta opcion para maxima seguridad de tipos. Sin ella, `arr[0]` devuelve `T` en lugar de `T | undefined`.

```json
// tsconfig.json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

**Cambios necesarios:**
```typescript
// Antes (peligroso)
const first = clippings[0];
first.content; // Puede ser undefined!

// Despues (seguro)
const first = clippings[0];
if (first) {
  first.content;
}
```

**Referencia:** [The Strictest TypeScript Config](https://whatislove.dev/articles/the-strictest-typescript-config/)

---

### 1.2 Implementar Result Pattern con neverthrow

**Prioridad:** CRITICA | **Esfuerzo:** Alto

El patron actual `{ success: boolean, error?: Error }` no es type-safe.

```bash
pnpm add neverthrow
```

```typescript
// src/types/result.ts
import { Result, ok, err } from 'neverthrow';

export type ImportError =
  | { code: 'PARSE_ERROR'; message: string; blockIndex?: number }
  | { code: 'ENCODING_ERROR'; message: string }
  | { code: 'EMPTY_FILE'; message: string }
  | { code: 'INVALID_FORMAT'; message: string };

export type ImportSuccess = {
  clippings: Clipping[];
  warnings: string[];
  meta?: ImportMeta;
};

export type ImportResult = Result<ImportSuccess, ImportError>;

// Uso
result.match(
  (data) => processClippings(data.clippings),
  (error) => handleError(error.code, error.message)
);
```

**Comparativa:**
- **neverthrow** (recomendado): API simple, bien mantenido
- **fp-ts Either**: Mas completo pero curva mayor
- **oxide.ts**: Similar a Rust

---

### 1.3 Validacion de Schema con Zod en Importers

**Prioridad:** CRITICA | **Esfuerzo:** Medio

Zod ya esta instalado pero no se usa para validar inputs externos.

```typescript
// src/schemas/clipping.schema.ts
import { z } from 'zod';

export const ClippingSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required'),
  author: z.string().default('Unknown'),
  content: z.string(),
  type: z.enum(['highlight', 'note', 'bookmark', 'clip', 'article']),
  page: z.number().nullable().optional(),
  location: z.object({
    raw: z.string(),
    start: z.number(),
    end: z.number().nullable(),
  }),
  date: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const ImportedDataSchema = z.object({
  clippings: z.array(ClippingSchema).optional(),
  books: z.record(z.array(ClippingSchema)).optional(),
}).refine(
  data => data.clippings || data.books,
  { message: 'Must have "clippings" array or "books" object' }
);
```

---

### 1.4 Coverage Thresholds en Vitest

**Prioridad:** ALTA | **Esfuerzo:** Bajo

```typescript
// vitest.config.ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html", "lcov"],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
    perFile: true,
  },
}
```

---

### 1.5 Habilitar `exactOptionalPropertyTypes`

**Prioridad:** MEDIA-ALTA | **Esfuerzo:** Bajo

```json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": true
  }
}
```

---

## 2. Seguridad y Calidad

### 2.1 Snyk - Escaneo de Dependencias

**Prioridad:** ALTA | **Esfuerzo:** Bajo

```bash
pnpm add -D snyk
npx snyk auth
```

```yaml
# .github/workflows/security.yml
name: Security Scan
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

### 2.2 SonarQube - Analisis Estatico

**Prioridad:** MEDIA | **Esfuerzo:** Medio

```properties
# sonar-project.properties
sonar.projectKey=kindle-tools-ts
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

---

### 2.3 CSV Injection Protection

**Prioridad:** ALTA | **Esfuerzo:** Bajo

```typescript
// src/utils/security/csv-sanitizer.ts
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function sanitizeCSVField(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  if (FORMULA_PREFIXES.some(prefix => trimmed.startsWith(prefix))) {
    return `'${trimmed}`;
  }
  return value;
}
```

---

### 2.4 Centralized Error Types

**Prioridad:** MEDIA | **Esfuerzo:** Medio

```typescript
// src/errors/app-errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export enum ErrorCode {
  ERR_FILE_NOT_FOUND = 'ERR_FILE_NOT_FOUND',
  ERR_PARSE_INVALID_FORMAT = 'ERR_PARSE_INVALID_FORMAT',
  ERR_VALIDATION_SCHEMA = 'ERR_VALIDATION_SCHEMA',
  ERR_EXPORT_UNKNOWN_FORMAT = 'ERR_EXPORT_UNKNOWN_FORMAT',
}
```

---

## 3. Arquitectura y Escalabilidad

### 3.1 Streaming Architecture

**Prioridad:** ALTA | **Esfuerzo:** Alto

Archivos de 50MB+ pueden causar OOM.

```typescript
// src/importers/core/stream-importer.ts
import { Transform, pipeline } from 'node:stream';
import { promisify } from 'node:util';

const pipelineAsync = promisify(pipeline);

export class StreamingTxtImporter extends Transform {
  private buffer = '';
  private readonly separator = '==========';

  constructor() {
    super({
      readableObjectMode: true,
      highWaterMark: 64 * 1024,
    });
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: Function) {
    this.buffer += chunk.toString('utf-8');
    const blocks = this.buffer.split(this.separator);
    this.buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      if (block.trim()) {
        const clipping = this.parseBlock(block);
        if (clipping) this.push(clipping);
      }
    }
    callback();
  }
}
```

---

### 3.2 FileSystem Abstraction (Ports & Adapters)

**Prioridad:** MEDIA-ALTA | **Esfuerzo:** Alto

```typescript
// src/ports/filesystem.port.ts
export interface FileSystemPort {
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, content: string | Buffer): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
}

// src/adapters/node-filesystem.adapter.ts
export class NodeFileSystemAdapter implements FileSystemPort { /* ... */ }

// src/adapters/memory-filesystem.adapter.ts (para tests)
export class MemoryFileSystemAdapter implements FileSystemPort { /* ... */ }
```

---

### 3.3 Plugin Architecture

**Prioridad:** MEDIA | **Esfuerzo:** Alto

```typescript
// src/plugins/types.ts
export interface ExporterPlugin {
  name: string;
  version: string;
  format: string;
  export(clippings: Clipping[], options: ExportOptions): Promise<ExportResult>;
}

// src/plugins/registry.ts
class PluginRegistry {
  private exporters = new Map<string, ExporterPlugin>();

  register(plugin: ExporterPlugin): void {
    this.exporters.set(plugin.format, plugin);
  }

  get(format: string): ExporterPlugin | undefined {
    return this.exporters.get(format);
  }
}

export const pluginRegistry = new PluginRegistry();
```

---

### 3.4 Monorepo Structure (pnpm workspaces)

**Prioridad:** MEDIA | **Esfuerzo:** Alto

```
kindle-tools-ts/
  packages/
    core/           # Logica pura, sin deps de Node
    cli/            # CLI con Node.js deps
    gui/            # Vite app
    shared/         # Tipos compartidos
  pnpm-workspace.yaml
  turbo.json
```

---

### 3.5 Unified Archiver Interface

**Prioridad:** BAJA | **Esfuerzo:** Medio

```typescript
// src/utils/archive/archiver.interface.ts
export interface Archiver {
  addFile(path: string, content: string | Buffer): void;
  addDirectory(path: string): void;
  finalize(): Promise<Buffer>;
}
```

---

### 3.6 Dynamic Path Templating

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Replace rigid `FolderStructure` enums with template strings:

```typescript
// --path-format="{author}/{series}/{year} - {title}.md"
export function generatePath(template: string, data: PathData): string {
  return template.replace(/{(\w+)}/g, (_, key) =>
    sanitizeFilename(data[key] ?? 'unknown')
  );
}
```

---

### 3.7 OS-Safe Filename Sanitization

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

Handle Windows reserved names (`CON`, `PRN`, `AUX`, `NUL`) and max path length (260 chars).

```typescript
const WINDOWS_RESERVED = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];

export function sanitizeFilename(name: string): string {
  let safe = name.replace(/[<>:"/\\|?*]/g, '_');
  if (WINDOWS_RESERVED.includes(safe.toUpperCase())) {
    safe = `_${safe}`;
  }
  return safe.slice(0, 200);
}
```

---

### 3.8 Browser Entry Point

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Add `"browser"` field in `package.json` pointing to bundle without `fs` dependencies.

---

## 4. CLI y Configuracion

### 4.1 Migrar a CLI Library (citty)

**Prioridad:** ALTA | **Esfuerzo:** Medio

| Library | Bundle Size | TypeScript | Recomendacion |
|---------|-------------|------------|---------------|
| **citty** | 12KB | Excelente | Recomendado |
| commander | 45KB | Bueno | Alternativa |
| yargs | 120KB | Bueno | Overkill |

```typescript
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: { name: 'kindle-tools', version: '1.0.0' },
  args: {
    input: { type: 'positional', required: true },
    format: { type: 'string', alias: 'f', default: 'json' },
    output: { type: 'string', alias: 'o' },
    'highlights-only': { type: 'boolean', default: false },
    quiet: { type: 'boolean', alias: 'q', default: false },
  },
  async run({ args }) {
    await runPipeline(args.input, args);
  },
});

runMain(main);
```

---

### 4.2 Config File Support (.kindletoolsrc)

**Prioridad:** MEDIA | **Esfuerzo:** Medio

```bash
pnpm add cosmiconfig
```

```typescript
import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('kindletools', {
  searchPlaces: [
    '.kindletoolsrc',
    '.kindletoolsrc.json',
    '.kindletoolsrc.yaml',
    'kindletools.config.js',
  ],
});

export async function loadConfig(): Promise<Config> {
  const result = await explorer.search();
  return ConfigSchema.parse(result?.config ?? {});
}
```

**Ejemplo:**
```json
{
  "format": "obsidian",
  "folderStructure": "by-author",
  "extractTags": true,
  "tagCase": "lowercase"
}
```

---

### 4.3 CLI & GUI Parity

**Prioridad:** MEDIA | **Esfuerzo:** Medio

**CLI Updates:**
- [ ] `--exclude-types` flag (e.g., `highlight,note`)
- [ ] `--min-length` flag to filter short noise
- [ ] `--filter-books` (allowlist) and `--exclude-books` (blocklist)

**GUI Updates:**
- [x] Tag Case selector
- [ ] Exclude Books text area

---

### 4.4 Interactive CLI Mode

**Prioridad:** BAJA | **Esfuerzo:** Medio

```typescript
import { confirm, select, text } from '@clack/prompts';

export async function runInteractive() {
  const input = await text({ message: 'Path to My Clippings.txt:' });
  const format = await select({
    message: 'Export format:',
    options: [
      { value: 'json', label: 'JSON' },
      { value: 'obsidian', label: 'Obsidian Vault' },
    ],
  });
}
```

---

### 4.5 Structured Logging

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

```typescript
interface Logger {
  debug: (msg: string, ctx?: object) => void;
  info: (msg: string, ctx?: object) => void;
  warn: (msg: string, ctx?: object) => void;
  error: (msg: string, ctx?: object) => void;
}

// --json flag for machine-readable output
// --quiet flag to suppress output
```

---

### 4.6 Centralized Options Definition (SSOT)

**Prioridad:** BAJA | **Esfuerzo:** Medio

Create `src/core/options.def.ts` to define CLI and GUI options programmatically.

---

## 5. Exporters y Formatos

### 5.1 Anki Export (.apkg / CSV)

**Prioridad:** MEDIA | **Esfuerzo:** Medio

```typescript
export class AnkiExporter extends BaseExporter {
  format = 'anki';
  extension = '.txt';

  protected async doExport(clippings: Clipping[]): Promise<ExportResult> {
    const cards = clippings
      .filter(c => c.type === 'highlight')
      .map(clip => {
        const front = `<b>${clip.title}</b><br>${clip.author}`;
        const back = clip.content;
        const tags = `book::${this.sanitizeTag(clip.title)}`;
        return `${front}\t${back}\t${tags}`;
      });

    return { success: true, content: cards.join('\n') };
  }
}
```

---

### 5.2 Notion Integration

**Prioridad:** MEDIA | **Esfuerzo:** Alto

```typescript
import { Client } from '@notionhq/client';

export class NotionExporter extends BaseExporter {
  async doExport(clippings: Clipping[], options: NotionOptions): Promise<ExportResult> {
    const notion = new Client({ auth: options.notionToken });

    for (const clip of clippings) {
      await notion.pages.create({
        parent: { database_id: options.databaseId },
        properties: {
          Title: { title: [{ text: { content: clip.title } }] },
          Content: { rich_text: [{ text: { content: clip.content } }] },
        },
      });
    }
  }
}
```

---

### 5.3 Direct Joplin Sync

**Prioridad:** BAJA | **Esfuerzo:** Medio

Use Joplin's Web Clipper API (localhost:41184) to sync directly without JEX files.

---

### 5.4 Merged Output Mode

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

```typescript
export interface ProcessOptions {
  mergedOutput?: boolean;
}

// Result: highlights with embedded notes
{ type: "highlight", content: "Quote", note: "My thoughts", tags: ["review"] }
```

---

## 6. GUI Improvements

### 6.1 High Priority

| Feature | Implementation |
|---------|----------------|
| **Sort/Order** | Add `sortBy` and `sortOrder` to state |
| **Copy to Clipboard** | `navigator.clipboard.writeText()` |
| **Date Range Filter** | Filter by `clip.date` |

### 6.2 Medium Priority

| Feature | Description |
|---------|-------------|
| Multi-Book Selection | Checkboxes instead of dropdown |
| Statistics Charts | Chart.js with `calculateStats()` data |
| Batch Processing | Accept multiple files |

### 6.3 Low Priority

| Feature | Description |
|---------|-------------|
| Similarity Threshold | Slider 0-100 for fuzzy matching |
| Theme Toggle | CSS variables + localStorage |
| Keyboard Shortcuts | `useHotkeys` hook |
| PWA Support | Service Worker + manifest.json |

---

## 7. Integraciones Externas

### 7.1 Metadata Enrichment (Book Covers)

**Prioridad:** BAJA | **Esfuerzo:** Medio

```typescript
export async function fetchBookMetadata(title: string, author?: string): Promise<BookMetadata | null> {
  const query = encodeURIComponent(`${title} ${author ?? ''}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
  const response = await fetch(url);
  const data = await response.json();
  return data.items?.[0]?.volumeInfo ?? null;
}
```

---

### 7.2 Watch Mode (Auto-Sync)

**Prioridad:** BAJA | **Esfuerzo:** Medio

```typescript
import { watch } from 'chokidar';

export function watchKindle(callback: (path: string) => void) {
  const watchPaths = [
    '/Volumes/Kindle/documents/My Clippings.txt',
    'D:\\documents\\My Clippings.txt',
  ];

  const watcher = watch(watchPaths, { persistent: true });
  watcher.on('change', callback);
  watcher.on('add', callback);
}
```

---

### 7.3 Kobo / Apple Books Support

**Prioridad:** BAJA | **Esfuerzo:** Alto

Explore parsers for Kobo (SQLite) and Apple Books.

---

## 8. Funcionalidades Avanzadas

### 8.1 AI Enrichment (Tagging/Summarization)

**Prioridad:** BAJA | **Esfuerzo:** Alto

```typescript
import Anthropic from '@anthropic-ai/sdk';

export async function suggestTags(clippings: Clipping[], apiKey: string) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Analyze these highlights and suggest 3-5 tags:\n\n${highlights}`
    }],
  });
  return JSON.parse(response.content[0].text);
}
```

---

### 8.2 Property-Based Testing (fast-check)

**Prioridad:** MEDIA | **Esfuerzo:** Medio

```typescript
import { fc } from '@fast-check/vitest';

describe('TxtParser property tests', () => {
  it('should never throw on arbitrary input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = parser.parse(input);
        expect(result).toBeDefined();
      })
    );
  });
});
```

---

### 8.3 Incremental Exports (Diff Mode)

**Prioridad:** MEDIA | **Esfuerzo:** Medio

```typescript
export class DiffTracker {
  private state: { hashes: Set<string> };

  getNewClippings(clippings: Clipping[]): Clipping[] {
    return clippings.filter(clip => {
      const hash = this.hashClipping(clip);
      return !this.state.hashes.has(hash);
    });
  }

  markExported(clippings: Clipping[]): void {
    for (const clip of clippings) {
      this.state.hashes.add(this.hashClipping(clip));
    }
  }
}
```

---

### 8.4 Reading Habits Visualization ("Spotify Wrapped")

**Prioridad:** BAJA | **Esfuerzo:** Medio

Charts for HTML export and GUI:
- Highlights per Month
- Most Read Authors
- Reading Calendar Heatmap

---

### 8.5 WASM & Serverless Web App

**Prioridad:** BAJA | **Esfuerzo:** Alto

Pure client-side web tool hosted on GitHub Pages. Zero servers, maximum privacy.

---

## 9. Documentacion y DevEx

### 9.1 TypeDoc API Documentation

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

```bash
pnpm add -D typedoc typedoc-plugin-markdown
```

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"]
}
```

---

### 9.2 VitePress Documentation Site

**Prioridad:** BAJA | **Esfuerzo:** Medio

```
docs/
  guide/
    getting-started.md
    cli-usage.md
  recipes/
    obsidian-workflow.md
    joplin-setup.md
```

---

### 9.3 Architecture Decision Records (ADR)

**Prioridad:** BAJA | **Esfuerzo:** Bajo

```
docs/adr/
  0001-use-native-node-subpath-imports.md
  0002-dual-esm-cjs-publishing.md
  0003-clean-architecture-structure.md
```

---

### 9.4 Automated Release Pipeline

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

Use `semantic-release` or `changesets` for automated versioning and changelog generation.

---

## 10. Testing y Robustez

### 10.1 E2E Testing con Playwright (GUI)

**Prioridad:** MEDIA | **Esfuerzo:** Medio

```typescript
import { test, expect } from '@playwright/test';

test('should parse dropped file', async ({ page }) => {
  await page.goto('/');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./fixtures/sample.txt');
  await expect(page.locator('.clipping-card')).toHaveCount({ min: 1 });
});
```

---

### 10.2 Stress Testing / Performance Benchmarking

**Prioridad:** BAJA | **Esfuerzo:** Bajo

```typescript
import { bench, describe } from 'vitest';

describe('Parser Performance', () => {
  bench('parse 10,000 clippings', () => {
    parser.parse(generateLargeFile(10000));
  });

  bench('parse 50,000 clippings', () => {
    parser.parse(generateLargeFile(50000));
  });
});
```

---

### 10.3 Real-World Stress Testing

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Test suite with "ugly" files: mixed languages, legacy formats, malformed separators.

---

## 11. Code Cleanup y Refactoring

### 11.1 Minor Code Improvements

| Issue | Solution |
|-------|----------|
| Magic numbers in `identity.ts` | Move to `constants.ts` |
| Handlebars instance not cached | Add singleton pattern |
| Empty block in `sanitizers.ts` | Review and fix |
| Inconsistent naming `process` | Rename to `processClippings` |
| Factory creates new instances | Cache stateless instances |
| CLI version hardcoded | Read from package.json |

---

### 11.2 Consolidate Date Logic

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Merge `src/utils/system/dates.ts` and `src/importers/formats/txt/utils/date-parser.ts` into single module.

---

### 11.3 Abstract Grouping Logic in BaseExporter

**Prioridad:** BAJA | **Esfuerzo:** Bajo

Create `exportGroupedFiles(clippings, renderFn)` helper.

---

### 11.4 Externalize HTML Styles

**Prioridad:** BAJA | **Esfuerzo:** Bajo

Move CSS from `HtmlExporter` to separate file.

---

### 11.5 Robust CSV Parsing

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

Consider migrating to `csv-parse/sync` or `papaparse`.

---

### 11.6 Biome 2.0 Type Inference

**Prioridad:** BAJA | **Esfuerzo:** Bajo

Update to Biome 2.0+ and enable type inference.

---

## 12. Not Planned

These would add significant complexity for limited value:

- **PDF Export**: Would need a PDF rendering library
- **Readwise Sync**: Proprietary API, closed ecosystem
- **Highlight Colors**: Kindle doesn't export this data

---

## Matriz de Prioridades

| Mejora | Impacto | Esfuerzo | Sprint |
|--------|---------|----------|--------|
| noUncheckedIndexedAccess | Alto | Medio | 1 |
| Coverage Thresholds | Alto | Bajo | 1 |
| Zod Validation | Alto | Medio | 1 |
| CSV Injection Protection | Alto | Bajo | 1 |
| Result Pattern | Alto | Alto | 2 |
| CLI Library (citty) | Alto | Medio | 2 |
| Snyk Security | Alto | Bajo | 2 |
| Config File | Medio | Medio | 3 |
| Streaming | Alto | Alto | 3 |
| Plugin System | Medio | Alto | Backlog |
| Monorepo | Medio | Alto | Backlog |
| AI Enrichment | Bajo | Alto | Opcional |

---

## Estado Actual (Ya Implementado)

- [x] Clean Architecture / DDD structure
- [x] Factory Pattern for importers/exporters
- [x] Native Node.js subpath imports (`#`)
- [x] Dual package ESM/CJS with tsup
- [x] TypeScript strict mode
- [x] Turborepo build caching
- [x] `arethetypeswrong` CI check
- [x] Unit + Integration tests with Vitest
- [x] Biome linting/formatting

---

## Referencias

### TypeScript
- [The Strictest TypeScript Config](https://whatislove.dev/articles/the-strictest-typescript-config/)
- [TypeScript Best Practices 2025](https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025)

### Error Handling
- [neverthrow](https://github.com/supermacro/neverthrow)
- [Functional Error Handling](https://arg-software.medium.com/functional-error-handling-in-typescript-with-the-result-pattern)

### CLI
- [citty](https://github.com/unjs/citty)
- [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)

### Testing
- [fast-check](https://github.com/dubzzz/fast-check)
- [Vitest Coverage](https://vitest.dev/config/coverage)

---

*Documento actualizado: 2026-01-08*
*Mejoras totales: 60+*
