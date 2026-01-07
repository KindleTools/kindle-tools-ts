# Mejoras Potenciales - kindle-tools-ts

Documento de analisis exhaustivo del proyecto con mejoras identificadas, ordenadas de mayor a menor impacto.

---

## Resumen Ejecutivo

El proyecto sigue una arquitectura Clean Architecture / DDD bien estructurada con separacion de responsabilidades clara. Utiliza herramientas modernas (Biome, Vitest, tsup, Turborepo) y sigue muchas de las mejores practicas de la industria para 2025-2026.

### Puntos Fuertes Actuales
- Arquitectura Clean bien definida (domain, core, importers, exporters)
- Factory Pattern implementado correctamente
- Sistema de importacion nativo de Node.js (`#` subpath imports)
- Dual package ESM/CJS correctamente configurado
- Cobertura de tests existente (unit + integration)
- TypeScript strict mode habilitado
- Toolchain moderno (Biome, tsup, Vitest, Turborepo)

### Areas de Mejora Identificadas
- 41 mejoras totales identificadas
- 8 mejoras criticas/arquitecturales
- 15 mejoras moderadas
- 18 mejoras menores/cosmeticas

---

## SECCION 1: MEJORAS CRITICAS (Alto Impacto)

### 1.1 Habilitar `noUncheckedIndexedAccess` en tsconfig.json

**Archivo:** `tsconfig.json`
**Prioridad:** CRITICA
**Esfuerzo:** Medio-Alto

**Problema:**
El proyecto NO tiene habilitado `noUncheckedIndexedAccess`, lo cual es una practica recomendada en 2025 para maxima seguridad de tipos. Esto significa que accesos a arrays como `arr[0]` devuelven `T` en lugar de `T | undefined`.

**Evidencia en el codigo:**
```typescript
// src/domain/stats.ts:31
const firstClipping = bookClippings[0];
if (!firstClipping) continue;  // Manual check necesario

// src/templates/engine.ts:131
const first = clippings[0];  // Sin verificacion de undefined
```

**Solucion:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

**Beneficio:** Eliminaria errores potenciales en runtime donde se accede a indices que pueden no existir.

