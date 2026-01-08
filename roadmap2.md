# Roadmap Unificado v2 - KindleToolsTS

Documento consolidado que unifica todas las mejoras identificadas en `mejoras.md`, `roadmap.md` y `future_improvements.md`, con implementaciones detalladas y mejores practicas de la industria 2025-2026.

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

---

## 1. Mejoras Criticas (Fundamentos)

### 1.1 Habilitar `noUncheckedIndexedAccess`

**Prioridad:** CRITICA | **Esfuerzo:** Medio-Alto | **Fuente:** mejoras.md

**Por que es importante:**
TypeScript 2025 recomienda esta opcion para maxima seguridad de tipos. Sin ella, `arr[0]` devuelve `T` en lugar de `T | undefined`, ocultando posibles errores en runtime.

**Implementacion:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

**Cambios necesarios en codigo:**
```typescript
// Antes (peligroso)
const first = clippings[0];
first.content; // Puede ser undefined!

// Despues (seguro)
const first = clippings[0];
if (first) {
  first.content; // TypeScript sabe que existe
}

// O con optional chaining
const content = clippings[0]?.content ?? 'default';
```

**Mejor aproximacion (investigada):**
Segun [The Strictest TypeScript Config](https://whatislove.dev/articles/the-strictest-typescript-config/) y practicas 2025, esta opcion es **fundamental** para proyectos en produccion. La migracion requiere revisar todos los accesos indexados, pero previene crashes en runtime.

---

### 1.2 Implementar Result Pattern con neverthrow

**Prioridad:** CRITICA | **Esfuerzo:** Alto | **Fuente:** mejoras.md

**Por que es importante:**
El patron actual `{ success: boolean, error?: Error }` no es type-safe. El compilador no obliga a manejar errores.

**Implementacion recomendada:**

```bash
pnpm add neverthrow
```

```typescript
// src/types/result.ts
import { Result, ok, err } from 'neverthrow';

// Tipos de error discriminados
export type ImportError =
  | { code: 'PARSE_ERROR'; message: string; blockIndex?: number }
  | { code: 'ENCODING_ERROR'; message: string; detectedEncoding?: string }
  | { code: 'EMPTY_FILE'; message: string }
  | { code: 'INVALID_FORMAT'; message: string };

export type ImportSuccess = {
  clippings: Clipping[];
  warnings: string[];
  meta?: ImportMeta;
};

export type ImportResult = Result<ImportSuccess, ImportError>;

// src/importers/core/base.ts
export abstract class BaseImporter {
  abstract parse(content: string): ImportResult;

  import(content: string): ImportResult {
    if (!content.trim()) {
      return err({ code: 'EMPTY_FILE', message: 'File is empty' });
    }
    return this.parse(content);
  }
}

// Uso en consumidor
const result = importer.import(fileContent);

result.match(
  (data) => {
    console.log(`Imported ${data.clippings.length} clippings`);
    processClippings(data.clippings);
  },
  (error) => {
    switch (error.code) {
      case 'PARSE_ERROR':
        console.error(`Parse failed at block ${error.blockIndex}`);
        break;
      case 'ENCODING_ERROR':
        console.error(`Encoding issue: ${error.detectedEncoding}`);
        break;
      default:
        console.error(error.message);
    }
  }
);

// O con andThen para pipelines
const pipeline = importer.import(content)
  .andThen(({ clippings }) => processor.process(clippings))
  .andThen(({ clippings }) => exporter.export(clippings));
```

**Mejor aproximacion (investigada):**
- **neverthrow** (recomendado): API simple, bien mantenido, 3.5k+ stars
- **fp-ts Either**: Mas completo pero curva de aprendizaje mayor
- **oxide.ts**: Similar a neverthrow, inspirado en Rust
- **ts-results**: Alternativa ligera

Segun [Functional Error Handling in TypeScript](https://arg-software.medium.com/functional-error-handling-in-typescript-with-the-result-pattern-5b96a5abb6d3), neverthrow es la opcion mas pragmatica para proyectos TypeScript que no quieren adoptar FP completo.

---

### 1.3 Validacion de Schema con Zod en Importers

**Prioridad:** CRITICA | **Esfuerzo:** Medio | **Fuente:** mejoras.md + roadmap.md

**Por que es importante:**
Zod ya esta instalado pero no se usa para validar inputs externos (JSON/CSV imports). Esto puede causar crashes con datos malformados.

**Implementacion:**

```typescript
// src/schemas/clipping.schema.ts
import { z } from 'zod';

export const LocationSchema = z.object({
  raw: z.string(),
  start: z.number(),
  end: z.number().nullable(),
});

export const ClippingSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title required'),
  titleRaw: z.string().optional(),
  author: z.string().default('Unknown'),
  authorRaw: z.string().optional(),
  content: z.string(),
  contentRaw: z.string().optional(),
  type: z.enum(['highlight', 'note', 'bookmark', 'clip', 'article']),
  page: z.number().nullable().optional(),
  location: LocationSchema,
  date: z.coerce.date().nullable().optional(),
  dateRaw: z.string().optional(),
  isEmpty: z.boolean().default(false),
  isLimitReached: z.boolean().default(false),
  language: z.string().optional(),
  source: z.string().default('kindle'),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  wordCount: z.number().optional(),
  charCount: z.number().optional(),
  blockIndex: z.number().optional(),
});

export const ImportedDataSchema = z.object({
  clippings: z.array(ClippingSchema).optional(),
  books: z.record(z.array(ClippingSchema)).optional(),
  meta: z.object({
    exportedAt: z.string().optional(),
    source: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
}).refine(
  data => data.clippings || data.books,
  { message: 'Must have "clippings" array or "books" object' }
);

export type ValidatedClipping = z.infer<typeof ClippingSchema>;

// src/importers/formats/json.importer.ts
import { ImportedDataSchema } from '#schemas/clipping.schema.js';

protected async doParse(content: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return err({ code: 'PARSE_ERROR', message: 'Invalid JSON syntax' });
  }

  const validated = ImportedDataSchema.safeParse(data);
  if (!validated.success) {
    return err({
      code: 'INVALID_FORMAT',
      message: validated.error.issues.map(i => i.message).join(', ')
    });
  }

  // Ahora validated.data esta tipado correctamente
  const clippings = validated.data.clippings ??
    Object.values(validated.data.books ?? {}).flat();

  return ok({ clippings, warnings: [] });
}
```

**Validacion de opciones de CLI/Exporters:**
```typescript
// src/schemas/options.schema.ts
export const ExportOptionsSchema = z.object({
  format: z.enum(['json', 'csv', 'md', 'html', 'obsidian', 'joplin']),
  outputPath: z.string().optional(),
  folderStructure: z.enum(['flat', 'by-book', 'by-author']).default('flat'),
  highlightsOnly: z.boolean().default(false),
  extractTags: z.boolean().default(true),
  tagCase: z.enum(['original', 'uppercase', 'lowercase']).default('original'),
});

// Validar antes de procesar
const options = ExportOptionsSchema.parse(rawOptions);
```

**Mejor aproximacion (investigada):**
Zod es el estandar de facto en 2025 para validacion en TypeScript:
- Inferencia automatica de tipos
- Mensajes de error claros
- Transformaciones integradas
- Tree-shakeable

Alternativas consideradas:
- **Valibot**: Mas ligero (1kb), pero menos ecosistema
- **ArkType**: Mas rapido en runtime, pero sintaxis menos intuitiva
- **TypeBox**: Genera JSON Schema, util si se necesita OpenAPI

---

### 1.4 Coverage Thresholds en Vitest

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Fuente:** mejoras.md

**Implementacion:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/gui/**",
        "**/*.d.ts",
        "**/types/**",
        "**/__tests__/**",
      ],
      thresholds: {
        // Umbrales globales
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        // Umbrales por archivo (evita archivos sin tests)
        perFile: true,
        // Actualiza automaticamente cuando mejora
        autoUpdate: false, // true solo en CI
      },
    },
  },
});
```

**Script en package.json:**
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:coverage:check": "vitest run --coverage --coverage.thresholds.100"
  }
}
```

