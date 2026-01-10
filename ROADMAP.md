# KindleToolsTS - Roadmap

Documento consolidado con todas las mejoras pendientes, organizadas por prioridad.

**Estado del proyecto:** Clean Architecture / DDD con toolchain moderno (Biome 2.3+, Vitest 4+, tsup, Turborepo).

---

## Indice

1. [Mejoras Alta Prioridad](#1-mejoras-alta-prioridad)
2. [Mejoras Media Prioridad](#2-mejoras-media-prioridad)
3. [Mejoras Baja Prioridad](#3-mejoras-baja-prioridad)
4. [Not Planned](#4-not-planned)

---

## 1. Mejoras Alta Prioridad

### 1.1 Migrar CLI a citty

**Prioridad:** ALTA | **Esfuerzo:** Medio | **Estado:** NOT-PLANNED

La CLI actual implementa parsing manual de argumentos. Migrar a [citty](https://github.com/unjs/citty) proporcionaria:
- Definicion de comandos mas limpia
- Generacion automatica de help
- Manejo de errores integrado
- Parsing de argumentos type-safe

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

### 1.2 Snyk - Escaneo de Dependencias

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** NOT-PLANNED

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

### 1.3 ESLint Plugin para Neverthrow

**Prioridad:** ALTA | **Esfuerzo:** Bajo

Actualmente hay usos de `_unsafeUnwrap()` en el codigo (ej: `src/importers/shared/base-importer.ts`). Instalar [eslint-plugin-neverthrow](https://github.com/mdbetancourt/eslint-plugin-neverthrow) para:
- Forzar manejo explicito de errores
- Detectar unwraps inseguros
- Asegurar que los Result se consuman correctamente

```bash
pnpm add -D eslint-plugin-neverthrow
```

---

### 1.4 Consolidar Logica de Fechas

**Prioridad:** ALTA | **Esfuerzo:** Bajo

Actualmente la logica de fechas esta dividida entre:
- `src/domain/dates.ts` - Parsing con soporte multi-idioma
- `src/utils/system/dates.ts` - Utilidades de formateo

**Accion:** Unificar en `src/utils/system/dates.ts` y que domain importe de ahi.

---

### 1.5 Extraer Constantes CLI

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** NOT-PLANNED

Mover constantes hardcodeadas de `src/cli/index.ts` a archivos separados:
- Colores ANSI (lineas 84-105) -> `src/cli/colors.ts`
- Version CLI -> Leer de package.json
- Strings de ayuda -> `src/cli/help-text.ts`

---

### 1.6 Crear Constantes de Limites de Archivo

**Prioridad:** ALTA | **Esfuerzo:** Bajo

Crear `src/constants/file-thresholds.ts`:

```typescript
export const FILE_THRESHOLDS = {
  /** Files larger than this trigger streaming mode */
  LARGE_FILE_MB: 50,
  /** Chunk size for streaming operations */
  STREAM_CHUNK_SIZE: 64 * 1024, // 64KB
  /** Max filename length for exports */
  MAX_FILENAME_LENGTH: 100,
  /** Max history entries */
  HISTORY_MAX_ENTRIES: 1000,
} as const;
```

---

### 1.7 Limpiar Artefactos de Debug en GUI

**Prioridad:** ALTA (BLOQUEANTE) | **Esfuerzo:** Bajo

Eliminar 10 statements de `console.log/error` en `src/gui/main.ts`:
- Lineas 301, 302: `console.log("Parse result:", ...)` - debug de parsing
- Linea 311: `console.error("Parse error:", ...)` - error handling
- Lineas 636, 707, 751, 802, 942: `console.error` en exports
- Linea 1090: `console.log("initialized")` - startup debug

**Accion:** Eliminar todos o reemplazar con sistema de logging condicional (ej: `if (DEBUG) console.log(...)`).

---

### 1.8 Corregir XSS Potencial en GUI

**Prioridad:** ALTA (BLOQUEANTE) | **Esfuerzo:** Bajo

En `src/gui/main.ts:521`, `c.location.raw` se interpola sin escape:

```typescript
// ANTES (vulnerable)
<td>${c.location.raw}</td>

// DESPUES (seguro)
<td>${escapeHtml(c.location.raw)}</td>
```

Aunque los datos vienen de archivos locales del usuario, es buena practica escapar todo contenido dinamico para prevenir XSS.

---

### 1.9 Proteccion Path Traversal en Exports

**Prioridad:** ALTA | **Esfuerzo:** Bajo

En `src/exporters/shared/exporter-utils.ts:194-221`, la funcion `generateFilePath` no valida path traversal:

```typescript
// Si author = "../../../etc" podria escapar del directorio
return `${prefix}${cleanAuthor}/${cleanTitle}${ext}`;
```

**Solucion:**
```typescript
import path from 'node:path';

function generateFilePath(...): string {
  const result = `${prefix}${cleanAuthor}/${cleanTitle}${ext}`;
  // Normalizar y validar que no escape del base
  const normalized = path.normalize(result);
  if (normalized.startsWith('..')) {
    throw new Error('Path traversal detected');
  }
  return normalized;
}
```

---

### 1.10 Usar Tipos de Error Custom en Lugar de throw Error()

**Prioridad:** ALTA | **Esfuerzo:** Bajo

9 lugares usan `throw new Error()` generico en lugar de los tipos de error del proyecto:

| Archivo | Lineas | Contexto |
|---------|--------|----------|
| `src/cli/index.ts` | 352, 358, 551 | Error de usuario |
| `src/config/loader.ts` | 114 | Config invalida |
| `src/plugins/registry.ts` | 167, 185, 272, 289 | Plugin invalido |
| `src/schemas/cli.schema.ts` | 135 | Args invalidos |

**Accion:** Reemplazar con tipos de `src/errors/types.ts` o retornar `Result<T, E>`.

---

### 1.11 Tests para Archivos con 0% Coverage

**Prioridad:** ALTA | **Esfuerzo:** Medio

Archivos criticos sin tests (0% coverage):

| Archivo | Lineas | Funcionalidad |
|---------|--------|---------------|
| `src/utils/fs/tar.ts` | ~100 | Creacion de archivos TAR |
| `src/utils/fs/zip.ts` | ~80 | Creacion de archivos ZIP |
| `src/utils/text/encoding.ts` | ~50 | Deteccion de BOM/encoding |
| `src/plugins/discovery.ts` | ~200 | Carga dinamica de plugins |
| `src/errors/logger.ts` | ~80 | Logging estructurado |
| `src/core/processing/tag-processor.ts` | ~60 | Extraccion de tags |

**Coverage actual:** 74.93% statements, 63.39% branches (umbral: 80%)

---

## 2. Mejoras Media Prioridad

### 2.1 SonarQube - Analisis Estatico

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** NOT-PLANNED

```properties
# sonar-project.properties
sonar.projectKey=kindle-tools-ts
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

---

### 2.2 FileSystem Abstraction (Ports & Adapters)

**Prioridad:** MEDIA | **Esfuerzo:** Alto

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

### 2.3 Config File Support (.kindletoolsrc)

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Ya esta parcialmente implementado con cosmiconfig. Mejoras adicionales:
- Soporte para `.kindletoolsrc.toml` (formato moderno)
- Validacion de errores con sugerencias ("Did you mean 'folderStructure'?")
- Expansion de variables de entorno en config

```json
{
  "format": "obsidian",
  "folderStructure": "by-author",
  "extractTags": true,
  "tagCase": "lowercase"
}
```

---

### 2.4 Consolidar Exportadores Multi-Archivo

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Crear una clase base `MultiFileExporter` para Obsidian, Markdown y Joplin que:
- Unifique la logica de estructura de carpetas
- Reduzca codigo duplicado en generacion de paths
- Centralice el manejo de templates

---

### 2.5 Mejorar Robustez del Parser CSV

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

El parser CSV custom en `csv.importer.ts` funciona pero podria mejorar:
- Validacion de conteo de campos
- Considerar migracion a `papaparse` o `csv-parse/sync`
- Mejores mensajes de error para CSV malformados

---

### 2.6 Dynamic Path Templating

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Reemplazar enums rigidos de `FolderStructure` con template strings:

```typescript
// --path-format="{author}/{series}/{year} - {title}.md"
export function generatePath(template: string, data: PathData): string {
  return template.replace(/{(\w+)}/g, (_, key) =>
    sanitizeFilename(data[key] ?? 'unknown')
  );
}
```

---

### 2.7 OS-Safe Filename Sanitization

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

Mejorar el sanitizador actual para manejar nombres reservados de Windows:

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

### 2.8 Property-Based Testing (fast-check)

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

### 2.9 Real-World Stress Testing

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Suite de tests con archivos "feos": idiomas mezclados, formatos legacy, separadores malformados.

---

### 2.10 TypeDoc API Documentation

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

### 2.11 Automated Release Pipeline

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

Usar `semantic-release` o `changesets` para versionado automatico y generacion de changelog.

---

### 2.12 Mejorar Contexto de Errores en Importers

**Prioridad:** MEDIA | **Esfuerzo:** Medio

Cuando los importers fallan en filas especificas:
- Incluir numero de fila en mensajes de error
- Acumular todos los errores de validacion antes de retornar
- Proveer sugerencias para corregir errores comunes

---

### 2.13 Coverage Thresholds por Glob Pattern

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

Aprovechar la caracteristica de Vitest para thresholds por patron:

```typescript
coverage: {
  thresholds: {
    // Global
    lines: 80,
    // Critico: 95%
    'src/core/**.ts': { lines: 95, functions: 95 },
    'src/errors/**.ts': { lines: 95, functions: 95 },
    // Utils: 85%
    'src/utils/**.ts': { lines: 85 },
  }
}
```

---

### 2.14 Merged Output Mode

**Prioridad:** MEDIA | **Esfuerzo:** Bajo

```typescript
export interface ProcessOptions {
  mergedOutput?: boolean;
}

// Result: highlights con notas embebidas
{ type: "highlight", content: "Quote", note: "My thoughts", tags: ["review"] }
```

---

## 3. Mejoras Baja Prioridad

### 3.1 Browser Entry Point

**Prioridad:** BAJA | **Esfuerzo:** Medio

Agregar campo `"browser"` en `package.json` apuntando a bundle sin dependencias de `fs`.

---

### 3.2 Monorepo Structure (pnpm workspaces)

**Prioridad:** BAJA | **Esfuerzo:** Alto

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

### 3.3 Unified Archiver Interface

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

### 3.4 Structured Logging

**Prioridad:** BAJA | **Esfuerzo:** Bajo

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

### 3.5 Centralized Options Definition (SSOT)

**Prioridad:** BAJA | **Esfuerzo:** Medio

Crear `src/core/options.def.ts` para definir opciones CLI y GUI programaticamente.

---

### 3.6 Stress Testing / Performance Benchmarking

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

### 3.7 Minor Code Improvements

| Issue | Solution |
|-------|----------|
| Magic numbers en `identity.ts` | Mover a `constants.ts` |
| Instancia Handlebars no cacheada | Agregar patron singleton |
| Inconsistencia en nombres `process` | Renombrar a `processClippings` |
| Factory crea nuevas instancias | Cachear instancias stateless |

---

### 3.8 Abstract Grouping Logic in BaseExporter

**Prioridad:** BAJA | **Esfuerzo:** Bajo

Crear helper `exportGroupedFiles(clippings, renderFn)`.

---

### 3.9 Externalize HTML Styles

**Prioridad:** BAJA | **Esfuerzo:** Bajo

Mover CSS de `HtmlExporter` a archivo separado.

---

### 3.10 VitePress Documentation Site

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

### 3.11 Architecture Decision Records (ADR)

**Prioridad:** BAJA | **Esfuerzo:** Bajo

```
docs/adr/
  0001-use-native-node-subpath-imports.md
  0002-dual-esm-cjs-publishing.md
  0003-clean-architecture-structure.md
```

---

## 4. Not Planned

Las siguientes mejoras no estan planificadas en el corto/medio plazo debido a su complejidad o valor limitado:

### Arquitectura

- **Streaming Architecture**: Archivos de 50MB+ pueden causar OOM, pero es un caso de uso muy raro para este tipo de herramienta.

### CLI y GUI

- **CLI & GUI Parity**: Flags adicionales como `--exclude-types`, `--min-length`, `--filter-books`
- **Interactive CLI Mode**: Modo interactivo con @clack/prompts

### Exporters

- **Anki Export (.apkg)**: Ya existe como plugin de ejemplo, no como formato core
- **Notion Integration**: API propietaria, ecosistema cerrado
- **Direct Joplin Sync**: Usar Web Clipper API directamente

### GUI Improvements

- **Sort/Order**: Agregar `sortBy` y `sortOrder` al state
- **Copy to Clipboard**: `navigator.clipboard.writeText()`
- **Date Range Filter**: Filtrar por `clip.date`
- **Multi-Book Selection**: Checkboxes en lugar de dropdown
- **Statistics Charts**: Chart.js con datos de `calculateStats()`
- **Batch Processing**: Aceptar multiples archivos
- **Similarity Threshold**: Slider 0-100 para fuzzy matching
- **Theme Toggle**: CSS variables + localStorage
- **Keyboard Shortcuts**: Hook `useHotkeys`
- **PWA Support**: Service Worker + manifest.json

### Integraciones

- **Metadata Enrichment (Book Covers)**: Google Books API para portadas
- **Watch Mode (Auto-Sync)**: chokidar para sincronizar automaticamente
- **Kobo / Apple Books Support**: Parsers para Kobo (SQLite) y Apple Books

### Funcionalidades Avanzadas

- **AI Enrichment (Tagging/Summarization)**: Claude API para sugerir tags
- **Incremental Exports (Diff Mode)**: Solo exportar clippings nuevos
- **Reading Habits Visualization ("Spotify Wrapped")**: Graficos de habitos de lectura
- **WASM & Serverless Web App**: Tool 100% client-side en GitHub Pages

### Testing

- **E2E Testing con Playwright (GUI)**: Tests end-to-end para la GUI

### Permanentemente Descartados

- **PDF Export**: Requeriria libreria de renderizado PDF
- **Readwise Sync**: API propietaria, ecosistema cerrado
- **Highlight Colors**: Kindle no exporta esta informacion

---

## Matriz de Prioridades

| Mejora | Impacto | Esfuerzo | Estado |
|--------|---------|----------|--------|
| **BLOQUEANTES PRODUCCION** |  |  |  |
| Limpiar console.log GUI | Alto | Bajo | **Pendiente** |
| Corregir XSS GUI | Alto | Bajo | **Pendiente** |
| Path Traversal Protection | Alto | Bajo | **Pendiente** |
| **ALTA PRIORIDAD** |  |  |  |
| ESLint Neverthrow | Alto | Bajo | Pendiente |
| Tests 0% Coverage | Alto | Medio | Pendiente |
| Usar Error Types Custom | Alto | Bajo | Pendiente |
| Consolidar Fechas | Alto | Bajo | Pendiente |
| Constantes Limites Archivo | Alto | Bajo | Pendiente |
| **MEDIA PRIORIDAD** |  |  |  |
| Config File Improvements | Medio | Medio | Backlog |
| FileSystem Abstraction | Medio | Alto | Backlog |
| Multi-File Exporter Base | Medio | Medio | Backlog |
| Property-Based Testing | Medio | Medio | Backlog |
| Coverage por Glob | Medio | Bajo | Backlog |
| TypeDoc | Medio | Bajo | Backlog |
| **BAJA PRIORIDAD** |  |  |  |
| Monorepo Structure | Bajo | Alto | Opcional |
| Browser Entry Point | Bajo | Medio | Opcional |

---

## Referencias

### TypeScript
- [Effective TypeScript Principles 2025](https://www.dennisokeeffe.com/blog/2025-03-16-effective-typescript-principles-in-2025)
- [Building a TypeScript Library in 2025](https://dev.to/arshadyaseen/building-a-typescript-library-in-2025-2h0i)

### Error Handling
- [neverthrow](https://github.com/supermacro/neverthrow)
- [Error Handling Best Practices](https://github.com/supermacro/neverthrow/wiki/Error-Handling-Best-Practices)
- [eslint-plugin-neverthrow](https://github.com/mdbetancourt/eslint-plugin-neverthrow)

### Validation
- [Zod Best Practices 2025](https://javascript.plainenglish.io/9-best-practices-for-using-zod-in-2025-31ee7418062e)
- [Schema Validation with Zod](https://www.turing.com/blog/data-integrity-through-zod-validation)

### Security
- [CSV Injection - OWASP](https://owasp.org/www-community/attacks/CSV_Injection)

### CLI
- [citty](https://github.com/unjs/citty)
- [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)

### Testing
- [Vitest Coverage Configuration](https://vitest.dev/config/coverage)
- [fast-check](https://github.com/dubzzz/fast-check)

### Tooling
- [Biome Configuration](https://biomejs.dev/guides/configure-biome/)
- [Biome vs ESLint 2025](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c)

---

*Documento actualizado: 2026-01-10*
*Mejoras pendientes: 35+ (5 bloqueantes) | Not Planned: 25+*