**Referencia:** [The Strictest TypeScript Config](https://whatislove.dev/articles/the-strictest-typescript-config/)

---

### 1.2 Implementar Result Pattern para Manejo de Errores

**Archivos afectados:** Todos los importers/exporters y processor
**Prioridad:** CRITICA
**Esfuerzo:** Alto

**Problema:**
El proyecto usa un patron hibrido de manejo de errores con `success: boolean` en algunos lugares y excepciones en otros. Esto no es type-safe y puede causar errores no manejados.

**Estado actual:**
```typescript
// src/importers/core/types.ts:17-25
export interface ImportResult {
  success: boolean;  // No type-safe
  clippings: Clipping[];
  warnings: string[];
  error?: Error;  // Opcional, puede ser ignorado
  meta?: Record<string, unknown>;
}
```

**Solucion recomendada:**
Implementar el patron Result usando neverthrow o similar:

```typescript
import { Result, ok, err } from 'neverthrow';

type ImportError =
  | { type: 'PARSE_ERROR'; message: string; blockIndex?: number }
  | { type: 'ENCODING_ERROR'; message: string }
  | { type: 'EMPTY_FILE'; message: string };

type ImportResult = Result<{
  clippings: Clipping[];
  warnings: string[];
  meta?: ImportMeta;
}, ImportError>;

// Uso
const result = await importer.import(content);
result.match(
  (data) => processClippings(data.clippings),
  (error) => handleError(error.type, error.message)
);
```

**Beneficio:**
- Errores como parte de la firma de la funcion
- TypeScript fuerza el manejo de ambos casos
- Eliminacion de excepciones no capturadas
- Mejor testing

**Referencia:** [neverthrow - Type-Safe Errors for TypeScript](https://github.com/supermacro/neverthrow)

---

### 1.3 Separar Types de Implementation (Barrel Exports)

**Archivo:** `src/types/clipping.ts`
**Prioridad:** ALTA
**Esfuerzo:** Bajo

**Problema:**
Los tipos estan mezclados con las re-exportaciones, lo cual puede causar problemas de circular dependencies y tree-shaking.

**Solucion:**
Crear archivos separados para types-only exports:
```
src/types/
  clipping.ts       # Solo interfaces/types
  clipping.types.ts # Re-export explicito (si necesario)
  index.ts          # Barrel con "export type"
```

```typescript
// src/types/index.ts
export type { Clipping, ClippingType, Location } from './clipping.js';
export type { ProcessOptions, ParseResult } from './config.js';
// Usar "export type" para re-exports de tipos
```

---

### 1.4 Falta Validacion de Schema con Zod en Importers

**Archivos:** `src/importers/formats/json.importer.ts`, `src/importers/formats/csv.importer.ts`
**Prioridad:** ALTA
**Esfuerzo:** Medio

**Problema:**
Aunque `zod` esta en las dependencias, los importers JSON/CSV NO validan el schema de entrada. Esto puede causar errores runtime si el JSON importado tiene estructura incorrecta.

**Estado actual:**
```typescript
// src/importers/formats/json.importer.ts:35-39
protected async doParse(content: string): Promise<ImportResult> {
  const data = JSON.parse(content);  // Sin validacion de schema
  // Se asume que data tiene la estructura correcta
}
```

**Solucion:**
```typescript
import { z } from 'zod';

const ClippingSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  author: z.string().default('Unknown'),
  content: z.string(),
  type: z.enum(['highlight', 'note', 'bookmark', 'clip', 'article']),
  page: z.number().nullable().optional(),
  location: z.object({
    raw: z.string(),
    start: z.number(),
    end: z.number().nullable()
  }),
  date: z.coerce.date().nullable().optional(),
  // ... resto de campos
});

const ImportedDataSchema = z.object({
  clippings: z.array(ClippingSchema).optional(),
  books: z.record(z.array(ClippingSchema)).optional(),
}).refine(
  data => data.clippings || data.books,
  { message: 'Must have clippings or books' }
);

// Uso
const parsed = ImportedDataSchema.safeParse(data);
if (!parsed.success) {
  return { success: false, error: new Error(parsed.error.message), ... };
}
```

**Referencia:** Zod ya esta instalado en package.json pero no se usa en importers.

---

### 1.5 Tests sin Coverage Thresholds Configurados

**Archivo:** `vitest.config.ts`
**Prioridad:** ALTA
**Esfuerzo:** Bajo

**Problema:**
La configuracion de coverage no tiene thresholds minimos definidos, permitiendo que la cobertura baje sin alertas.

**Estado actual:**
```typescript
// vitest.config.ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  include: ["src/**/*.ts"],
  exclude: ["src/gui/**", ...],
  // NO HAY THRESHOLDS!
}
```

**Solucion:**
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html", "lcov"],
  include: ["src/**/*.ts"],
  exclude: ["src/gui/**", "**/*.d.ts"],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
    // Thresholds por archivo individual
    perFile: true,
    autoUpdate: true,  // Actualiza cuando mejora
  },
}
```

**Referencia:** [Vitest Coverage Configuration](https://vitest.dev/config/coverage)

---

### 1.6 CLI Manual Argument Parsing (Deberia usar Library)

**Archivo:** `src/cli/index.ts`
**Prioridad:** ALTA
**Esfuerzo:** Medio

**Problema:**
El CLI implementa parsing de argumentos manualmente (lineas 152-223), lo cual es propenso a errores y dificil de mantener.

**Estado actual:**
```typescript
// src/cli/index.ts:152-223
function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--format" || arg === "-f") {
      result.format = args[++i] ?? "";
    }
    // ... 70+ lineas de parsing manual
  }
}
```

**Solucion:**
Usar una libreria establecida como `commander`, `yargs`, o `citty` (mas moderno):

```typescript
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: { name: 'kindle-tools', version: '1.0.0' },
  args: {
    format: { type: 'string', alias: 'f', description: 'Export format' },
    output: { type: 'string', alias: 'o', description: 'Output path' },
    lang: { type: 'string', alias: 'l', description: 'Force language' },
    noMerge: { type: 'boolean', description: 'Disable merging' },
    // Auto-genera --help
  },
  async run({ args }) {
    // ...
  }
});

