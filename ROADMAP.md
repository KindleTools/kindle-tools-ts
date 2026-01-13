# KindleToolsTS - Roadmap

Documento consolidado con todas las mejoras pendientes, organizadas por prioridad.

**Estado del proyecto:** Libreria TypeScript Pura + Visual Workbench de Pruebas. Clean Architecture / DDD con toolchain moderno (Biome 2.3+, Vitest 4+, tsup, Turborepo).

> **Nota:** La CLI ha sido eliminada. El proyecto ahora es una libreria pura con un workbench visual en `tests/workbench/` para pruebas y demostraciones.

---

## Indice

1. [Mejoras Alta Prioridad](#1-mejoras-alta-prioridad)
2. [Mejoras Media Prioridad](#2-mejoras-media-prioridad)
3. [Mejoras Baja Prioridad](#3-mejoras-baja-prioridad)
4. [Completado](#4-completado)
5. [Not Planned](#5-not-planned)

---

## 1. Mejoras Alta Prioridad

### 1.1 BUG CRITICO: Imports Rotos en index.ts

**Prioridad:** CRITICA | **Esfuerzo:** Trivial | **Estado:** DONE

**Ubicacion:** `src/index.ts:128-129`

**Problema:** El build esta roto. Los siguientes imports apuntan a archivos que no existen:

```typescript
import * as GeoUtils from "./domain/geography.js";  // ❌ NO EXISTE
import * as StatUtils from "./domain/stats.js";     // ❌ NO EXISTE
```

**Error de build:**
```
X [ERROR] Could not resolve "./domain/geography.js"
X [ERROR] Could not resolve "./domain/stats.js"
```

**Rutas correctas:**
- Stats: `./domain/analytics/stats.js`
- Geo: `./utils/geo/index.js` o `./domain/core/locations.js`

**Accion:** Fix inmediato requerido para que el proyecto compile.

---

### 1.2 Bug: Cache de Configuracion (cosmiconfig Singleton)

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** DONE

**Ubicacion:** `src/config/loader.ts`

**Problema:** La funcion `loadConfig` crea una nueva instancia de cosmiconfig (`createExplorer()`) cada vez que se llama (lineas 147, 180). Esto:

1. **Pierde el cache interno de cosmiconfig** - el cache es por instancia
2. **Lee el disco innecesariamente** - en procesos de larga duracion (workbench, servidor)
3. **`clearConfigCache()` no funciona** - crea instancia nueva, limpia cache vacio, la descarta (lineas 200-208)

```typescript
// ANTES (incorrecto)
export async function loadConfig(options = {}) {
  const explorer = createExplorer(); // Nueva instancia cada vez!
  // ...
}

// DESPUES (correcto - Singleton)
let asyncExplorer: ReturnType<typeof cosmiconfig> | null = null;
let syncExplorer: ReturnType<typeof cosmiconfigSync> | null = null;

function getAsyncExplorer() {
  if (!asyncExplorer) {
    asyncExplorer = cosmiconfig(MODULE_NAME, { /* ... */ });
  }
  return asyncExplorer;
}

export function clearConfigCache(): void {
  asyncExplorer?.clearCaches();
  syncExplorer?.clearCaches();
}
```

---

### 1.3 Magic Numbers en Parser

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** DONE

**Ubicacion:** `src/importers/formats/txt/parser.ts`

**Problema:** Numeros magicos sobre la estructura del bloque Kindle:

```typescript
// Linea 208 - MIN_BLOCK_LINES
if (lines.length < 2) return null;

// Linea 235 - CONTENT_START_INDEX (skip header: title + metadata)
const contentLines = lines.slice(2);
```

**Solucion:** Crear constantes en `src/domain/parsing/parsing-constants.ts`:

```typescript
export const BLOCK_STRUCTURE = {
  /** Minimum lines required for a valid block (title + metadata) */
  MIN_BLOCK_LINES: 2,
  /** Line index where content starts (after title[0] and metadata[1]) */
  CONTENT_START_INDEX: 2,
  /** Index of title line */
  TITLE_LINE_INDEX: 0,
  /** Index of metadata line */
  METADATA_LINE_INDEX: 1,
} as const;
```

Si Amazon cambia el formato y anade una linea extra de metadata, sera facil de rastrear y actualizar.

---

### 1.4 Usar Tipos de Error Custom en Lugar de throw Error()

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** DONE

Algunos lugares usan `throw new Error()` generico en lugar de los tipos de error del proyecto o `Result<T, E>`:

| Archivo | Lineas | Contexto |
|---------|--------|----------|
| `src/config/loader.ts` | 114 | Config invalida |
| `src/plugins/registry.ts` | 167, 185, 272, 289 | Plugin invalido |
| `src/exporters/shared/exporter-utils.ts` | 215, 218, 225 | Path traversal validation |

**Accion:** Reemplazar con tipos de `src/errors/types.ts` o retornar `Result<T, E>` para consistencia con el resto del codigo que usa neverthrow.

---

### 1.5 Tests para Archivos con Bajo/0% Coverage

**Prioridad:** ALTA | **Esfuerzo:** Medio | **Estado:** DONE

**Coverage actual:** 88.47% statements, 76.38% branches (umbral: 80%)

Archivos con cobertura completada (100%):
- `src/core/processing/tag-processor.ts` - DONE
- `src/core/processing/filter.ts` - DONE
- `src/utils/fs/tar.ts` - DONE (80% branches)
- `src/utils/fs/zip.ts` - DONE
- `src/utils/text/encoding.ts` - DONE

Archivos pendientes:

| Archivo | Statements | Branches | Funcionalidad |
|---------|------------|----------|---------------|
| `src/errors/logger.ts` | 100% | 100% | Logging estructurado - DONE |
| `src/plugins/discovery.ts` | 97.14% | 86.2% | Carga dinamica de plugins - DONE |

---

### 1.6 Eliminar Entry "bin" del package.json

**Prioridad:** ALTA | **Esfuerzo:** Trivial | **Estado:** DONE

**Ubicacion:** `package.json:10-12`

**Problema:** La CLI fue eliminada pero el `package.json` aun contiene:

```json
"bin": {
  "kindle-tools": "./dist/cli.js"
}
```

El archivo `dist/cli.js` existe pero solo contiene un shebang vacio. Esto puede confundir a usuarios que intenten usar la CLI.

**Accion:** Eliminar la seccion `"bin"` del `package.json`.

---

### 1.7 Mejoras Post-AppException

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** DONE

Tras la implementacion de `AppException`, hay mejoras de seguimiento:

1. **Tests para AppException** - Validar que `code` y `appError` funcionan correctamente
2. **Actualizar tests de plugins** - Verificar que lanzan `AppException` en lugar de solo `Error`:
   ```typescript
   // Actualmente:
   expect(() => pluginRegistry.registerImporter(invalidPlugin)).toThrow();

   // Mejorar a:
   expect(() => pluginRegistry.registerImporter(invalidPlugin)).toThrow(AppException);
   ```
3. **Documentar AppException** - Añadir ejemplos de manejo de errores tipados en README
4. **Considerar PluginError especifico** - En vez de reutilizar `ValidationError` generico

**Nota arquitectonica:** A largo plazo, migrar funciones de registro de plugins a retornar `Result<void, ValidationError>` seria mas idiomatico con el uso de neverthrow en el proyecto.

---

## 2. Mejoras Media Prioridad



### 2.2 Carga Dinamica de Locales date-fns

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Pendiente

**Ubicacion:** `src/domain/parsing/dates.ts:11`

**Problema:** Se importan estaticamente todos los locales de date-fns:

```typescript
import { de, enUS, es, fr, it, ja, ko, nl, pt, ru, zhCN } from "date-fns/locale";
```

**Impacto:**
- Para Node.js/Backend: No es critico
- Para Browser: Aumenta significativamente el bundle size (~50KB+ de locales no usados)

**Solucion futura:** Carga lazy/dinamica de locales:

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

**Nota:** Requiere refactorizar `parseKindleDate` a async, lo cual tiene impacto en cascada. No es urgente mientras el target principal sea Node.js.

---

### 2.3 Type Assertions con `unknown` en Plugins

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** DONE

**Ubicacion:** `src/plugins/adapters.ts` (lineas 41, 71, 100, 120)

**Problema:** Uso de double type assertions:

```typescript
ExporterPluginClass as unknown as new () => Exporter
ImporterPluginClass as unknown as new () => Importer
```

El patron `as unknown as` es un "type escape hatch" que puede ocultar bugs en tiempo de compilacion.

**Solucion:** Definir tipos de clase apropiados o usar generics para evitar el cast intermedio `unknown`.

---

### 2.4 `any` Hardcodeado en Deteccion de Entorno

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** Pendiente

**Ubicacion:** `src/utils/security/hashing.ts:19-21`

```typescript
const crypto = (globalThis as any).process?.versions?.node
  ? (require as any)("node:crypto")
  : null;
```

**Problema:** Uso de `any` para deteccion de entorno Node.js vs Browser.

**Solucion:** Definir type guard apropiado o tipo condicional sin `any`.

---

### 2.5 FileSystem Abstraction (Ports & Adapters)

**Prioridad:** MEDIA | **Esfuerzo:** Alto | **Estado:** DONE

Implementado siguiendo el patrón de Logger Injection:

```typescript
// src/ports/filesystem.ts - Interface + DI
export interface FileSystem {
  readFile(path: string): Promise<Uint8Array>;
  readTextFile(path: string, encoding?: string): Promise<string>;
}

export function setFileSystem(fs: FileSystem): void;
export function resetFileSystem(): void;
export async function getFileSystem(): Promise<FileSystem>;
export const nullFileSystem: FileSystem;

// src/ports/adapters/node-filesystem.ts - Default para Node.js
export const nodeFileSystem: FileSystem;

// src/ports/adapters/memory-filesystem.ts - Para tests
export class MemoryFileSystem implements FileSystem {
  addFile(path: string, content: string): void;
  addBinaryFile(path: string, content: Uint8Array): void;
  // ...
}
```

**Beneficios:**
- Tests instantáneos sin I/O de disco
- Browser-ready (core sin dependencia de node:fs)
- Sandboxing para seguridad

**API Pública:** `setFileSystem`, `getFileSystem`, `resetFileSystem`, `nullFileSystem`, `MemoryFileSystem`, `FileSystem` type.

---

### 2.6 Config File Improvements (.kindletoolsrc)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** DONE

Implementado en `src/config/loader.ts` con soporte completo:
- Soporte para `.kindletoolsrc.toml` (vía `@iarna/toml`)
- Validacion de errores con sugerencias fuzzy (vía `fastest-levenshtein` y Zod `.strict()`)
- Expansion de variables de entorno `${VAR}` en valores de configuración
- Tests de integración detallados para estas features

---

### 2.7 Mejoras en MultiFileExporter
**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Backlog

Se ha implementado `MultiFileExporter` como base, pero quedan mejoras:

1.  **Optimización de `exportPreamble`**:
    *   Pasar `clippings` a `exportPreamble(clippings, options)` para permitir cálculos globales (ej. indexación de tags) antes de procesar libros.
2.  **Stateless Refactoring (JoplinExporter)**:
    *   Eliminar estado mutable (`this.rootNotebookId`, `this.tagMap`) de la clase exportadora.
    *   Usar un objeto `ExportContext` efímero que se pase a través de `doExport` -> `processBook`.
3.  **Migración Total a Templates (Joplin)**:
    *   Mover la generación del cuerpo de la nota (actualmente concatenación manual) a una plantilla Handlebars `CLIPPING_JOPLIN` en `presets.ts`.
4.  **Optimización de Memoria**:
    *   Hacer que `generateSummaryContent` devuelva un resumen ligero por defecto en lugar de concatenar el contenido de todos los archivos (lo cual es costoso para librerías grandes).

---

### 2.8 Mejorar Robustez del Parser CSV

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** Backlog

El parser CSV custom en `csv.importer.ts` funciona pero podria mejorar:
- Validacion de conteo de campos
- Considerar migracion a `papaparse` o `csv-parse/sync`
- Mejores mensajes de error para CSV malformados

---

### 2.9 Dynamic Path Templating

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Backlog

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

### 2.10 Dynamic Template Options (TemplateEngine)
**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** DONE ✓

Implementado el sistema de opciones dinámicas para templates:

1.  ✅ **TemplateOptions interface** en `src/templates/types.ts` con opciones predefinidas (`wikilinks`, `useCallouts`, etc.)
2.  ✅ **opt helper** en `src/templates/helpers.ts` que lee `options` del contexto raíz
3.  ✅ **Propagación de opciones** en `renderBook()` y `renderExport()` de `TemplateEngine`
4.  ✅ **Contextos actualizados** con `options?: TemplateOptions` en `BookContext` y `ExportContext`

Uso:
```typescript
const engine = new TemplateEngine(obsidianPreset);
engine.renderBook(clippings, { wikilinks: true, useCallouts: true });
```

En templates:
```handlebars
{{#if (opt "wikilinks")}}[[{{author}}]]{{else}}{{author}}{{/if}}
```

---





### 2.13 TypeDoc API Documentation

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** Backlog

```bash
pnpm add -D typedoc typedoc-plugin-markdown
```

---

### 2.14 Automated Release Pipeline

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** Backlog

Usar `semantic-release` o `changesets` para versionado automatico y generacion de changelog.

---

### 2.15 Mejorar Contexto de Errores en Importers

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Backlog

Cuando los importers fallan en filas especificas:
- Incluir numero de fila en mensajes de error
- Acumular todos los errores de validacion antes de retornar
- Proveer sugerencias para corregir errores comunes

---



### 2.17 Merged Output Mode

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** Backlog

```typescript
export interface ProcessOptions {
  mergedOutput?: boolean;
}

// Result: highlights con notas embebidas
{ type: "highlight", content: "Quote", note: "My thoughts", tags: ["review"] }
```

---

## 3. Mejoras Baja Prioridad

### 3.1 Renombrar Funcion `process` a `processClippings`

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

**Ubicacion:** `src/core/processor.ts`, `src/index.ts:30`

**Problema:** El nombre `process` es muy generico y puede confundirse conceptualmente con `process` de Node.js.

**Solucion:** Exportar como `processClippings` con `process` como alias para backward compatibility:

```typescript
// src/core/processor.ts
export function processClippings(clippings, options) { /* ... */ }
export { processClippings as process }; // Backward compat
```

---

### 3.2 Archivos Largos (Refactoring Candidates)

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Estado:** Backlog

Archivos que exceden ~400 lineas y podrian beneficiarse de refactoring:

| Archivo | Lineas | Sugerencia |
|---------|--------|------------|
| `src/exporters/formats/joplin.exporter.ts` | ~550 | Extraer generacion de notebooks/tags |
| `src/exporters/formats/html.exporter.ts` | ~547 | Extraer CSS a archivo separado |
| `src/plugins/registry.ts` | ~474 | Extraer logica de validacion |
| `src/templates/presets.ts` | ~473 | Separar por categoria de preset |

---

### 3.3 TemplateEngine Sin Cache

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

**Ubicacion:** `src/exporters/formats/markdown.exporter.ts`

**Problema:** Se crean multiples instancias de `TemplateEngine` (cada una recompila templates Handlebars) en cada exportación. Ineficiente para procesos batch.

**Solución Propuesta:** Implementar `TemplateEngineFactory` con cache y manejo de errores seguro:

```typescript
export class TemplateEngineFactory {
  private static instances = new Map<string, TemplateEngine>();

  static getEngine(options: CustomTemplates | TemplatePreset): TemplateEngine {
    const key = JSON.stringify(options); // Simplificación de hash
    if (!this.instances.has(key)) {
      try {
        this.instances.set(key, new TemplateEngine(options)); 
      } catch (err) {
        throw new AppException({
          code: "EXPORT_TEMPLATE_ERROR",
          message: "Failed to compile templates",
          cause: err
        });
      }
    }
    return this.instances.get(key)!;
  }
}
```







### 3.4 Missing Return Types Explicitos

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

Algunas funciones usan tipos inferidos en lugar de anotaciones explicitas:
- `createHandlebarsInstance()` en `src/templates/helpers.ts`
- Otras funciones helper dispersas

---

### 3.5 Browser Entry Point

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Estado:** Backlog

Agregar campo `"browser"` en `package.json` apuntando a bundle sin dependencias de `fs`.

**Nota:** El patron de exports actual (`./node` separado) ya permite soporte parcial de entornos "edge" (Cloudflare Workers) que soportan JS estandar pero no el modulo `fs` de Node.

---

### 3.6 Monorepo Structure (pnpm workspaces)

**Prioridad:** BAJA | **Esfuerzo:** Alto | **Estado:** Backlog

```
kindle-tools-ts/
  packages/
    core/           # Logica pura, sin deps de Node
    node/           # Node.js adapters (fs)
    shared/         # Tipos compartidos
  pnpm-workspace.yaml
  turbo.json
```

---

### 3.7 Unified Archiver Interface

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Estado:** Backlog

```typescript
// src/utils/archive/archiver.interface.ts
export interface Archiver {
  addFile(path: string, content: string | Buffer): void;
  addDirectory(path: string): void;
  finalize(): Promise<Buffer>;
}
```

---

### 3.8 Structured Logging (Expansion)

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

Expandir la interfaz de logger:

```typescript
interface Logger {
  debug: (msg: string, ctx?: object) => void;
  info: (msg: string, ctx?: object) => void;
  warn: (msg: string, ctx?: object) => void;
  error: (msg: string, ctx?: object) => void;
}
```

---

### 3.9 Centralized Options Definition (SSOT)

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Estado:** Backlog

Crear `src/core/options.def.ts` para definir opciones de procesamiento programaticamente.

---

### 3.10 Stress Testing / Performance Benchmarking

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

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

### 3.11 Minor Code Improvements

| Issue | Solution |
|-------|----------|
| Magic numbers en `identity.ts` | Mover a `constants.ts` |
| Instancia Handlebars no cacheada | Agregar patron singleton |
| Factory crea nuevas instancias | Cachear instancias stateless |

---

### 3.12 Abstract Grouping Logic in BaseExporter

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

Crear helper `exportGroupedFiles(clippings, renderFn)`.

---

### 3.13 Externalize HTML Styles

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

Mover CSS de `HtmlExporter` a archivo separado.

---

### 3.14 VitePress Documentation Site

**Prioridad:** BAJA | **Esfuerzo:** Medio | **Estado:** Backlog

```
docs/
  guide/
    getting-started.md
    api-usage.md
  recipes/
    obsidian-workflow.md
    joplin-setup.md
```

---

### 3.15 Architecture Decision Records (ADR)

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

```
docs/adr/
  0001-use-native-node-subpath-imports.md
  0002-dual-esm-cjs-publishing.md
  0003-clean-architecture-structure.md
```

---

### 3.16 Organizacion de Test Fixtures y Suites

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

1.  **Consolidar Fixtures**:
    *   Centralizar en `tests/fixtures/{clippings,config,expected-output}`.
2.  **Dividir Test Suites Grandes**:
    *   Refactorizar `tests/unit/exporters/exporters.test.ts` (actualmente ~800 líneas) en archivos específicos por formato: `markdown.test.ts`, `obsidian.test.ts`, `joplin.test.ts`.

---

### 3.17 Cuidado con normalizeWhitespace en Contenido Especial

**Prioridad:** BAJA | **Esfuerzo:** N/A | **Estado:** Nota

**Ubicacion:** `src/utils/text/normalizers.ts`

**Observacion:** `normalizeWhitespace` colapsa multiples espacios en uno solo. Esto es correcto para texto en prosa, pero podria causar problemas si algun dia se parsean:
- Codigo fuente dentro de clippings
- Poesia donde el espaciado exacto importa
- Texto preformateado

**Accion:** No requiere cambios ahora, pero documentar como advertencia para futuras extensiones.

---

### 3.18 Plugin Instance Reset Logic (Thread-Safety/Testability)

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

Permitir reiniciar la instancia lazy de un plugin (`this._instance = undefined`) sin tener que recargar el registro entero. Útil para entornos de larga duración o tests que necesitan aislar estado.

---

### 3.19 Plugin Runtime Instance Validation (Fail Fast)

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

Validar explícitamente que el objeto devuelto por `plugin.create()` cumple con la interfaz esperada (`export()` method, etc.) antes de usarlo. Esto previene errores tipo "undefined is not a function" más adelante si un plugin está mal implementado.

---

## 4. Completado

### 4.1 ESLint Plugin para Neverthrow

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** DONE

Implementado mediante `eslint` + `eslint-plugin-neverthrow` en modo hibrido junto con Biome.
- Configuracion en `eslint.config.mjs`
- Script: `pnpm run lint:eslint`
- Integrado en `pnpm run check`
- Prohibe explicitamente `_unsafeUnwrap` y `_unsafeUnwrapErr`

---

### 4.2 Consolidar Logica de Fechas

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** DONE

Separacion correcta implementada:
- `src/domain/parsing/dates.ts`: Logica de parsing (negocio)
- `src/utils/system/dates.ts`: Logica de formateo (generica)
- **Extra:** Movido `sha256Sync` a `utils/security`, `countWords` a `utils/text` y `geography` a `utils/geo`

---

### 4.3 Crear Constantes de Limites de Archivo

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** DONE

Creado `src/core/limits.ts` con `SYSTEM_LIMITS`:

```typescript
export const SYSTEM_LIMITS = {
  LARGE_FILE_MB: 50,
  STREAM_CHUNK_SIZE: 64 * 1024, // 64KB
  MAX_FILENAME_LENGTH: 100,
  HISTORY_MAX_ENTRIES: 1000,
} as const;
```

---

### 4.4 Proteccion Path Traversal en Exports

**Prioridad:** ALTA | **Esfuerzo:** Bajo | **Estado:** DONE

En `src/exporters/shared/exporter-utils.ts:199-227`, la funcion `generateFilePath` valida path traversal:
- `sanitizeFilename()` limpia title y author (lineas 209-211)
- Valida que no sean "." o ".." (lineas 213-219)
- Verifica que baseFolder no contenga ".." (lineas 221-227)

**Nota:** Las validaciones usan `throw new Error()` - migrar a Result types esta pendiente en 1.4.

---

### 4.5 Real-World Stress Testing

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** DONE

Implementada suite en `tests/stress/` que incluye:
- **Naughty Strings**: Inyección de caracteres problemáticos (Unicode, Zalgo, SQL, Path Traversal) en todos los campos.
- **Garbage Fuzzing**: Tests de robustez contra archivos binarios o aleatorios.
- **Massive Files**: Validación de performance con archivos de 5MB+ y miles de clippings.
- **Broken Structures**: Validación de manejo de errores con estructuras malformadas.

---

### 4.6 Property-Based Testing (fast-check)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** DONE

Implementado en `tests/stress/parser.properties.test.ts` usando `fast-check`.
- Verifica que el parser nunca explota con input arbitrario (Fuzzing).
- Verifica que bloques válidos generados sintéticamente siempre se parsean correctamente (Oracle).

---

### 4.7 Coverage Thresholds por Glob Pattern

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** DONE

Configurado en `vitest.config.ts` para exigir mayor calidad en el núcleo:
- **Global**: 80%
- **Core (`src/core`)**: 95%
- **Errors (`src/errors`)**: 95%
- **Domain (`src/domain`)**: 90%
- **Utils**: 85%

---

### 4.8 Inyeccion de Logger (Arquitectura)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** DONE

Se implementó el patrón de Logger Injection en `src/errors/logger.ts`.
- `Logger` interface exportada con métodos `error()` y `warn()`.
- `setLogger()` permite inyectar loggers externos (Winston, Pino, Sentry, Datadog, etc).
- `resetLogger()` restaura el logger por defecto.
- `getLogger()` obtiene el logger actual (útil para tests).
- `defaultLogger` mantiene el comportamiento original (console).
- API exportada en `src/index.ts`: `Logger`, `ErrorLogEntry`, `ErrorLogContext`, `setLogger`, `resetLogger`, `getLogger`, `logError`, `logWarning`.
- Tests completos en `tests/unit/errors/logger.test.ts` (11 tests).

---
### 4.9 Type Testing (expectTypeOf)

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** DONE

Implementado en `tests/types/api.test-d.ts`.
- Valida que `parser.parse` retorne exactamente `ParseResult`.
- Asegura que no haya fugas de `any` o `unknown` en la API pública.
- Verifica la integridad de estructuras anidadas como `Clipping` y `BookStats`.

---

### 4.10 Snapshot Testing para Parsers

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** DONE

Implementado en `tests/snapshots/parser.snapshot.test.ts`.
- Usa `toMatchFileSnapshot` para validar salidas complejas JSON.
- Asegura que cualquier cambio en la lógica de parsing sea intencional y visible en el diff.
- Utiliza fixtures realistas (`tests/snapshots/fixtures/standard.txt`).

---

## 5. Not Planned


Las siguientes mejoras no estan planificadas en el corto/medio plazo:

### Seguridad & CI/CD

- **Snyk - Escaneo de Dependencias**: Requiere cuenta y tokens. Mejor usar `npm audit` o Dependabot.
- **SonarQube - Analisis Estatico**: Demasiado pesado para un proyecto de este tamano.

### Arquitectura

- **Streaming Architecture**: Archivos de 50MB+ pueden causar OOM, pero es un caso de uso muy raro para este tipo de herramienta.
- **CLI**: La CLI ha sido eliminada. El proyecto es ahora una libreria pura. Usuarios que necesiten CLI pueden crear wrappers usando la API.

### Exporters

- **Anki Export (.apkg)**: Ya existe como plugin de ejemplo, no como formato core
- **Notion Integration**: API propietaria, ecosistema cerrado
- **Direct Joplin Sync**: Usar Web Clipper API directamente

### Workbench Improvements

> El workbench (`tests/workbench/`) es solo para desarrollo y testing. Estas mejoras son opcionales.

- **Limpiar console.log**: Aceptable en workbench de desarrollo
- **Corregir XSS Potencial**: Riesgo minimo (archivos locales del usuario)
- **Sort/Order**: Agregar `sortBy` y `sortOrder` al state
- **Copy to Clipboard**: `navigator.clipboard.writeText()`
- **Date Range Filter**: Filtrar por `clip.date`
- **Statistics Charts**: Chart.js con datos de `calculateStats()`
- **Theme Toggle**: CSS variables + localStorage

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
- **Mutation Testing (Stryker)**: Demasiado costoso en tiempo de CPU/CI para el beneficio actual.
- **Round-Trip Property Testing**: Complejidad alta al requerir un Exporter robusto 1:1. Pospuesto hasta tener Exporters estables.
- **Architecture Testing (Dependency Cruiser)**: Baja prioridad por tamaño manejable del proyecto.
- **Formal Benchmarking (Vitest Bench)**: Los tests de estrés actuales son suficientes.

### Permanentemente Descartados

- **PDF Export**: Requeriria libreria de renderizado PDF
- **Readwise Sync**: API propietaria, ecosistema cerrado
- **Highlight Colors**: Kindle no exporta esta informacion

---

## Matriz de Prioridades

| Mejora | Impacto | Esfuerzo | Estado |
|--------|---------|----------|--------|
| **CRITICA** |  |  |  |
| Imports rotos index.ts | Critico | Trivial | DONE |
| **ALTA PRIORIDAD** |  |  |  |
| Bug Cache Configuracion | Alto | Bajo | DONE |
| Magic Numbers Parser | Medio | Bajo | DONE |
| Error Types Custom | Medio | Bajo | DONE |
| Tests Coverage < 80% | Alto | Medio | En Progreso |
| Eliminar bin package.json | Bajo | Trivial | DONE |
| Mejoras Post-AppException | Medio | Bajo | Pendiente |
| **MEDIA PRIORIDAD** |  |  |  |
| Carga Dinamica Locales | Bajo | Medio | Backlog |
| Type Assertions Plugins | Medio | Medio | Backlog |
| `any` en hashing.ts | Bajo | Bajo | Backlog |
| FileSystem Abstraction | Medio | Alto | DONE |
| Config File Improvements | Medio | Medio | DONE |
| Multi-File Exporter Base | Medio | Medio | Backlog |
| TypeDoc | Medio | Bajo | Backlog |
| **BAJA PRIORIDAD** |  |  |  |
| Renombrar `process` | Bajo | Bajo | Backlog |
| Archivos Largos | Bajo | Medio | Backlog |
| TemplateEngine Cache | Bajo | Bajo | Backlog |
| Monorepo Structure | Bajo | Alto | Backlog |
| Browser Entry Point | Bajo | Medio | Backlog |
| 
| **COMPLETADO** |  |  |  |
| ESLint Neverthrow | Alto | Bajo | DONE |
| Consolidar Fechas | Alto | Bajo | DONE |
| Constantes Limites Archivo | Alto | Bajo | DONE |
| Path Traversal Protection | Alto | Bajo | DONE |
| Real-World Stress Testing | Medio | Medio | DONE |
| Property-Based Testing | Medio | Medio | DONE |
| Coverage Thresholds | Medio | Bajo | DONE |
| Logger Injection | Medio | Medio | DONE |
| Type Testing | Medio | Bajo | DONE |
| Snapshot Testing | Medio | Medio | DONE |
| FileSystem Abstraction | Medio | Alto | DONE |

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

### Configuration
- [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)

### Testing
- [Vitest Coverage Configuration](https://vitest.dev/config/coverage)
- [fast-check](https://github.com/dubzzz/fast-check)

### Tooling
- [Biome Configuration](https://biomejs.dev/guides/configure-biome/)
- [Biome vs ESLint 2025](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c)

---

*Documento actualizado: 2026-01-13*
*Mejoras pendientes: ~21 | En Progreso: 0 | Completado: 16 | Not Planned: 21+*
