# KindleToolsTS - Roadmap

Mejoras pendientes organizadas por prioridad. Cada item incluye instrucciones claras para su implementacion.

**Estado del proyecto:** Libreria TypeScript pura + Visual Workbench. Clean Architecture / DDD.

> **Arquitectura documentada en:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Indice

1. [Media Prioridad](#1-media-prioridad)
2. [Baja Prioridad](#2-baja-prioridad)
3. [Not Planned](#3-not-planned)

---

## 1. Media Prioridad

### 1.1 Carga Dinamica de Locales date-fns

**Ubicacion:** `src/domain/parsing/dates.ts:11`

**Problema:** Se importan estaticamente todos los locales de date-fns (~50KB+ de locales no usados en browser).

**Implementacion:**
```typescript
const LOCALE_LOADERS: Record<SupportedLanguage, () => Promise<Locale>> = {
  en: () => import("date-fns/locale/en-US").then(m => m.enUS),
  es: () => import("date-fns/locale/es").then(m => m.es),
  // ...
};

async function getLocale(lang: SupportedLanguage): Promise<Locale> {
  return LOCALE_LOADERS[lang]();
}
```

**Impacto:** Requiere refactorizar `parseKindleDate` a async (cambio en cascada). No urgente mientras target principal sea Node.js.

---

### 1.2 Eliminar `any` en Deteccion de Entorno

**Ubicacion:** `src/utils/security/hashing.ts:19-21`

**Problema:**
```typescript
const crypto = (globalThis as any).process?.versions?.node
  ? (require as any)("node:crypto")
  : null;
```

**Implementacion:**
```typescript
declare const process: { versions?: { node?: string } } | undefined;

function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' &&
         typeof process.versions?.node === 'string';
}

const crypto = isNodeEnvironment()
  ? await import("node:crypto")
  : null;
```

---

### 1.3 Mejoras en MultiFileExporter

**Ubicacion:** `src/exporters/shared/multi-file-exporter.ts`

**Mejoras pendientes:**

1. **Pasar clippings a exportPreamble:**
   ```typescript
   // Actual
   protected exportPreamble(options: ExporterOptions): Promise<void>;

   // Propuesto
   protected exportPreamble(clippings: Clipping[], options: ExporterOptions): Promise<void>;
   ```

2. **Stateless Refactoring (JoplinExporter):**
   - Eliminar `this.rootNotebookId`, `this.tagMap`
   - Usar objeto `ExportContext` efimero

3. **Migracion a Templates (Joplin):**
   - Mover generacion del cuerpo de nota a plantilla `CLIPPING_JOPLIN`

4. **Optimizacion de Memoria:**
   - `generateSummaryContent()` deberia devolver resumen ligero, no concatenar todo

---

### 1.4 Mejorar Parser CSV

**Ubicacion:** `src/importers/formats/csv.importer.ts`

**Mejoras:**
- Validacion de conteo de campos por fila
- Considerar migracion a `papaparse` o `csv-parse/sync`
- Mejores mensajes de error con numero de linea

**Implementacion con papaparse:**
```typescript
import Papa from 'papaparse';

const result = Papa.parse(content, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim().toLowerCase(),
});

if (result.errors.length > 0) {
  return err({
    code: 'IMPORT_PARSE_ERROR',
    message: `CSV parse errors at rows: ${result.errors.map(e => e.row).join(', ')}`
  });
}
```

---

### 1.5 Dynamic Path Templating

**Ubicacion:** `src/exporters/shared/exporter-utils.ts`

**Propuesta:** Reemplazar enums de `FolderStructure` con template strings:

```typescript
interface PathData {
  title: string;
  author: string;
  year?: string;
  series?: string;
}

// Uso: --path-format="{author}/{year} - {title}.md"
export function generatePath(template: string, data: PathData): string {
  return template.replace(/{(\w+)}/g, (_, key) =>
    sanitizeFilename(data[key as keyof PathData] ?? 'unknown')
  );
}
```

---

### 1.6 Mejorar Contexto de Errores en Importers

**Mejoras:**
- Incluir numero de fila en mensajes de error
- Acumular todos los errores antes de retornar
- Sugerencias para errores comunes

```typescript
interface ImportError {
  row: number;
  field: string;
  message: string;
  suggestion?: string;
}

// Ejemplo de mensaje mejorado
{
  code: 'IMPORT_VALIDATION_ERROR',
  message: 'Found 3 invalid rows',
  errors: [
    { row: 5, field: 'date', message: 'Invalid date format', suggestion: 'Use ISO 8601: YYYY-MM-DD' },
    { row: 12, field: 'type', message: 'Unknown type "hightlight"', suggestion: 'Did you mean "highlight"?' }
  ]
}
```

---

### 1.7 TypeDoc API Documentation

**Instalacion:**
```bash
pnpm add -D typedoc typedoc-plugin-markdown
```

**Configuracion (typedoc.json):**
```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "excludePrivate": true,
  "excludeInternal": true
}
```

**Script:** Agregar a package.json:
```json
"docs:api": "typedoc"
```

---

### 1.8 Automated Release Pipeline

**Opcion A - Changesets (ya instalado):**
```bash
pnpm changeset        # Crear changeset
pnpm version          # Actualizar versiones
pnpm release          # Publicar
```

**GitHub Action (.github/workflows/release.yml):**
```yaml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: pnpm changeset publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

### 1.9 Merged Output Mode

**Propuesta:** Opcion para embeber notas en highlights:

```typescript
export interface ProcessOptions {
  mergedOutput?: boolean;  // default: false
}

// Resultado cuando mergedOutput: true
{
  type: "highlight",
  content: "The quote text",
  note: "My thoughts on this",  // Embebido
  tags: ["review", "important"]
}
```

---

## 2. Baja Prioridad

### 2.1 Renombrar `process` a `processClippings`

**Ubicacion:** `src/core/processor.ts`, `src/index.ts`

**Implementacion:**
```typescript
export function processClippings(clippings: Clipping[], options?: ProcessOptions): ProcessResult {
  // ...
}

// Alias para backward compatibility
export { processClippings as process };
```

---

### 2.2 Refactorizar Archivos Largos

| Archivo | Lineas | Accion |
|---------|--------|--------|
| `joplin.exporter.ts` | ~550 | Extraer `JoplinNotebookBuilder`, `JoplinTagManager` |
| `html.exporter.ts` | ~547 | Mover CSS a `html-styles.ts` |
| `registry.ts` | ~474 | Extraer `PluginValidator` |
| `presets.ts` | ~473 | Separar en `presets/*.ts` por categoria |

---

### 2.3 TemplateEngine Cache

**Ubicacion:** `src/templates/engine.ts`

**Implementacion:**
```typescript
export class TemplateEngineFactory {
  private static instances = new Map<string, TemplateEngine>();

  static getEngine(preset: TemplatePreset | CustomTemplates): TemplateEngine {
    const key = JSON.stringify(preset);
    if (!this.instances.has(key)) {
      this.instances.set(key, new TemplateEngine(preset));
    }
    return this.instances.get(key)!;
  }

  static clearCache(): void {
    this.instances.clear();
  }
}
```

---

### 2.4 Browser Entry Point

**Agregar a package.json:**
```json
{
  "browser": "./dist/browser.js",
  "exports": {
    ".": {
      "browser": "./dist/browser.js",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

**Crear `src/browser.ts`:** Re-exportar todo excepto `parseFile` y dependencias de `node:fs`.

---

### 2.5 Monorepo Structure (Futuro)

```
kindle-tools-ts/
├── packages/
│   ├── core/       # Logica pura, sin deps de Node
│   ├── node/       # Node.js adapters (fs)
│   └── shared/     # Tipos compartidos
├── pnpm-workspace.yaml
└── turbo.json
```

---

### 2.6 Unified Archiver Interface

**Ubicacion:** Crear `src/utils/archive/archiver.ts`

```typescript
export interface Archiver {
  addFile(path: string, content: string | Uint8Array): void;
  addDirectory(path: string): void;
  finalize(): Promise<Uint8Array>;
}

export class ZipArchiver implements Archiver { /* ... */ }
export class TarArchiver implements Archiver { /* ... */ }
```

---

### 2.7 Structured Logging Expansion

**Ubicacion:** `src/errors/logger.ts`

```typescript
export interface Logger {
  debug: (msg: string, ctx?: object) => void;
  info: (msg: string, ctx?: object) => void;
  warn: (entry: ErrorLogEntry) => void;
  error: (entry: ErrorLogEntry) => void;
}
```

---

### 2.8 Performance Benchmarking

**Ubicacion:** Crear `tests/bench/parser.bench.ts`

```typescript
import { bench, describe } from 'vitest';
import { parse } from '../../src/importers/formats/txt/parser.js';
import { generateLargeFile } from '../stress/generators.js';

describe('Parser Performance', () => {
  bench('parse 10,000 clippings', () => {
    parse(generateLargeFile(10000));
  });

  bench('parse 50,000 clippings', () => {
    parse(generateLargeFile(50000));
  });
});
```

**Script:** `"bench": "vitest bench"`

---

### 2.9 VitePress Documentation Site

```bash
pnpm add -D vitepress
```

**Estructura:**
```
docs/
├── .vitepress/config.ts
├── guide/
│   ├── getting-started.md
│   └── api-usage.md
└── recipes/
    ├── obsidian-workflow.md
    └── joplin-setup.md
```

---

### 2.10 Architecture Decision Records

**Ubicacion:** `docs/adr/`

```
docs/adr/
├── 0001-use-native-node-subpath-imports.md
├── 0002-dual-esm-cjs-publishing.md
├── 0003-clean-architecture-structure.md
└── 0004-neverthrow-for-error-handling.md
```

**Template:**
```markdown
# ADR-XXXX: Title

## Status
Accepted | Deprecated | Superseded

## Context
What is the issue?

## Decision
What was decided?

## Consequences
What are the results?
```

---

### 2.11 Consolidar Test Fixtures

**Estructura propuesta:**
```
tests/fixtures/
├── clippings/
│   ├── standard.txt
│   ├── multilang.txt
│   └── edge-cases.txt
├── config/
│   └── sample.kindletoolsrc.json
└── expected-output/
    └── standard.output.json
```

---

### 2.12 Plugin Instance Reset

**Ubicacion:** `src/plugins/registry.ts`

```typescript
class PluginRegistry {
  resetPluginInstance(name: string): void {
    const plugin = this.exporters.get(name) || this.importers.get(name);
    if (plugin) {
      plugin._instance = undefined;
    }
  }
}
```

---

### 2.13 Plugin Runtime Validation

**Ubicacion:** `src/plugins/adapters.ts`

```typescript
function validateExporterInstance(instance: unknown): instance is Exporter {
  return (
    typeof instance === 'object' &&
    instance !== null &&
    typeof (instance as Exporter).export === 'function'
  );
}

// Uso
const instance = plugin.create();
if (!validateExporterInstance(instance)) {
  throw new AppException({
    code: 'PLUGIN_INVALID_INSTANCE',
    message: `Plugin ${plugin.name} did not return a valid Exporter`
  });
}
```

---

### 2.14 Minor Code Improvements

| Issue | Ubicacion | Solucion |
|-------|-----------|----------|
| Magic numbers en `identity.ts` | `src/domain/core/identity.ts` | Mover a `constants.ts` |
| Return types implicitos | `src/templates/helpers.ts` | Agregar tipos explicitos |
| Externalize HTML Styles | `html.exporter.ts` | Mover CSS a archivo separado |
| Abstract grouping logic | `BaseExporter` | Crear helper `exportGroupedFiles(clippings, renderFn)` |

---

## 3. Not Planned

### Descartado Permanentemente

- **PDF Export:** Requiere libreria de renderizado pesada
- **Readwise Sync:** API propietaria
- **Highlight Colors:** Kindle no exporta esta info
- **Streaming Architecture:** Caso de uso muy raro (50MB+)
- **CLI:** Eliminada. Usuarios pueden crear wrappers.

### Baja Prioridad (sin plan concreto)

- **Anki Export:** Ya existe como plugin de ejemplo
- **Notion Integration:** API propietaria
- **Kobo/Apple Books:** Requiere parsers especificos
- **AI Enrichment:** Claude API para tags (fuera de scope)
- **WASM Web App:** Demasiado complejo para el beneficio
- **Mutation Testing (Stryker):** Costoso en CI
- **E2E Testing (Playwright):** Solo para workbench

---

## Referencias

### TypeScript Libraries 2025
- [Building a TypeScript Library in 2025](https://dev.to/arshadyaseen/building-a-typescript-library-in-2025-2h0i)
- [Tutorial: publishing ESM-based npm packages](https://2ality.com/2025/02/typescript-esm-packages.html)
- [TypeScript in 2025 with ESM and CJS](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing)

### Error Handling
- [neverthrow](https://github.com/supermacro/neverthrow)
- [Error Handling Best Practices](https://github.com/supermacro/neverthrow/wiki/Error-Handling-Best-Practices)

### Testing
- [Vitest Best Practices](https://www.projectrules.ai/rules/vitest)
- [fast-check](https://github.com/dubzzz/fast-check)
- [Vitest 4 adoption guide](https://blog.logrocket.com/vitest-adoption-guide/)

### Tooling
- [Biome Configuration](https://biomejs.dev/guides/configure-biome/)

---

*Documento actualizado: 2026-01-14*
*Mejoras pendientes: 23 | Media prioridad: 9 | Baja prioridad: 14*
