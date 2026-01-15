# KindleToolsTS - Roadmap

Mejoras pendientes organizadas por prioridad con valoración de impacto, esfuerzo y riesgo.

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

---

## 1. Media Prioridad

### 1.1 [COMPLETADO] Bug Fix: CSV Importer Type Validation

**Estado:** Completado el 2026-01-15.

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

### 1.2 [COMPLETADO] Límites de Seguridad de Memoria

**Estado:** Completado el 2026-01-15.

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `src/importers/formats/csv.importer.ts`, `src/importers/formats/json.importer.ts`, `src/importers/formats/txt/parser.ts`

**Problema:** Sin límite, un archivo corrupto con miles de errores puede causar OOM.
Se ha implementado un límite de `MAX_VALIDATION_ERRORS = 100` en CSV, JSON y TXT.

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

### 1.3 Mejorar Parser CSV

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
```

**Opción B - Mejorar parser actual:**
- Validación de conteo de campos por fila
- Mejor manejo de encoding (UTF-16, etc.)
- Tests exhaustivos de edge cases

---

### 1.4 TypeDoc API Documentation

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

---

### 1.5 Tests para generatePath y validatePathTemplate

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `tests/unit/exporters/exporter-utils.test.ts`

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
});

// También añadir validatePathTemplate
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

---

## 2. Baja Prioridad

### 2.1 Refactorizar Archivos Largos

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟡 Medio | 🟡 Medio | ⭐ |

**Archivos pendientes (líneas actuales):**

| Archivo | Líneas | Acción Propuesta |
|---------|--------|------------------|
| `registry.ts` | 597 | Extraer validación a módulos separados |
| `presets.ts` | 518 | Separar en `presets/markdown.ts`, `presets/joplin.ts`, etc. |
| `joplin.exporter.ts` | 510 | Extraer `JoplinNotebookBuilder`, `JoplinTagManager` |

---

### 2.2 Estandarizar JsonImporter

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `src/importers/formats/json.importer.ts`

**Problema:** Usa "Fail Fast" mientras CSV acumula errores (inconsistencia).

**Solución:**
- Migrar a validación item-por-item
- Usar `importValidationError` para reporte granular
- Añadir sugerencias con `fastest-levenshtein` (ya instalado)

---

### 2.3 Tests: Cobertura en Importers

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `tests/unit/importers/importers.test.ts`

**Casos faltantes:**
1. `IMPORT_VALIDATION_ERROR` con múltiples errores
2. Sugerencias de typos funcionando (`hightlight` → `highlight`)
3. Acumulación de errores en múltiples filas
4. Límite de errores (si se implementa 1.2)

---

### 2.4 [COMPLETADO] Logging Improvements

**Estado:** Completado el 2026-01-15.

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Propuestas:**

1. **Instrumentación Core:**
   ```typescript
   // En importers
   logDebug("Parsing CSV", { rows: rows.length });

   // En processor
   logInfo("Processing complete", { duplicatesRemoved, mergedHighlights });
   ```

2. **Utility `measureTime`:**
   ```typescript
   async function measureTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
     const start = performance.now();
     const result = await fn();
     logDebug(`${name} completed`, { durationMs: performance.now() - start });
     return result;
   }
   ```

3. **Sanitización:** Solo metadatos en logs, nunca contenido de usuario.

---

### 2.5 Browser Entry Point

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

---

### 2.6 Performance Benchmarking

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `tests/bench/parser.bench.ts`

```typescript
import { bench, describe } from 'vitest';

describe('Parser Performance', () => {
  bench('parse 10,000 clippings', () => {
    parse(generateLargeFile(10000));
  });
});
```

---

### 2.7 VitePress Documentation Site

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟢 Bajo | ⭐⭐ |

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

### 2.8 Architecture Decision Records

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

---

### 2.9 Consolidar Test Fixtures

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Estructura propuesta:**
```
tests/fixtures/
├── clippings/
│   ├── standard.txt
│   └── edge-cases.txt
└── expected-output/
    └── standard.output.json