---

### 1.5 Habilitar `exactOptionalPropertyTypes`

**Prioridad:** MEDIA-ALTA | **Esfuerzo:** Bajo | **Fuente:** mejoras.md

```json
// tsconfig.json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": true
  }
}
```

Esto diferencia entre:
- `prop?: string` - La propiedad puede no existir
- `prop: string | undefined` - La propiedad existe pero puede ser undefined

---

## 2. Seguridad y Calidad

### 2.1 Snyk - Escaneo de Dependencias

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Fuente:** roadmap.md

**Implementacion:**

```bash
pnpm add -D snyk
npx snyk auth
```

```json
// package.json
{
  "scripts": {
    "security:test": "snyk test",
    "security:monitor": "snyk monitor"
  }
}
```

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * 1' # Lunes a medianoche

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

### 2.2 SonarQube - Analisis Estatico

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Fuente:** roadmap.md

**Implementacion:**

```properties
# sonar-project.properties
sonar.projectKey=kindle-tools-ts
sonar.projectName=Kindle Tools TS
sonar.sources=src
sonar.tests=tests
sonar.test.inclusions=**/*.test.ts,**/*.spec.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.sourceEncoding=UTF-8
sonar.typescript.tsconfigPath=tsconfig.json
```

**Mejor aproximacion:**
- Para proyectos open source: SonarCloud (gratis)
- Para equipos: SonarQube self-hosted
- Alternativa ligera: Solo usar Biome 2.0 con todas las reglas

---

### 2.3 CSV Injection Protection

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Fuente:** roadmap.md

**Implementacion:**

```typescript
// src/utils/security/csv-sanitizer.ts
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function sanitizeCSVField(value: string): string {
  if (!value) return value;

  const trimmed = value.trim();

  // Detectar y neutralizar formulas
  if (FORMULA_PREFIXES.some(prefix => trimmed.startsWith(prefix))) {
    // Prefijo con apostrofe (Excel lo interpreta como texto)
    return `'${trimmed}`;
  }

  return value;
}

