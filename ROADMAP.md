# KindleToolsTS - Roadmap

Mejoras pendientes organizadas por prioridad. Cada item incluye valoración de impacto, esfuerzo y riesgo.

**Estado del proyecto:** Librería TypeScript pura + Visual Workbench. Clean Architecture / DDD.

> **Arquitectura documentada en:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Leyenda de Valoración

| Criterio | Descripción |
|----------|-------------|
| **Impacto** | Beneficio para usuarios/DX (🔴 Alto, 🟡 Medio, 🟢 Bajo) |
| **Esfuerzo** | Tiempo/complejidad de implementación (🟢 Bajo, 🟡 Medio, 🔴 Alto) |
| **Riesgo** | Probabilidad de breaking changes o bugs (🟢 Bajo, 🟡 Medio, 🔴 Alto) |
| **ROI** | Relación Impacto/Esfuerzo (⭐⭐⭐ Excelente, ⭐⭐ Bueno, ⭐ Bajo) |

---

## Índice

1. [Media Prioridad](#1-media-prioridad)
2. [Baja Prioridad](#2-baja-prioridad)
3. [Para Estudio](#3-para-estudio)
4. [Not Planned](#4-not-planned)
5. [Completado](#5-completado)

---

## 1. Media Prioridad

### 1.1 Bug Fix: CSV Importer Type Validation

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🔴 Alto | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `src/importers/formats/csv.importer.ts:217`

**Problema:**
El cast `as ClippingType` es inseguro. Permite valores inválidos que causarán errores downstream.

```typescript
// ACTUAL - Inseguro
const type = (data.type || "highlight") as ClippingType;

// SOLUCIÓN
import { closest } from "fastest-levenshtein";

const VALID_TYPES = ["highlight", "note", "bookmark", "clip", "article"] as const;
const rawType = data.type?.toLowerCase() || "highlight";

if (!VALID_TYPES.includes(rawType as typeof VALID_TYPES[number])) {
  errors.push({
    row: rowIdx + 1,
    field: "type",
    message: `Invalid type: "${rawType}"`,
    suggestion: `Did you mean "${closest(rawType, [...VALID_TYPES])}"?`,
  });
  continue;
}
const type = rawType as ClippingType;
```

**Consecuencias de NO hacerlo:** Datos corruptos en exports, errores silenciosos en runtime.

---

### 1.2 Mejorar Parser CSV

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟡 Medio | ⭐⭐ |

**Ubicación:** `src/importers/formats/csv.importer.ts`

**Estado actual:** Parser manual funciona pero es frágil ante edge cases.

**Opciones:**

**Opción A - Migrar a papaparse (~50KB):**
```typescript
import Papa from 'papaparse';

const result = Papa.parse(content, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim().toLowerCase(),
});

if (result.errors.length > 0) {
  return importValidationError(
    "CSV parse errors",
    result.errors.map(e => ({ row: e.row, field: "csv", message: e.message }))
  );
}
```

**Opción B - Mejorar parser actual:**
- Validación de conteo de campos por fila
- Mejor manejo de encoding (UTF-16, etc.)
- Tests exhaustivos de edge cases

**Consecuencias:** Opción A añade dependencia; Opción B requiere más trabajo de testing.

---

### 1.3 TypeDoc API Documentation

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Instalación:**
```bash
pnpm add -D typedoc typedoc-plugin-markdown
```

**Configuración (typedoc.json):**
```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "excludePrivate": true,
  "excludeInternal": true
}
```

**Script en package.json:**
```json
"docs:api": "typedoc"
```

**Consecuencias:** Mejora DX para consumidores. Auto-generado = mantenimiento mínimo.

---

### 1.4 Tests para generatePath

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `tests/unit/exporters/exporter-utils.test.ts`

**Problema:** La función `generatePath` (implementada en 1.5 completado) no tiene tests.

```typescript
describe("generatePath", () => {
  it("replaces placeholders with sanitized values", () => {
    const data = { title: "1984", author: "George Orwell" };
    expect(generatePath("{author}/{title}", data)).toBe("George Orwell/1984");
  });

  it("replaces missing fields with 'unknown'", () => {
    const data = { title: "Book", author: "Author" };
    expect(generatePath("{series}/{title}", data)).toBe("unknown/Book");
  });

  it("sanitizes special characters in values", () => {
    const data = { title: "Test: A Book?", author: "Author" };
    // Depende de implementación de sanitización
    expect(generatePath("{title}", data)).toMatch(/Test/);
  });

  it("handles empty template", () => {
    expect(generatePath("", { title: "Book", author: "Author" })).toBe("");
  });
});
```

**Consecuencias:** Previene regresiones. Documenta comportamiento esperado.

---

## 2. Baja Prioridad

### 2.1 Refactorizar Archivos Largos

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟡 Medio | 🟡 Medio | ⭐ |

**Archivos pendientes (líneas actuales):**

| Archivo | Líneas | Acción Propuesta |
|---------|--------|------------------|
| `registry.ts` | 597 | Ver sección 3.1 (Plugin Registry Split) |
| `presets.ts` | 518 | Separar en `presets/markdown.ts`, `presets/joplin.ts`, etc. |
| `joplin.exporter.ts` | 510 | Extraer `JoplinNotebookBuilder`, `JoplinTagManager` |

**Nota:** `html.exporter.ts` ya tiene CSS externalizado en `html.styles.ts` ✅

**Consecuencias:** Mejora mantenibilidad a costa de riesgo durante refactor.

---

### 2.2 Browser Entry Point

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟡 Medio | ⭐⭐ |

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

**Crear `src/browser.ts`:**
```typescript
// Re-exportar todo excepto dependencias de node:fs
export * from "./index.js";
// Excluir: parseFile, NodeFilesystem
```

**Consecuencias:** Habilita uso en web apps. Requiere mantener dos entry points.

---

### 2.3 Monorepo Structure (Futuro)

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🔴 Alto | 🔴 Alto | ⭐ |

```
kindle-tools-ts/
├── packages/
│   ├── core/       # Lógica pura, sin deps de Node
│   ├── node/       # Node.js adapters (fs)
│   └── shared/     # Tipos compartidos
├── pnpm-workspace.yaml
└── turbo.json
```

**Consecuencias:** Breaking change significativo. Solo justificado con demanda real de uso browser.

---

### 2.4 Performance Benchmarking

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `tests/bench/parser.bench.ts`

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

**Consecuencias:** Detecta regresiones de rendimiento. Útil antes de releases.

---

### 2.5 VitePress Documentation Site

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟢 Bajo | ⭐⭐ |

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

**Consecuencias:** Mejora adopción. Requiere mantenimiento de contenido.

---

### 2.6 Architecture Decision Records

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `docs/adr/`

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

**Consecuencias:** Documenta decisiones para nuevos contribuidores.

---

### 2.7 Consolidar Test Fixtures

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

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

**Consecuencias:** Reduce duplicación. Facilita añadir casos de prueba.

---

## 3. Para Estudio

### 3.1 Plugin Registry Split

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟡 Medio | ⭐⭐ |

**Ubicación:** `src/plugins/registry.ts` (597 líneas)

**Problema:** Viola SRP mezclando validación, estado, eventos y factory.

**Solución propuesta:**
```
src/plugins/
├── validation/
│   ├── schema.ts      # validateImporterPlugin, validateExporterPlugin
│   └── runtime.ts     # validateImporterInstance, validateExporterInstance
├── store.ts           # Gestión del Map interno
└── registry.ts        # Fachada coordinadora (~150 líneas)
```

**Consecuencias:** Mejor testabilidad y mantenibilidad. Riesgo durante refactor.

---

### 3.2 Web Crypto API para Browsers

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟡 Medio | ⭐⭐ |

**Ubicación:** `src/utils/security/hashing.ts`

**Propuesta:** SHA-256 real en navegadores:

```typescript
export async function sha256Async(input: string): Promise<string> {
  // 1. Node.js crypto
  const nodeCrypto = getNodeCrypto();
  if (nodeCrypto) {
    return nodeCrypto.createHash("sha256").update(input, "utf8").digest("hex");
  }

  // 2. Web Crypto API
  if (typeof globalThis.crypto?.subtle !== "undefined") {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // 3. Fallback
  return simpleHash(input);
}
```

**Consecuencias:** Requiere cambio a async en toda la cadena. Solo útil con uso browser real.

---

### 3.3 Estandarizar JsonImporter

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `src/importers/formats/json.importer.ts`

**Problema:** Usa "Fail Fast" mientras CSV acumula errores (inconsistencia).

**Solución:**
- Migrar a validación item-por-item
- Usar `importValidationError` para reporte granular
- Añadir sugerencias con `fastest-levenshtein` (ya instalado)

**Consecuencias:** Consistencia con CsvImporter. Mejor UX en errores.

---

### 3.4 Límites de Seguridad de Memoria

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `src/importers/`

```typescript
const MAX_VALIDATION_ERRORS = 100;

// En el loop de validación:
if (errors.length >= MAX_VALIDATION_ERRORS) {
  errors.push({
    row: -1,
    field: "file",
    message: `Stopped after ${MAX_VALIDATION_ERRORS} errors. File may be corrupted.`,
  });
  break;
}
```

**Consecuencias:** Previene OOM en archivos masivos corruptos.

---

### 3.5 Hook de Cleanup en MultiFileExporter

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `src/exporters/shared/multi-file-exporter.ts`

```typescript
// En MultiFileExporter
protected async exportCleanup(): Promise<void> {}

// En doExport(), al final:
await this.exportCleanup();

// En JoplinExporter
protected override async exportCleanup(): Promise<void> {
  this.ctx = null;
}
```

**Consecuencias:** Liberación explícita de memoria. Patrón más defensivo.

---

### 3.6 Lazy Template Compilation

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟡 Medio | 🟡 Medio | ⭐ |

**Ubicación:** `src/templates/engine.ts`

**Propuesta:** Retrasar compilación Handlebars hasta primer uso usando Proxy.

**Consecuencias:** Complejidad añadida. Solo útil si hay muchos templates no usados.

---

### 3.7 Logging Improvements

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Propuestas:**

1. **Instrumentación Core:**
   ```typescript
   // En importers
   logDebug("Parsing CSV", { rows: rows.length });

   // En processor
   logInfo("Processing complete", {
     duplicatesRemoved,
     mergedHighlights
   });
   ```

2. **Configuración en `kindletoolsrc`:**
   ```json
   { "logging": { "level": "debug", "format": "json" } }
   ```

3. **Utility `measureTime`:**
   ```typescript
   async function measureTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
     const start = performance.now();
     const result = await fn();
     logDebug(`${name} completed`, { durationMs: performance.now() - start });
     return result;
   }
   ```

4. **Sanitización:** Solo metadatos en logs, nunca contenido de usuario.

---

### 3.8 Mejoras en Archiver Interface

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟡 Medio | 🟡 Medio | ⭐ |

**Ubicación:** `src/utils/archive/`

1. **Streaming:** `generateNodeStream` para exports masivos
2. **Compresión:** Soporte `STORE` vs `DEFLATE`
3. **TarArchiver real:** Headers POSIX standard
4. **Metadatos:** Fecha de modificación en `addFile`

**Consecuencias:** Solo útil para exports muy grandes (>100MB).

---

### 3.9 Plugin System Improvements

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `src/plugins/`

1. **Optimización `resetPluginInstance`:**
   ```typescript
   const uniqueEntries = new Set(this.importers.values());
   for (const entry of uniqueEntries) { /* ... */ }
   ```

2. **Documentar restricción:** `create()` debe ser síncrono y ligero.

---

### 3.10 Tests: Cobertura en Importers

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `tests/unit/importers/importers.test.ts`

**Casos faltantes:**
1. `IMPORT_VALIDATION_ERROR` con múltiples errores
2. Sugerencias de typos funcionando (`hightlight` → `highlight`)
3. Acumulación de errores en múltiples filas
4. Límite de errores (si se implementa 3.4)

---

### 3.11 Validación de Path Templates

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `src/exporters/shared/exporter-utils.ts`

```typescript
export function validatePathTemplate(
  template: string,
  knownFields = ["title", "author", "year", "series"]
): string[] {
  const warnings: string[] = [];
  const placeholders = template.match(/{(\w+)}/g) || [];
  for (const ph of placeholders) {
    const field = ph.slice(1, -1);
    if (!knownFields.includes(field)) {
      warnings.push(`Unknown placeholder: ${ph}`);
    }
  }
  return warnings;
}
```

**Consecuencias:** Detecta typos como `{autor}` vs `{author}`.

---

## 4. Not Planned

### Descartado Permanentemente

| Item | Razón |
|------|-------|
| PDF Export | Requiere librería de renderizado pesada |
| Readwise Sync | API propietaria |
| Highlight Colors | Kindle no exporta esta info |
| Streaming Architecture | Caso de uso muy raro (50MB+) |
| CLI | Eliminada. Usuarios pueden crear wrappers |
| Pipeline Pattern en Processor | `processor.ts` (~200 ln) ya delega correctamente. Sería over-engineering |

### Sin Plan Concreto

- **Anki Export:** Ya existe como plugin de ejemplo
- **Notion Integration:** API propietaria
- **Kobo/Apple Books:** Requiere parsers específicos
- **AI Enrichment:** Claude API para tags (fuera de scope)
- **WASM Web App:** Complejidad vs beneficio bajo
- **Mutation Testing (Stryker):** Costoso en CI
- **E2E Testing (Playwright):** Solo para workbench

---

## 5. Completado

Historial de mejoras implementadas.

### Media Prioridad

| Descripción | Detalles |
|-------------|----------|
| **Carga Dinámica Locales date-fns** | `LOCALE_LOADERS` con imports dinámicos + cache en `dates.ts` |
| **Eliminar `any` en Detección Entorno** | Type guards en `hashing.ts` |
| **Mejoras MultiFileExporter** | Stateless, `exportPreamble(clippings)`, templates Joplin |
| **Dynamic Path Templating** | `generatePath()`, `PATH_TEMPLATES` en `exporter-utils.ts` |
| **Contexto Errores Importers** | `ImportErrorDetail`, `importValidationError()` |
| **Automated Release Pipeline** | `.github/workflows/release.yml` con changesets |
| **Merged Output Mode** | `mergedOutput`, `removeUnlinkedNotes` en `ProcessOptions` |

### Baja Prioridad

| Descripción | Detalles |
|-------------|----------|
| **Renombrar process** | `processClippings()` |
| **TemplateEngine Cache** | `TemplateEngineFactory` con prefijos `preset:`/`custom:` |
| **Unified Archiver Interface** | `Archiver`, `ZipArchiver`, `TarArchiver` |
| **Structured Logging** | `Logger` con `debug`, `info`, `warn`, `error` |
| **Plugin Instance Reset** | `resetPluginInstance()` |
| **Plugin Runtime Validation** | `validateExporterInstance()`, `validateImporterInstance()` |
| **Minor Code Improvements** | Constants, tipos explícitos, `html.styles.ts`, `isolatedDeclarations` |

### Property-Based Testing

Ya existe en `tests/stress/parser.properties.test.ts` usando `fast-check`:
- Invariante: Parser nunca crashea con input arbitrario
- Oracle: Bloques válidos construidos se parsean correctamente

---

## Referencias

### TypeScript Libraries 2025
- [Building a TypeScript Library in 2025](https://dev.to/arshadyaseen/building-a-typescript-library-in-2025-2h0i)
- [Tutorial: publishing ESM-based npm packages](https://2ality.com/2025/02/typescript-esm-packages.html)

### Error Handling
- [neverthrow](https://github.com/supermacro/neverthrow)

### Testing
- [Vitest Best Practices](https://www.projectrules.ai/rules/vitest)
- [fast-check](https://github.com/dubzzz/fast-check)

### Tooling
- [Biome Configuration](https://biomejs.dev/guides/configure-biome/)

---

## Resumen de Prioridades

| Prioridad | Total | ROI Alto (⭐⭐⭐) |
|-----------|-------|------------------|
| Media | 4 | 3 (1.1, 1.3, 1.4) |
| Baja | 7 | 2 (2.4, 2.6) |
| Para Estudio | 11 | 4 (3.3, 3.4, 3.7, 3.10) |

### Orden de Ejecución Recomendado

1. **Urgente:** 1.1 Bug Fix CSV Type Validation
2. **Quick Wins (bajo esfuerzo, alto ROI):** 1.3, 1.4, 3.3, 3.4, 3.7, 3.10
3. **Cuando haya tiempo:** 1.2, 2.1-2.7
4. **Investigar primero:** 3.1, 3.2, 3.5-3.9, 3.11

---

*Documento actualizado: 2026-01-15*
*Mejoras pendientes: 22 | Media: 4 | Baja: 7 | Estudio: 11*