runMain(main);
```

**Beneficios:**
- Help auto-generado
- Validacion de tipos
- Manejo de errores estandar
- Subcomandos faciles de agregar

---

### 1.7 Duplicacion de Logica de Dates entre Modules

**Archivos:** `src/utils/system/dates.ts`, `src/importers/formats/txt/utils/date-parser.ts`
**Prioridad:** MEDIA-ALTA
**Esfuerzo:** Medio

**Problema:**
Hay logica de parsing y formateo de fechas duplicada entre utils y el parser de TXT.

**Evidencia:**
- `src/utils/system/dates.ts`: `formatDateHuman()`, `formatDateISO()`, `parseDate()`
- `src/importers/formats/txt/utils/date-parser.ts`: `parseDateString()`, logica de locales

**Solucion:**
Consolidar toda la logica de fechas en un solo modulo en domain:

```
src/domain/
  dates.ts         # Toda la logica de fechas
    - parseDateMultiLocale()
    - formatDateHuman()
    - formatDateISO()
    - LOCALE_FORMATS
```

---

### 1.8 Falta Abstraccion del FileSystem

**Archivos:** `src/cli/index.ts`, `src/importers/formats/txt/file-parser.ts`
**Prioridad:** MEDIA-ALTA
**Esfuerzo:** Alto

**Problema:**
El codigo usa `fs` directamente, haciendo dificil:
- Testing sin mocks
- Uso en browser/edge
- Cambio de storage backend

**Estado actual:**
```typescript
// src/cli/index.ts:17
import * as fs from "node:fs/promises";

// src/importers/formats/txt/file-parser.ts
import { readFile } from "node:fs/promises";
```

**Solucion:**
Crear una abstraccion de FileSystem:

```typescript
// src/ports/filesystem.ts
export interface FileSystem {
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, content: string | Buffer): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
}

// src/adapters/node-filesystem.ts
export class NodeFileSystem implements FileSystem {
  async readFile(path: string): Promise<Buffer> {
    return fs.readFile(path);
  }
  // ...
}

// src/adapters/memory-filesystem.ts (para tests)
export class MemoryFileSystem implements FileSystem {
  private files = new Map<string, Buffer>();
  // ...
}
```

---

## SECCION 2: MEJORAS MODERADAS (Impacto Medio)

### 2.1 Constantes Magicas sin Nombrar

**Archivos:** Varios
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
Numeros magicos dispersos sin constantes nombradas.

**Ejemplos:**
```typescript
// src/domain/identity.ts:87
const prefix = contentPrefix.slice(0, 50).toLowerCase();  // Magic: 50

// src/domain/identity.ts:94
return hash.slice(0, 12);  // Magic: 12

// src/core/processing/linker.ts (probable)
const MAX_PROXIMITY_DISTANCE = 10;  // Ya esta nombrado - BIEN

// src/domain/constants.ts:70-76
GARBAGE_LENGTH: 5,      // OK - esta nombrado
SHORT_LENGTH: 75,       // OK
```

**Solucion:**
Agregar a `src/domain/constants.ts`:
```typescript
export const ID_GENERATION = {
  CONTENT_PREFIX_LENGTH: 50,
  HASH_TRUNCATE_LENGTH: 12,
} as const;
```

---

### 2.2 Handlebars Instance No Cacheada

**Archivo:** `src/templates/engine.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
Cada `new TemplateEngine()` crea una nueva instancia de Handlebars con todos los helpers registrados.

**Estado actual:**
```typescript
constructor(customTemplates?: CustomTemplates) {
  this.hbs = createHandlebarsInstance();  // Crea nueva instancia cada vez
  // ...
}
```

**Solucion:**
Cachear la instancia base:

```typescript
// src/templates/helpers.ts
let cachedInstance: typeof Handlebars | null = null;

export function getHandlebarsInstance(): typeof Handlebars {
  if (!cachedInstance) {
    cachedInstance = createHandlebarsInstance();
  }
  return cachedInstance;
}
```

---

### 2.3 Falta @throws JSDoc en Funciones que Lanzan Excepciones

**Archivos:** Varios
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
Funciones que pueden lanzar excepciones no documentan este comportamiento.

**Ejemplo:**
```typescript
// src/domain/identity.ts:15-31
export function sha256Sync(input: string): string {
  try {
    // ...
  } catch {
    // Fallback - OK
  }
  // Pero JSON.parse en otros lugares NO tiene try/catch
}
```

**Solucion:**
Agregar `@throws` a la documentacion JSDoc:

```typescript
/**
 * Parse JSON content into clippings.
 * @param content - JSON string to parse
 * @returns Parsed clippings
 * @throws {SyntaxError} If content is not valid JSON
 * @throws {ValidationError} If JSON schema is invalid
 */
```

---

### 2.4 Console.log en Produccion (CLI)