// Uso en CSVExporter
const sanitizedContent = sanitizeCSVField(clipping.content);
```

**Mejor aproximacion (investigada):**
OWASP recomienda:
1. Prefijo con apostrofe `'` (mas compatible)
2. O prefijo con espacio (menos visible pero puede afectar datos)
3. Validacion adicional para URLs/comandos

---

### 2.4 Centralized Error Types

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Fuente:** mejoras.md + roadmap.md

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
  // IO Errors
  ERR_FILE_NOT_FOUND = 'ERR_FILE_NOT_FOUND',
  ERR_FILE_READ = 'ERR_FILE_READ',
  ERR_FILE_WRITE = 'ERR_FILE_WRITE',

  // Parse Errors
  ERR_PARSE_INVALID_FORMAT = 'ERR_PARSE_INVALID_FORMAT',
  ERR_PARSE_ENCODING = 'ERR_PARSE_ENCODING',
  ERR_PARSE_BLOCK = 'ERR_PARSE_BLOCK',

  // Validation Errors
  ERR_VALIDATION_SCHEMA = 'ERR_VALIDATION_SCHEMA',
  ERR_VALIDATION_OPTIONS = 'ERR_VALIDATION_OPTIONS',

  // Export Errors
  ERR_EXPORT_UNKNOWN_FORMAT = 'ERR_EXPORT_UNKNOWN_FORMAT',
  ERR_EXPORT_WRITE = 'ERR_EXPORT_WRITE',
}

export class ParseError extends AppError {
  constructor(
    message: string,
    public readonly blockIndex?: number,
    public readonly rawContent?: string
  ) {
    super(message, ErrorCode.ERR_PARSE_BLOCK, { blockIndex, rawContent });
    this.name = 'ParseError';
  }
}

// src/index.ts - Export publico
export { AppError, ParseError, ErrorCode } from './errors/app-errors.js';
```

---

## 3. Arquitectura y Escalabilidad

### 3.1 Streaming Architecture

**Prioridad:** ALTA | **Esfuerzo:** Alto | **Fuente:** roadmap.md

**Por que es importante:**
Archivos de 50MB+ de clippings pueden causar OOM. La arquitectura actual carga todo en memoria.

**Implementacion:**

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
      highWaterMark: 64 * 1024, // 64KB chunks
    });
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Clipping) => void
  ) {
    this.buffer += chunk.toString('utf-8');

    const blocks = this.buffer.split(this.separator);

    // Mantener el ultimo bloque incompleto en buffer
    this.buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      if (block.trim()) {
        try {
          const clipping = this.parseBlock(block);
          if (clipping) {
            this.push(clipping);
          }
        } catch (err) {
          // Emitir warning pero continuar
          this.emit('warning', { block, error: err });
        }
      }
    }

    callback();
  }

  _flush(callback: () => void) {
    if (this.buffer.trim()) {
      try {
        const clipping = this.parseBlock(this.buffer);
        if (clipping) {
          this.push(clipping);
        }
      } catch {
        // Ignore incomplete final block
      }
    }
    callback();
  }

  private parseBlock(block: string): Clipping | null {
    // ... logica de parsing existente
  }
}

// Uso
import { createReadStream } from 'node:fs';

async function importLargeFile(path: string): Promise<Clipping[]> {
  const clippings: Clipping[] = [];

  await pipelineAsync(
    createReadStream(path, { highWaterMark: 64 * 1024 }),
    new StreamingTxtImporter(),
    async function* (source) {
      for await (const clipping of source) {
        clippings.push(clipping);
        yield clipping;
      }
    }
  );

  return clippings;
}
```