```

---

### 2.10 [COMPLETADO] Exportar Helpers de Logging

**Estado:** Completado el 2026-01-15.

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `src/index.ts`

**Problema:** `logDebug` y `logInfo` existen en `logger.ts` pero no están exportados en el API público. Usuarios avanzados que quieran instrumentar su código no pueden usarlos.

**Solución:**
```typescript
// En src/index.ts, añadir a los exports de Logger API:
export {
  getLogger,
  logDebug,    // ← añadir
  logError,
  logInfo,     // ← añadir
  logWarning,
  nullLogger,
  resetLogger,
  setLogger,
} from "./errors/logger.js";
```

---

### 2.11 [COMPLETADO] Documentar Error Codes en README

**Estado:** Completado el 2026-01-15.

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `README.md`, sección "Error Codes Reference"

**Problema:** README menciona códigos de error pero no hay lista completa.

**Solución:** Tabla completa añadida.

---

### 2.12 Script para Validar schema.json

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `scripts/validate-schema.ts`

**Problema:** `schema.json` se genera manualmente y podría desincronizarse con los schemas Zod.

**Solución:**
```typescript
// scripts/validate-schema.ts
import { zodToJsonSchema } from "zod-to-json-schema";
import { ConfigFileSchema } from "../src/schemas/config.schema.js";
import existingSchema from "../schema.json";

const generated = zodToJsonSchema(ConfigFileSchema);

// Comparar y fallar si difieren
if (JSON.stringify(generated) !== JSON.stringify(existingSchema)) {
  console.error("schema.json is out of sync! Run `pnpm generate:schema`");
  process.exit(1);
}
```

**Script en package.json:**
```json
"check:schema": "tsx scripts/validate-schema.ts"
```

**Añadir a CI:** Incluir en workflow de CI para detectar desincronización.

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

**Nota:** Refactor complejo con riesgo de bugs. Evaluar si el beneficio justifica el esfuerzo.

---

### 3.2 Monorepo Structure (Futuro)

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🔴 Alto | 🔴 Alto | ⭐ |

```
kindle-tools-ts/
├── packages/
│   ├── core/       # Lógica pura, sin deps de Node
│   ├── node/       # Node.js adapters (fs)
│   └── shared/     # Tipos compartidos
```

**Nota:** Solo justificado con demanda real de uso browser separado.

---

### 3.3 Fuzzy CSV Headers

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Problema:** Errores en nombres de columnas (`Titl` vs `Title`) hacen que se ignoren datos silenciosamente.

**Solución propuesta:**
Usar `fastest-levenshtein` para mapear columnas del CSV a las esperadas (`Title`, `Author`, etc.) si la distancia es pequeña.

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
| Pipeline Pattern en Processor | `processor.ts` (~200 ln) ya delega correctamente |
| Web Crypto API | Requiere async en toda la cadena, complejidad no justificada |
| Lazy Template Compilation | Bajo impacto, complejidad añadida |
| Mejoras Archiver (streaming, tar real) | Solo útil para exports >100MB |

### Sin Plan Concreto

- **Anki Export:** Ya existe como plugin de ejemplo
- **Notion Integration:** API propietaria
- **Kobo/Apple Books:** Requiere parsers específicos
- **AI Enrichment:** Claude API para tags (fuera de scope)
- **WASM Web App:** Complejidad vs beneficio bajo
- **Mutation Testing (Stryker):** Costoso en CI
- **E2E Testing (Playwright):** Solo para workbench
- **Refactorizar con `measureTime`:** Unificar medición de tiempos en `TxtImporter` y `Processor`.
- **Estandarizar Metadatos:** Unificar `meta` (fileSize, duration) en todos los Importers.
- **Instrumentar Exporters:** Añadir logs de inicio/fin a `BaseExporter`.

---

## Resumen de Prioridades

| Prioridad | Total | ROI Alto (⭐⭐⭐) |
|-----------|-------|------------------|
| Media | 5 | 4 (1.1, 1.2, 1.4, 1.5) |
| Baja | 9 | 3 (2.2, 2.3, 2.12) |
| Completado | 3 | 3 (2.4, 2.10, 2.11) |
| Estudio | 2 | 0 |

### Orden de Ejecución Recomendado

1. **Urgente:** 1.1 Bug Fix CSV Type Validation
2. **Quick Wins:** 1.2, 1.4, 1.5, 2.2, 2.3
3. **Cuando haya tiempo:** 1.3, 2.1, 2.5-2.9, 2.12
4. **Evaluar necesidad:** 3.1, 3.2

---

## Referencias

### TypeScript Libraries 2025
- [Building a TypeScript Library in 2025](https://dev.to/arshadyaseen/building-a-typescript-library-in-2025-2h0i)

### Error Handling
- [neverthrow](https://github.com/supermacro/neverthrow)

### Testing
- [Vitest Best Practices](https://www.projectrules.ai/rules/vitest)
- [fast-check](https://github.com/dubzzz/fast-check)

### Tooling
- [Biome Configuration](https://biomejs.dev/guides/configure-biome/)

---

*Documento actualizado: 2026-01-15*
*Mejoras pendientes: 16 | Media: 5 | Baja: 9 | Estudio: 2*