**Archivo:** `src/cli/index.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
El CLI usa `console.log` directamente, lo cual esta bien para CLI pero deberia tener una abstraccion para testing.

**Estado actual:**
```typescript
// src/cli/index.ts:42-43
const log = console.log.bind(console);
const error = console.error.bind(console);
```

**Solucion (opcional):**
Crear un logger inyectable:

```typescript
interface Logger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const consoleLogger: Logger = {
  log: console.log.bind(console),
  error: console.error.bind(console),
};

// En tests
const mockLogger: Logger = {
  log: vi.fn(),
  error: vi.fn(),
};
```

---

### 2.5 Empty Blocks Vacios (Posible Bug)

**Archivo:** `src/domain/sanitizers.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
Hay un bloque if vacio que parece codigo incompleto.

```typescript
// src/domain/sanitizers.ts:101-103
if (char === ")") {
  depth++;
  if (depth === 1) {
    // BLOQUE VACIO - Bug potencial?
  }
}
```

**Solucion:**
Revisar si falta logica o eliminar el if interno si no es necesario.

---

### 2.6 Falta Test para Edge Cases de Encoding

**Archivo:** `src/utils/text/encoding.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Medio

**Problema:**
El manejo de UTF-16 BE no esta completamente implementado.

```typescript
// src/utils/text/encoding.ts:29-31
if (buffer[0] === 0xfe && buffer[1] === 0xff) {
  // Node.js doesn't have utf16be, but we can handle it
  return "utf16le"; // Will need byte swap, but this is rare for Kindle
}
```

**Solucion:**
Implementar el byte swap o documentar la limitacion claramente con tests que validen el comportamiento.

---

### 2.7 Biome 2.0 Type Inference No Habilitado

**Archivo:** `biome.json`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
Biome 2.0 (Junio 2025) introdujo capacidades de inferencia de tipos, pero no estan habilitadas.

**Solucion:**
Actualizar a Biome 2.0+ y habilitar inferencia:
```json
{
  "linter": {
    "enabled": true,
    "typeInference": true
  }
}
```

**Referencia:** [Biome 2.0 Release](https://biomejs.dev/)

---

### 2.8 Falta Re-export de Errores Tipados

**Archivo:** `src/index.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
El API publico no exporta tipos de error para que los consumidores puedan hacer type narrowing.

**Solucion:**
```typescript
// src/errors/index.ts
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly blockIndex?: number,
    public readonly rawContent?: string
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class ValidationError extends Error { /* ... */ }
export class ExportError extends Error { /* ... */ }

// src/index.ts
export { ParseError, ValidationError, ExportError } from './errors/index.js';
```

---

### 2.9 Inconsistencia en Naming: "process" vs "processClippings"

**Archivos:** `src/core/processor.ts`, `src/cli/index.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
La funcion se llama `process` en el export pero se importa como `processClippings` en el CLI.

```typescript
// src/core/processor.ts
export function process(...)  // Nombre generico

// src/cli/index.ts:23
import { process as processClippings } from "#core/processor.js";
```

**Solucion:**
Renombrar a `processClippings` en el source para consistencia.

---

### 2.10 Patron Singleton Implicito en Factories

**Archivos:** `src/importers/core/factory.ts`, `src/exporters/core/factory.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
Las factories crean nuevas instancias cada vez, pero los importers/exporters son stateless.

```typescript
// src/importers/core/factory.ts
static getImporter(input: string): Importer {
  // ... switch/case
  return new TxtImporter();  // Nueva instancia cada vez
}
```

**Solucion:**
Cachear instancias si son stateless:

```typescript
const importerCache = new Map<string, Importer>();

static getImporter(input: string): Importer {
  const type = this.detectType(input);
  if (!importerCache.has(type)) {
    importerCache.set(type, this.createImporter(type));
  }
  return importerCache.get(type)!;
}
```

---

### 2.11 `any` Types en Codigo

**Archivos:** `src/domain/identity.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
Hay uso de `any` con biome-ignore, aunque es necesario para compatibilidad Node.js.

```typescript
// src/domain/identity.ts:21-23
// biome-ignore lint/suspicious/noExplicitAny: Dynamic require
const crypto = (globalThis as any).process?.versions?.node
  ? (require as any)("node:crypto")
  : null;
```

**Solucion:**
Crear un tipo helper o usar tipado condicional:

```typescript
declare const globalThis: {
  process?: { versions?: { node?: string } };
};