**Mejor aproximacion (investigada):**
Segun [Node.js Streams Best Practices](https://nodejs.org/en/docs/guides/backpressuring-in-streams):
- Usar `pipeline()` en lugar de `.pipe()` para manejo de errores
- Configurar `highWaterMark` segun el caso de uso
- Implementar backpressure correctamente
- Considerar `for await...of` para consumir streams

---

### 3.2 FileSystem Abstraction (Ports & Adapters)

**Prioridad:** MEDIA-ALTA | **Esfuerzo:** Alto | **Fuente:** mejoras.md

```typescript
// src/ports/filesystem.port.ts
export interface FileSystemPort {
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, content: string | Buffer): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ isDirectory(): boolean; size: number }>;
}

// src/adapters/node-filesystem.adapter.ts
import * as fs from 'node:fs/promises';

export class NodeFileSystemAdapter implements FileSystemPort {
  async readFile(path: string): Promise<Buffer> {
    return fs.readFile(path);
  }

  async writeFile(path: string, content: string | Buffer): Promise<void> {
    await fs.writeFile(path, content);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await fs.mkdir(path, options);
  }

  async readdir(path: string): Promise<string[]> {
    return fs.readdir(path);
  }

  async stat(path: string) {
    return fs.stat(path);
  }
}

// src/adapters/memory-filesystem.adapter.ts (para tests)
export class MemoryFileSystemAdapter implements FileSystemPort {
  private files = new Map<string, Buffer>();
  private directories = new Set<string>();

  async readFile(path: string): Promise<Buffer> {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string | Buffer): Promise<void> {
    this.files.set(path, Buffer.isBuffer(content) ? content : Buffer.from(content));
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  // ... resto de metodos

  // Helpers para tests
  setFile(path: string, content: string | Buffer): void {
    this.files.set(path, Buffer.isBuffer(content) ? content : Buffer.from(content));
  }

  getFile(path: string): Buffer | undefined {
    return this.files.get(path);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
  }
}

// Inyeccion de dependencia
// src/core/processor.ts
export function createProcessor(fs: FileSystemPort) {
  return {
    async processFile(path: string): Promise<ProcessResult> {
      const content = await fs.readFile(path);
      // ...
    }
  };
}
```

---

### 3.3 Plugin Architecture

**Prioridad:** MEDIA | **Esfuerzo:** Alto | **Fuente:** roadmap.md

```typescript
// src/plugins/types.ts
export interface ExporterPlugin {
  name: string;
  version: string;
  format: string;

  // Lifecycle hooks
  init?(): Promise<void>;
  destroy?(): Promise<void>;

  // Core functionality
  export(clippings: Clipping[], options: ExportOptions): Promise<ExportResult>;

  // Metadata
  supportedOptions?: string[];
  description?: string;
}

// src/plugins/registry.ts
class PluginRegistry {
  private exporters = new Map<string, ExporterPlugin>();

  register(plugin: ExporterPlugin): void {
    if (this.exporters.has(plugin.format)) {
      throw new Error(`Exporter for format "${plugin.format}" already registered`);
    }
    this.exporters.set(plugin.format, plugin);
  }

  unregister(format: string): boolean {
    return this.exporters.delete(format);
  }

  get(format: string): ExporterPlugin | undefined {
    return this.exporters.get(format);
  }

  list(): string[] {
    return Array.from(this.exporters.keys());
  }
}

export const pluginRegistry = new PluginRegistry();

// Registro de plugins built-in
import { JsonExporter } from '#exporters/formats/json.exporter.js';
pluginRegistry.register(new JsonExporter());

// Uso externo (community plugins)
// kindle-tools-notion/index.ts
import { pluginRegistry } from 'kindle-tools-ts';

pluginRegistry.register({
  name: 'Notion Exporter',
  version: '1.0.0',
  format: 'notion',
  async export(clippings, options) {
    // Sync to Notion via API
  }
});
```

**Mejor aproximacion (investigada):**
Patrones de plugin en TypeScript:
1. **Registry Pattern** (recomendado): Simple, type-safe
2. **Event-based**: Mas flexible pero mas complejo
3. **Middleware chain**: Util para transformaciones

---

### 3.4 Monorepo Structure (pnpm workspaces)

**Prioridad:** MEDIA | **Esfuerzo:** Alto | **Fuente:** roadmap.md

```
kindle-tools-ts/
  packages/
    core/           # Logica pura, sin deps de Node
      src/
      package.json
    cli/            # CLI con Node.js deps
      src/
      package.json
    gui/            # Vite app
      src/
      package.json
    shared/         # Tipos compartidos
      src/
      package.json
  pnpm-workspace.yaml
  turbo.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**", "tests/**"]
    }
  }
}
```

---

## 4. CLI y Configuracion

### 4.1 Migrar a CLI Library (citty o Commander)

**Prioridad:** ALTA | **Esfuerzo:** Medio | **Fuente:** mejoras.md

**Comparativa investigada:**

| Library | Bundle Size | Features | TypeScript | Recomendacion |
|---------|-------------|----------|------------|---------------|
| **citty** | 12KB | Subcommands, auto-help | Excelente | Mejor para proyectos nuevos |
| **commander** | 45KB | Muy completo, maduro | Bueno | Mas documentacion |
| **yargs** | 120KB | Muy flexible | Bueno | Overkill para este proyecto |
| **cmd-ts** | 8KB | Type-safe | Excelente | Menos mantenido |

**Implementacion con citty (recomendado):**

```typescript
// src/cli/index.ts
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'kindle-tools',
    version: '1.0.0',
    description: 'Parse and export Kindle highlights',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Path to My Clippings.txt or exported JSON',
      required: true,
    },
    format: {
      type: 'string',
      alias: 'f',
      description: 'Export format',
      default: 'json',
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output path (default: stdout)',
    },
    lang: {
      type: 'string',
      alias: 'l',
      description: 'Force language detection',
    },
    'highlights-only': {
      type: 'boolean',
      description: 'Output only highlights (filter notes/bookmarks)',
      default: false,
    },
    'no-merge': {
      type: 'boolean',
      description: 'Disable smart merging of highlights',
      default: false,
    },
    'extract-tags': {
      type: 'boolean',
      description: 'Extract #hashtags from content',
      default: true,
    },
    'folder-structure': {
      type: 'string',
      description: 'Folder organization: flat, by-book, by-author',
      default: 'flat',
    },
    json: {
      type: 'boolean',
      description: 'Output logs as JSON (for pipelines)',
      default: false,
    },
    quiet: {
      type: 'boolean',
      alias: 'q',
      description: 'Suppress all output except errors',
      default: false,
    },
  },
  async run({ args }) {
    // Validar opciones con Zod
    const options = ExportOptionsSchema.safeParse({
      format: args.format,
      outputPath: args.output,
      highlightsOnly: args['highlights-only'],
      // ...
    });

    if (!options.success) {
      console.error('Invalid options:', options.error.message);
      process.exit(1);
    }

    // Ejecutar pipeline
    await runPipeline(args.input, options.data);
  },
});

// Subcomando para GUI
const guiCommand = defineCommand({
  meta: {
    name: 'gui',
    description: 'Start web interface',
  },
  args: {
    port: {
      type: 'string',
      alias: 'p',
      default: '3000',
    },
  },
  async run({ args }) {
    await startGUI(parseInt(args.port));
  },
});

// Main con subcomandos
const cli = defineCommand({
  meta: {
    name: 'kindle-tools',
    version: '1.0.0',
  },
  subCommands: {
    export: main,
    gui: guiCommand,
  },
});

runMain(cli);
```

---

### 4.2 Config File Support (.kindletoolsrc)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Fuente:** roadmap.md + future_improvements.md

**Implementacion con cosmiconfig:**

```bash
pnpm add cosmiconfig
```

```typescript
// src/config/loader.ts
import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

const ConfigSchema = z.object({
  language: z.enum(['auto', 'en', 'es', 'de', 'fr', 'pt', 'it']).default('auto'),
  format: z.enum(['json', 'csv', 'md', 'html', 'obsidian', 'joplin']).default('json'),
  folderStructure: z.enum(['flat', 'by-book', 'by-author']).default('flat'),
  extractTags: z.boolean().default(true),
  tagCase: z.enum(['original', 'uppercase', 'lowercase']).default('original'),
  highlightsOnly: z.boolean().default(false),
  removeDuplicates: z.boolean().default(true),
  smartMerge: z.boolean().default(true),
  outputPath: z.string().optional(),
  // Templates personalizados
  templates: z.object({
    highlight: z.string().optional(),
    note: z.string().optional(),
    bookmark: z.string().optional(),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const explorer = cosmiconfig('kindletools', {
  searchPlaces: [
    'package.json',
    '.kindletoolsrc',
    '.kindletoolsrc.json',
    '.kindletoolsrc.yaml',
    '.kindletoolsrc.yml',
    'kindletools.config.js',
    'kindletools.config.cjs',
    'kindletools.config.mjs',
  ],
});

export async function loadConfig(searchFrom?: string): Promise<Config> {
  const result = await explorer.search(searchFrom);

  if (!result || result.isEmpty) {
    return ConfigSchema.parse({});
  }

  const validated = ConfigSchema.safeParse(result.config);

  if (!validated.success) {
    throw new Error(
      `Invalid config in ${result.filepath}:\n${validated.error.message}`
    );
  }

  return validated.data;
}

// Uso en CLI
const config = await loadConfig();
const mergedOptions = { ...config, ...cliArgs }; // CLI tiene prioridad
```

**Ejemplo de archivo de configuracion:**
```json
// .kindletoolsrc
{
  "format": "obsidian",
  "folderStructure": "by-author",
  "extractTags": true,
  "tagCase": "lowercase",
  "templates": {
    "highlight": "> {{content}}\n\n*Page {{page}} | {{date}}*"
  }
}
```

---

### 4.3 Interactive CLI Mode

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Fuente:** future_improvements.md

```typescript
// src/cli/interactive.ts
import { confirm, select, text } from '@clack/prompts';

export async function runInteractive() {
  const input = await text({
    message: 'Path to My Clippings.txt:',
    placeholder: './My Clippings.txt',
    validate: (value) => {
      if (!value) return 'Path required';
      // Validar que existe
    },
  });

  const format = await select({
    message: 'Export format:',
    options: [
      { value: 'json', label: 'JSON' },
      { value: 'md', label: 'Markdown' },
      { value: 'obsidian', label: 'Obsidian Vault' },
      { value: 'joplin', label: 'Joplin (JEX)' },
      { value: 'html', label: 'HTML' },
      { value: 'csv', label: 'CSV' },
    ],
  });

  const highlightsOnly = await confirm({
    message: 'Export highlights only (exclude notes/bookmarks)?',
    initialValue: false,
  });

  // ... ejecutar con opciones seleccionadas
}
```

---

## 5. Exporters y Formatos

### 5.1 Anki Export (.apkg / CSV)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Fuente:** roadmap.md + future_improvements.md

```typescript
// src/exporters/formats/anki.exporter.ts
import { BaseExporter } from '#exporters/core/base.js';

export class AnkiExporter extends BaseExporter {
  format = 'anki';
  extension = '.txt'; // Tab-separated for Anki import

  protected async doExport(clippings: Clipping[]): Promise<ExportResult> {
    const cards: string[] = [];

    for (const clip of clippings.filter(c => c.type === 'highlight')) {
      // Front: Book context
      const front = `<b>${clip.title}</b><br>${clip.author}`;

      // Back: The highlight content
      const back = clip.content;

      // Tags for Anki
      const tags = [
        `book::${this.sanitizeTag(clip.title)}`,
        `author::${this.sanitizeTag(clip.author)}`,
        ...(clip.tags ?? []).map(t => `custom::${t}`),
      ].join(' ');

      // Tab-separated: front, back, tags
      cards.push(`${this.escapeTab(front)}\t${this.escapeTab(back)}\t${tags}`);
    }

    return {
      success: true,
      content: cards.join('\n'),
      files: [{
        path: 'kindle-flashcards.txt',
        content: cards.join('\n'),
      }],
    };
  }

  private sanitizeTag(value: string): string {
    return value.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  private escapeTab(value: string): string {
    return value.replace(/\t/g, ' ').replace(/\n/g, '<br>');
  }
}
```

Para `.apkg` nativo (mas complejo):
```bash
pnpm add anki-apkg-export
```

---

### 5.2 Notion Integration

**Prioridad:** MEDIA | **Esfuerzo:** Alto | **Fuente:** future_improvements.md

```typescript
// src/exporters/formats/notion.exporter.ts
import { Client } from '@notionhq/client';

interface NotionExporterOptions extends ExportOptions {
  notionToken: string;
  databaseId: string;
}

export class NotionExporter extends BaseExporter {
  format = 'notion';

  async doExport(
    clippings: Clipping[],
    options: NotionExporterOptions
  ): Promise<ExportResult> {
    const notion = new Client({ auth: options.notionToken });

    const results = [];

    for (const clip of clippings) {
      try {
        await notion.pages.create({
          parent: { database_id: options.databaseId },
          properties: {
            Title: { title: [{ text: { content: clip.title } }] },
            Author: { rich_text: [{ text: { content: clip.author } }] },
            Type: { select: { name: clip.type } },
            Content: { rich_text: [{ text: { content: clip.content } }] },
            Page: { number: clip.page ?? 0 },
            Date: { date: clip.date ? { start: clip.date.toISOString() } : null },
            Tags: { multi_select: (clip.tags ?? []).map(t => ({ name: t })) },
          },
        });
        results.push({ clip, success: true });
      } catch (error) {
        results.push({ clip, success: false, error });
      }
    }

    const failed = results.filter(r => !r.success);

    return {
      success: failed.length === 0,
      content: `Synced ${results.length - failed.length}/${results.length} to Notion`,
      warnings: failed.map(f => `Failed: ${f.clip.title}`),
    };
  }
}
```

---

### 5.3 Merged Output Mode

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Fuente:** future_improvements.md

Ya parcialmente implementado con `linkNotesToHighlights`. Solo falta exponer como opcion:

```typescript
// src/core/processor.ts
export interface ProcessOptions {
  // ... existing
  mergedOutput?: boolean; // New option
}

export function process(clippings: Clipping[], options: ProcessOptions): ProcessResult {
  let processed = clippings;

  // ... existing steps

  if (options.mergedOutput) {
    // Ya linkamos notas a highlights en linkNotesToHighlights
    // Ahora filtramos para devolver solo highlights con sus notas embebidas
    processed = processed.filter(c => c.type === 'highlight');
  }

  return { clippings: processed, /* ... */ };
}
```

---

## 6. GUI Improvements

### 6.1 High Priority

| Feature | Description | Implementacion |
|---------|-------------|----------------|
| **Sort/Order** | By date, page, book, author, length | Agregar `sortBy` y `sortOrder` a state |
| **Copy to Clipboard** | Button per clipping | `navigator.clipboard.writeText()` |
| **Date Range Filter** | From/to date inputs | Filtrar por `clip.date` |

### 6.2 Medium Priority

| Feature | Description |
|---------|-------------|
| Multi-Book Selection | Checkboxes en lugar de dropdown |
| Statistics Charts | Chart.js con datos de `calculateStats()` |
| Batch Processing | Aceptar multiples archivos |

### 6.3 Low Priority

| Feature | Description |
|---------|-------------|
| Similarity Threshold | Slider 0-100 para fuzzy matching |
| Theme Toggle | CSS variables + localStorage |
| Keyboard Shortcuts | `useHotkeys` hook |
| PWA Support | Service Worker + manifest.json |

---

## 7. Integraciones Externas

### 7.1 Metadata Enrichment (Book Covers)

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Fuente:** roadmap.md

```typescript
// src/enrichment/book-metadata.ts
interface BookMetadata {
  title: string;
  authors: string[];
  coverUrl?: string;
  isbn?: string;
  publishedDate?: string;
  description?: string;
}

export async function fetchBookMetadata(
  title: string,
  author?: string
): Promise<BookMetadata | null> {
  const query = encodeURIComponent(`${title} ${author ?? ''}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items?.[0]) return null;

    const book = data.items[0].volumeInfo;

    return {
      title: book.title,
      authors: book.authors ?? [],
      coverUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:'),
      isbn: book.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier,
      publishedDate: book.publishedDate,
      description: book.description,
    };
  } catch {
    return null;
  }
}
```

---

### 7.2 Watch Mode (Auto-Sync)

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Fuente:** roadmap.md

```typescript
// src/cli/watch.ts
import { watch } from 'chokidar';

