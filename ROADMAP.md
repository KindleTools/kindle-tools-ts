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

### 2.1 Inyeccion de Logger (Arquitectura)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Pendiente

**Ubicacion:** `src/errors/logger.ts`

**Problema:** El logging escribe directamente a `console.error`/`console.warn` (lineas 66, 68, 100, 103). Esto le quita control al consumidor de la libreria.

Si un desarrollador usa la libreria en su aplicacion y quiere redirigir los logs a Sentry, Datadog, Winston, Pino, o un archivo, no puede hacerlo facilmente.

**Solucion:** Implementar patron de "Logger Injection":

```typescript
// src/errors/logger.ts

export interface LoggerInterface {
  error: (entry: ErrorLogEntry) => void;
  warn: (entry: ErrorLogEntry) => void;
}

// Logger por defecto (actual comportamiento)
const defaultLogger: LoggerInterface = {
  error: (entry) => {
    if (process.env["NODE_ENV"] === "development") {
      console.error("[ERROR]", JSON.stringify(entry, null, 2));
    } else {
      console.error(JSON.stringify(entry));
    }
  },
  warn: (entry) => {
    if (process.env["NODE_ENV"] === "development") {
      console.warn("[WARN]", JSON.stringify(entry, null, 2));
    } else {
      console.warn(JSON.stringify(entry));
    }
  },
};

let currentLogger: LoggerInterface = defaultLogger;

export function setLogger(logger: LoggerInterface): void {
  currentLogger = logger;
}

export function resetLogger(): void {
  currentLogger = defaultLogger;
}
```

Esto permite a los usuarios configurar su propio logger al inicializar:

```typescript
import { setLogger } from 'kindle-tools-ts';
import pino from 'pino';

const logger = pino();
setLogger({
  error: (entry) => logger.error(entry),
  warn: (entry) => logger.warn(entry),
});
```

---

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

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Pendiente

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

**Prioridad:** MEDIA | **Esfuerzo:** Alto | **Estado:** Backlog

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

### 2.6 Config File Improvements (.kindletoolsrc)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Backlog

Ya esta parcialmente implementado con cosmiconfig. Mejoras adicionales:
- Soporte para `.kindletoolsrc.toml` (formato moderno)
- Validacion de errores con sugerencias ("Did you mean 'folderStructure'?")
- Expansion de variables de entorno en config

---

### 2.7 Consolidar Exportadores Multi-Archivo

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Backlog

Crear una clase base `MultiFileExporter` para Obsidian, Markdown y Joplin que:
- Unifique la logica de estructura de carpetas
- Reduzca codigo duplicado en generacion de paths
- Centralice el manejo de templates

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

### 2.10 OS-Safe Filename Sanitization

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** Backlog

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

### 2.11 Property-Based Testing (fast-check)

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Backlog

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

### 2.12 Real-World Stress Testing

**Prioridad:** MEDIA | **Esfuerzo:** Medio | **Estado:** Backlog

Suite de tests con archivos "feos": idiomas mezclados, formatos legacy, separadores malformados.

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

### 2.16 Coverage Thresholds por Glob Pattern

**Prioridad:** MEDIA | **Esfuerzo:** Bajo | **Estado:** Backlog

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

Se crean multiples instancias de `TemplateEngine` (cada una compila templates Handlebars). Podria optimizarse con caching o factory pattern.

---

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

### 3.16 Organizacion de Test Fixtures

**Prioridad:** BAJA | **Esfuerzo:** Bajo | **Estado:** Backlog

Los archivos de test fixtures estan dispersos. Consolidar en:

```
tests/fixtures/
  ├── clippings/
  ├── config/
  └── expected-output/
```

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
| Logger Injection | Medio | Medio | Backlog |
| Carga Dinamica Locales | Bajo | Medio | Backlog |
| Type Assertions Plugins | Medio | Medio | Backlog |
| `any` en hashing.ts | Bajo | Bajo | Backlog |
| FileSystem Abstraction | Medio | Alto | Backlog |
| Config File Improvements | Medio | Medio | Backlog |
| Multi-File Exporter Base | Medio | Medio | Backlog |
| Property-Based Testing | Medio | Medio | Backlog |
| Coverage por Glob | Medio | Bajo | Backlog |
| TypeDoc | Medio | Bajo | Backlog |
| **BAJA PRIORIDAD** |  |  |  |
| Renombrar `process` | Bajo | Bajo | Backlog |
| Archivos Largos | Bajo | Medio | Backlog |
| TemplateEngine Cache | Bajo | Bajo | Backlog |
| Monorepo Structure | Bajo | Alto | Backlog |
| Browser Entry Point | Bajo | Medio | Backlog |
| **COMPLETADO** |  |  |  |
| ESLint Neverthrow | Alto | Bajo | DONE |
| Consolidar Fechas | Alto | Bajo | DONE |
| Constantes Limites Archivo | Alto | Bajo | DONE |
| Path Traversal Protection | Alto | Bajo | DONE |

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

*Documento actualizado: 2026-01-12*
*Mejoras pendientes: ~24 | En Progreso: 1 | Completado: 9 | Not Planned: 20+*