type CryptoModule = typeof import('node:crypto');
```

---

### 2.12 Tests de Integracion Faltantes para Exporters

**Archivo:** `tests/integration/`
**Prioridad:** MEDIA
**Esfuerzo:** Medio

**Problema:**
Solo hay test de integracion para pipeline y CLI. Faltan tests de integracion que validen el flujo completo Import -> Process -> Export para cada formato.

**Solucion:**
Agregar `tests/integration/export-formats.test.ts`:

```typescript
describe('Export Integration', () => {
  const sampleClippings = [/* fixtures */];

  it.each(['json', 'csv', 'md', 'html', 'obsidian', 'joplin'])(
    'should export to %s format correctly',
    async (format) => {
      const exporter = ExporterFactory.getExporter(format);
      const result = await exporter.export(sampleClippings);
      expect(result.success).toBe(true);
      // Validaciones especificas por formato
    }
  );
});
```

---

### 2.13 Falta `exactOptionalPropertyTypes` en tsconfig

**Archivo:** `tsconfig.json`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
Esta opcion de TypeScript strict adicional no esta habilitada.

**Solucion:**
```json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": true
  }
}
```

Esto diferencia entre `prop?: string` (puede ser undefined) y `prop: string | undefined` (explicitamente undefined).

---

### 2.14 Falta Validacion de Inputs en Funciones Publicas

**Archivos:** Varios
**Prioridad:** MEDIA
**Esfuerzo:** Medio

**Problema:**
Las funciones del API publico no validan inputs, confiando en que TypeScript los valida en compile time.

```typescript
// src/core/processor.ts
export function process(
  clippings: Clipping[],  // Que pasa si es null/undefined en runtime?
  options: ProcessOptions
): ProcessResult {
  // Sin validacion de inputs
}
```

**Solucion:**
Agregar validacion con Zod en el API boundary:

```typescript
export function process(
  clippings: unknown,
  options: unknown
): ProcessResult {
  const validatedClippings = ClippingsArraySchema.parse(clippings);
  const validatedOptions = ProcessOptionsSchema.parse(options);
  return processInternal(validatedClippings, validatedOptions);
}
```

---

### 2.15 Version CLI Hardcodeada

**Archivo:** `src/cli/index.ts`
**Prioridad:** MEDIA
**Esfuerzo:** Bajo

**Problema:**
La version esta hardcodeada en lugar de leerse del package.json.

```typescript
// src/cli/index.ts:74
const CLI_VERSION = "1.0.0";  // Hardcoded
```

**Solucion:**
Leer de package.json en build time o runtime:

```typescript
// Opcion 1: Build time (tsup puede inyectar)
const CLI_VERSION = __VERSION__;  // Definido en tsup.config.ts

// Opcion 2: Runtime
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
```

---

## SECCION 3: MEJORAS MENORES (Bajo Impacto)

### 3.1 Comentarios TODO sin Tracking

**Archivos:** Varios
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
Hay comentarios TODO sin issue tracking asociado.

**Solucion:**
Usar formato estandar: `// TODO(#123): descripcion` o eliminar TODOs obsoletos.

---

### 3.2 Imports No Ordenados Consistentemente

**Archivos:** Varios
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
Aunque Biome formatea, los imports no siguen un orden consistente (externos primero, luego internos).

**Solucion:**
Configurar regla de ordenamiento en biome.json:
```json
{
  "organizeImports": {
    "enabled": true
  }
}
```

---

### 3.3 JSDoc Incompleto en Algunas Funciones Exportadas

**Archivos:** Varios
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
Algunas funciones publicas no tienen JSDoc completo con @param y @returns.

---

### 3.4 Uso de `Record<string, unknown>` Generico

**Archivos:** `src/importers/core/types.ts`
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
```typescript
meta?: Record<string, unknown>;  // Muy generico
```

**Solucion:**
Crear un tipo especifico:
```typescript
interface ImportMeta {
  detectedLanguage?: SupportedLanguage;
  totalBlocks?: number;
  parsedBlocks?: number;
  encoding?: string;
}
```

---

### 3.5 Nombres de Tests Podrian Ser Mas Descriptivos

**Archivos:** `tests/**/*.test.ts`
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
Algunos nombres de test son genericos.

```typescript
it("should run all processing steps", () => { ... });
```

**Solucion:**
Usar formato Given-When-Then o mas especifico:
```typescript
it("process() should deduplicate, merge, and link notes in correct order", () => { ... });
```