export function watchKindle(callback: (path: string) => void) {
  // Paths comunes donde aparece Kindle
  const watchPaths = [
    '/Volumes/Kindle/documents/My Clippings.txt', // macOS
    'D:\\documents\\My Clippings.txt',            // Windows
    '/media/*/Kindle/documents/My Clippings.txt', // Linux
  ];

  const watcher = watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', (path) => {
    console.log(`Detected changes in ${path}`);
    callback(path);
  });

  watcher.on('add', (path) => {
    console.log(`Kindle connected: ${path}`);
    callback(path);
  });

  return watcher;
}
```

---

## 8. Funcionalidades Avanzadas

### 8.1 AI Enrichment (Tagging/Summarization)

**Prioridad:** BAJA | **Esfuerzo:** Alto | **Fuente:** roadmap.md

```typescript
// src/enrichment/ai-tagger.ts
import Anthropic from '@anthropic-ai/sdk';

export async function suggestTags(
  clippings: Clipping[],
  apiKey: string
): Promise<Map<string, string[]>> {
  const client = new Anthropic({ apiKey });

  const results = new Map<string, string[]>();

  // Agrupar por libro para contexto
  const byBook = groupByBook(clippings);

  for (const [book, clips] of byBook) {
    const highlights = clips
      .filter(c => c.type === 'highlight')
      .map(c => c.content)
      .join('\n---\n');

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Analyze these book highlights and suggest 3-5 thematic tags:

${highlights}

Return only a JSON array of lowercase tag strings.`
      }],
    });

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    try {
      const tags = JSON.parse(text);
      results.set(book, tags);
    } catch {
      results.set(book, []);
    }
  }

  return results;
}
```

---

### 8.2 Property-Based Testing (fast-check)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Fuente:** roadmap.md

```typescript
// tests/property/parser.property.test.ts
import { fc } from '@fast-check/vitest';
import { describe, it } from 'vitest';
import { TxtParser } from '#importers/formats/txt/parser.js';

describe('TxtParser property tests', () => {
  it('should never throw on arbitrary input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const parser = new TxtParser();
        // Debe retornar resultado, no lanzar excepcion
        const result = parser.parse(input);
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      })
    );
  });

  it('should preserve content integrity', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          author: fc.string({ minLength: 1, maxLength: 100 }),
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          page: fc.integer({ min: 1, max: 10000 }),
          location: fc.integer({ min: 1, max: 100000 }),
        }),
        (data) => {
          // Generar clipping valido
          const block = formatAsKindleBlock(data);
          const parser = new TxtParser();
          const result = parser.parse(block);

          if (result.success && result.clippings.length > 0) {
            const clip = result.clippings[0];
            expect(clip.content).toContain(data.content.trim());
          }
        }
      )
    );
  });

  it('should handle malformed separators gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 100 }),
        fc.constantFrom('==========', '----------', '=====', '\n\n'),
        (blocks, separator) => {
          const input = blocks.join(separator);
          const parser = new TxtParser();
          const result = parser.parse(input);
          // No debe crashear
          expect(result).toBeDefined();
        }
      )
    );
  });
});

function formatAsKindleBlock(data: {
  title: string;
  author: string;
  content: string;
  page: number;
  location: number;
}): string {
  return `${data.title} (${data.author})
- Your Highlight on page ${data.page} | Location ${data.location} | Added on January 1, 2024

${data.content}
==========`;
}
```

---

### 8.3 Incremental Exports (Diff Mode)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Fuente:** roadmap.md + future_improvements.md

```typescript
// src/diff/tracker.ts
import { createHash } from 'node:crypto';

interface ExportState {
  lastExport: string;
  hashes: Set<string>;
}

export class DiffTracker {
  private state: ExportState;
  private statePath: string;

  constructor(statePath: string) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  private loadState(): ExportState {
    try {
      const data = JSON.parse(readFileSync(this.statePath, 'utf-8'));
      return {
        lastExport: data.lastExport,
        hashes: new Set(data.hashes),
      };
    } catch {
      return { lastExport: '', hashes: new Set() };
    }
  }

  private hashClipping(clip: Clipping): string {
    const content = `${clip.title}|${clip.content}|${clip.location.start}`;
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

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
    this.state.lastExport = new Date().toISOString();
    this.saveState();
  }

  private saveState(): void {
    const data = {
      lastExport: this.state.lastExport,
      hashes: Array.from(this.state.hashes),
    };
    writeFileSync(this.statePath, JSON.stringify(data, null, 2));
  }
}

// Uso en CLI
const tracker = new DiffTracker('.kindle-tools-state.json');
const newClippings = tracker.getNewClippings(allClippings);
console.log(`Found ${newClippings.length} new clippings`);
// ... export
tracker.markExported(newClippings);
```

---

## 9. Documentacion y DevEx

### 9.1 TypeDoc API Documentation

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Fuente:** roadmap.md

```bash
pnpm add -D typedoc typedoc-plugin-markdown
```

```json
// typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "excludePrivate": true,
  "excludeInternal": true,
  "categorizeByGroup": true,
  "categoryOrder": ["Core", "Importers", "Exporters", "Utils", "*"]
}
```

---

### 9.2 VitePress Documentation Site

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Fuente:** roadmap.md

```bash
pnpm add -D vitepress
```

```
docs/
  .vitepress/
    config.ts
  index.md
  guide/
    getting-started.md
    cli-usage.md
    gui-usage.md
  recipes/
    obsidian-workflow.md
    joplin-setup.md
  api/
    (generated by typedoc)
```

---

### 9.3 Architecture Decision Records (ADR)

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Fuente:** roadmap.md

```
docs/adr/
  0001-use-native-node-subpath-imports.md
  0002-dual-esm-cjs-publishing.md
  0003-clean-architecture-structure.md
  0004-biome-over-eslint.md
```

---

## 10. Testing y Robustez

### 10.1 E2E Testing con Playwright (GUI)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Fuente:** roadmap.md

```typescript
// tests/e2e/gui.spec.ts
import { test, expect } from '@playwright/test';

test.describe('GUI E2E', () => {
  test('should parse dropped file and show clippings', async ({ page }) => {
    await page.goto('/');

    // Simular drag & drop
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./fixtures/sample-clippings.txt');

    // Esperar resultados
    await expect(page.locator('.clipping-card')).toHaveCount({ min: 1 });

    // Verificar contenido
    const firstCard = page.locator('.clipping-card').first();
    await expect(firstCard).toContainText('Highlight');
  });

  test('should export to selected format', async ({ page }) => {
    await page.goto('/');

    // ... cargar archivo

    // Seleccionar formato
    await page.selectOption('#format-select', 'obsidian');

    // Click export
    const downloadPromise = page.waitForDownload();
    await page.click('#export-button');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});
```

---

### 10.2 Stress Testing

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Fuente:** roadmap.md

```typescript
// tests/benchmark/large-file.bench.ts
import { bench, describe } from 'vitest';
import { TxtParser } from '#importers/formats/txt/parser.js';

function generateLargeFile(count: number): string {
  const blocks = [];
  for (let i = 0; i < count; i++) {
    blocks.push(`Book Title ${i % 100} (Author ${i % 50})
- Your Highlight on page ${i} | Location ${i * 10}-${i * 10 + 5} | Added on January ${(i % 28) + 1}, 2024

This is highlight content number ${i}. It contains some text that varies in length depending on the index. ${'Lorem ipsum '.repeat(i % 10)}
==========`);
  }
  return blocks.join('\n');
}

describe('Parser Performance', () => {
  const parser = new TxtParser();

  bench('parse 1,000 clippings', () => {
    parser.parse(generateLargeFile(1000));
  });

  bench('parse 10,000 clippings', () => {
    parser.parse(generateLargeFile(10000));
  });

  bench('parse 50,000 clippings', () => {
    parser.parse(generateLargeFile(50000));
  });
});
```

---

## Matriz de Prioridades

| Mejora | Impacto | Esfuerzo | ROI | Recomendacion |
|--------|---------|----------|-----|---------------|
| noUncheckedIndexedAccess | Alto | Medio | Alto | Sprint 1 |
| Coverage Thresholds | Alto | Bajo | Muy Alto | Sprint 1 |
| Zod Validation | Alto | Medio | Alto | Sprint 1 |
| Result Pattern | Alto | Alto | Alto | Sprint 2 |
| CLI Library | Alto | Medio | Alto | Sprint 2 |
| Config File | Medio | Medio | Medio | Sprint 3 |
| Streaming | Alto | Alto | Medio | Sprint 3 |
| Plugin System | Medio | Alto | Bajo | Backlog |
| Monorepo | Medio | Alto | Bajo | Backlog |
| AI Enrichment | Bajo | Alto | Bajo | Opcional |

---

## Referencias

### TypeScript
- [The Strictest TypeScript Config](https://whatislove.dev/articles/the-strictest-typescript-config/)
- [TypeScript Best Practices 2025](https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025)

### Error Handling
- [neverthrow](https://github.com/supermacro/neverthrow)
- [Functional Error Handling](https://arg-software.medium.com/functional-error-handling-in-typescript-with-the-result-pattern)

### CLI
- [citty](https://github.com/unjs/citty) - Recomendado
- [commander](https://github.com/tj/commander.js)
- [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)

### Testing
- [fast-check](https://github.com/dubzzz/fast-check)
- [Vitest Coverage](https://vitest.dev/config/coverage)

### Streaming
- [Node.js Streams](https://nodejs.org/en/docs/guides/backpressuring-in-streams)

---

*Documento generado: 2026-01-08*
*Mejoras totales: 50+*
*Fuentes: mejoras.md, roadmap.md, future_improvements.md*