---

### 3.6 Falta .npmrc con Configuracion de pnpm

**Prioridad:** BAJA
**Esfuerzo:** Minimo

**Solucion:**
Agregar `.npmrc`:
```ini
strict-peer-dependencies=true
auto-install-peers=false
```

---

### 3.7 Scripts npm Podrian Usar Turborepo Mas

**Archivo:** `package.json`
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
Algunos scripts no aprovechan el caching de Turborepo.

```json
"scripts": {
  "build:gui": "vite build --config vite.config.gui.ts",  // No usa turbo
}
```

**Solucion:**
```json
"scripts": {
  "build:gui": "turbo run build:gui",
}
```

---

### 3.8 Falta LICENSE File en Root

**Prioridad:** BAJA
**Esfuerzo:** Minimo

**Problema:**
Aunque package.json dice `"license": "MIT"`, no hay archivo LICENSE.

**Solucion:**
Agregar `LICENSE` con texto MIT estandar.

---

### 3.9 Git Hooks Podrian Incluir Type Check

**Archivo:** `package.json` (husky config)
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
Los git hooks solo ejecutan lint y format, no type check.

**Solucion:**
Agregar `tsc --noEmit` al pre-commit hook.

---

### 3.10 Falta CONTRIBUTING.md

**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Solucion:**
Crear guia de contribucion con:
- Setup del entorno
- Convencion de commits
- Proceso de PR

---

### 3.11 package.json `"type": "module"` Documentacion

**Prioridad:** BAJA
**Esfuerzo:** Minimo

**Problema:**
El proyecto usa ESM nativo pero no hay documentacion para usuarios sobre compatibilidad.

**Solucion:**
Agregar seccion en README sobre requisitos de Node.js >= 18 y ESM.

---

### 3.12 Falta Changelog Automatizado

**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
No hay CHANGELOG.md ni automatizacion con changesets (aunque esta en devDeps).

**Solucion:**
Configurar changesets completamente.

---

### 3.13 Error Messages No Internacionalizados

**Prioridad:** BAJA
**Esfuerzo:** Alto

**Problema:**
Los mensajes de error estan en ingles hardcodeado.

**Nota:** Esto es aceptable para una libreria tecnica. Solo mencionar si se planea soporte multi-idioma.

---

### 3.14 Falta Seccion "Breaking Changes" en Exports

**Archivo:** `src/index.ts`
**Prioridad:** BAJA
**Esfuerzo:** Minimo

**Solucion:**
Agregar comentarios sobre API publica para mantener compatibilidad:

```typescript
// === PUBLIC API ===
// These exports are part of the public API and follow semver.
// Breaking changes require major version bump.
export { process } from "#core/processor.js";
```

---

### 3.15 Posible Mejora de Performance en groupByBook

**Archivo:** `src/domain/stats.ts`
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
`groupByBook` crea un nuevo Map cada vez.

```typescript
export function groupByBook(clippings: Clipping[]): Map<string, Clipping[]> {
  const map = new Map<string, Clipping[]>();
  // ...
}
```

**Solucion (micro-optimizacion):**
Considerar usar `Object.groupBy` (ES2024) si target lo permite, o documentar que es O(n).

---

### 3.16 Falta Tipado Estricto para HTML Entities

**Archivo:** `src/exporters/formats/html.exporter.ts`
**Prioridad:** BAJA
**Esfuerzo:** Bajo

**Problema:**
La funcion `escapeHtml` (heredada de BaseExporter) no esta tipada estrictamente.

**Solucion:**
Crear tipo branded string:
```typescript
type SafeHtml = string & { __brand: 'SafeHtml' };
function escapeHtml(unsafe: string): SafeHtml;
```

---

### 3.17 Dependencia jszip vs Native Compression

**Archivo:** `package.json`
**Prioridad:** BAJA
**Esfuerzo:** Medio

**Problema:**
Se usa jszip pero Node.js 22+ tiene soporte nativo de compresion.

**Nota:** Mantener jszip para compatibilidad con browser. Pero documentar la decision.

---

### 3.18 Falta Seccion de Seguridad (SECURITY.md)

**Prioridad:** BAJA
**Esfuerzo:** Minimo

**Solucion:**
Agregar SECURITY.md con politica de reporte de vulnerabilidades.

---

## SECCION 4: ANALISIS DE CONFORMIDAD CON ESTANDARES

### 4.1 Comparacion con Clean Architecture (Uncle Bob)

| Principio | Estado | Notas |
|-----------|--------|-------|
| Independencia de Frameworks | OK | Core no depende de frameworks externos |
| Testabilidad | OK | Core es puro y testeable |
| Independencia de UI | OK | CLI separado de core |
| Independencia de DB | N/A | No usa DB |
| Independencia de Agentes Externos | PARCIAL | Importers/Exporters bien separados, pero fs no abstraido |

### 4.2 Comparacion con DDD Tactico

| Patron | Estado | Notas |
|--------|--------|-------|
| Entidades | OK | `Clipping` como entidad principal |
| Value Objects | PARCIAL | `Location` podria ser VO mas explicito |
| Aggregates | N/A | No necesario para este dominio |
| Repositories | NO | No hay persistencia |
| Factories | OK | `ImporterFactory`, `ExporterFactory` |
| Domain Services | OK | Funciones puras en `domain/` |

### 4.3 Conformidad TypeScript 2025

| Practica | Estado | Notas |
|----------|--------|-------|
| Strict Mode | OK | Habilitado |
| noUncheckedIndexedAccess | NO | PENDIENTE |
| exactOptionalPropertyTypes | NO | PENDIENTE |
| No enums (use const objects) | OK | Usa `as const` |
| No namespaces | OK | No usa namespaces |
| Result pattern | NO | Usa success: boolean |

### 4.4 Conformidad Toolchain 2025

| Herramienta | Estado | Version | Ideal 2025 |
|-------------|--------|---------|------------|
| TypeScript | OK | 5.7.3 | 5.7+ |
| Node.js | OK | 22 (.nvmrc) | 22+ |
| Biome | OK | 1.9.4 | 2.0+ |
| Vitest | OK | 2.1.8 | 2.x |
| tsup | OK | 8.3.5 | 8.x |
| pnpm | OK | 9.15.2 | 9.x |

---

## SECCION 5: RESUMEN DE PRIORIDADES

### Implementar Inmediatamente (Sprint 1)
1. [x] 1.1 - noUncheckedIndexedAccess
2. [x] 1.5 - Coverage thresholds
3. [x] 2.5 - Fix empty block (posible bug)

### Implementar Pronto (Sprint 2)
4. [ ] 1.4 - Zod validation en importers
5. [ ] 1.2 - Result pattern (neverthrow)
6. [ ] 1.6 - CLI library (commander/citty)

### Planificar (Backlog)
7. [ ] 1.8 - FileSystem abstraction
8. [ ] 1.3 - Separar types de implementation
9. [ ] 2.12 - Integration tests para exporters

### Mejoras Continuas
- Completar JSDoc
- Agregar tests de edge cases
- Mejorar naming consistency

---

## Fuentes y Referencias

### TypeScript Best Practices
- [The Strictest TypeScript Config](https://whatislove.dev/articles/the-strictest-typescript-config/)
- [TypeScript Best Practices 2025](https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025-a-guide-for-experienced-developers-4fca1cfdf052)
- [TypeScript Best Practices for Large-Scale Web Applications in 2026](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/)

### Architecture
- [Clean Architecture with TypeScript](https://bazaglia.com/clean-architecture-with-typescript-ddd-onion/)
- [Clean Architecture and DDD 2025](https://wojciechowski.app/en/articles/clean-architecture-domain-driven-design-2025)
- [Typical TypeScript Clean Architecture](https://www.zacfukuda.com/blog/typical-typescript-clean-architecture)

### Error Handling
- [neverthrow - Type-Safe Errors](https://github.com/supermacro/neverthrow)
- [Result Pattern in TypeScript](https://arg-software.medium.com/functional-error-handling-in-typescript-with-the-result-pattern-5b96a5abb6d3)

### Tooling
- [Biome vs ESLint 2025](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c)
- [Vitest Coverage Configuration](https://vitest.dev/config/coverage)
- [Dual Publishing ESM and CJS with tsup](https://johnnyreilly.com/dual-publishing-esm-cjs-modules-with-tsup-and-are-the-types-wrong)

### Package Publishing
- [TypeScript in 2025 with ESM and CJS](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing)
- [Ship ESM & CJS in one Package](https://antfu.me/posts/publish-esm-and-cjs)

---

*Documento generado: 2026-01-07*
*Total de mejoras identificadas: 41*
