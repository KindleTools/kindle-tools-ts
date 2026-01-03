# ROADMAP - KindleToolsTS

Plan de implementación de mejoras para el proyecto TypeScript. Este documento sirve como guía para Claude Code.

---

## Estado Actual

**Versión:** 1.x
**Arquitectura:** Librería + CLI + GUI Browser
**Idiomas:** 11 soportados
**Exportadores:** 6 (JSON, CSV, Markdown, Obsidian, Joplin/JEX, HTML)

### Fortalezas
- API bien tipada con TypeScript
- Más idiomas que el proyecto Python original (11 vs 6)
- HTML Exporter con dark mode y search
- Quality flags granulares (suspicious highlights, fuzzy duplicates)
- Funciona en Node.js y browser (isomórfico)

### Gaps Principales vs Python
1. ~~Solo soporta UTF-8~~ ✅ Implementado encoding fallback (UTF-8, UTF-16, latin1)
2. ~~Tags no se preservan durante merge~~ ✅ Implementado tag merge en deduplicación
3. JEX solo tiene 2 niveles de notebooks (Python tiene 3: Root > Author > Book)
4. No hay archivo de configuración persistente

---

## Plan de Implementación

Las tareas están ordenadas por **dependencias lógicas** y **valor incremental**.

---

## Fase 1: Robustez y Compatibilidad ✅ COMPLETADA

> **Implementado en commit `d3de3ea`** - 2026-01-03
> - Encoding detection con fallback (BOM detection + latin1)
> - Tag merge durante deduplicación y smart merge
> - Range coverage linking para notas (con fallback a proximidad)
> - 17 nuevos tests en `tests/unit/processor.test.ts`

### 1.1 Encoding Fallback Chain ✅
**Prioridad:** Alta
**Impacto:** Usuarios con Kindles antiguos o Windows

**Problema:** `parseFile()` solo lee UTF-8. Archivos en cp1252 o latin-1 fallan.

**Archivos a modificar:**
- [parser.ts](src/core/parser.ts) - función `parseFile()`

**Implementación:**
```typescript
// Opción A: Usar librería chardet
import { detect } from 'chardet';

async function parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult> {
  const buffer = await fs.readFile(filePath);
  const detectedEncoding = detect(buffer) || 'utf-8';
  const content = buffer.toString(detectedEncoding as BufferEncoding);
  return parseString(content, options);
}

// Opción B: Fallback chain manual (sin dependencia externa)
const ENCODINGS = ['utf-8', 'utf-16le', 'latin1'] as const;

async function parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult> {
  const buffer = await fs.readFile(filePath);

  // Detectar BOM para UTF-16
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return parseString(buffer.toString('utf-16le'), options);
  }

  // UTF-8 con BOM
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return parseString(buffer.toString('utf-8'), options);
  }

  // Default UTF-8, Node maneja latin1 como fallback implícito
  return parseString(buffer.toString('utf-8'), options);
}
```

**Decisión necesaria:** ¿Añadir dependencia `chardet` (~50KB) o usar detección básica por BOM?

**Tests a añadir:**
- `tests/fixtures/` con archivos en diferentes encodings
- Test de parseo de archivo cp1252

---

### 1.2 Merge de Tags durante Deduplicación ✅
**Prioridad:** Alta
**Impacto:** Los tags del usuario no se pierden al mergear highlights

**Problema:** Cuando se detecta un duplicado o se hace merge, los tags del clipping eliminado se pierden.

**Archivos a modificar:**
- [processor.ts](src/core/processor.ts) - funciones `removeDuplicates()` y `smartMergeHighlights()`

**Implementación:**
```typescript
// En removeDuplicates()
function removeDuplicates(clippings: Clipping[]): Clipping[] {
  const seen = new Map<string, Clipping>();

  for (const clipping of clippings) {
    const hash = generateDuplicateHash(clipping);
    const existing = seen.get(hash);

    if (existing) {
      // NUEVO: Mergear tags antes de descartar
      if (clipping.tags?.length) {
        existing.tags = [...new Set([...(existing.tags || []), ...clipping.tags])];
      }
    } else {
      seen.set(hash, clipping);
    }
  }

  return Array.from(seen.values());
}

// En smartMergeHighlights() - similar lógica al mergear overlapping
function mergeClippings(survivor: Clipping, absorbed: Clipping): Clipping {
  return {
    ...survivor,
    content: survivor.content.length >= absorbed.content.length
      ? survivor.content
      : absorbed.content,
    tags: [...new Set([...(survivor.tags || []), ...(absorbed.tags || [])])],
    // ... resto de propiedades
  };
}
```

**Tests a añadir:**
- Test de merge que preserve tags de ambos clippings
- Test de deduplicación con tags

---

### 1.3 Range Coverage para Linking de Notas ✅
**Prioridad:** Media
**Impacto:** Mejor precisión al asociar notas con highlights largos

**Problema actual:** Usa distancia fija de 10 locations. Python usa range coverage (nota dentro del rango del highlight).

**Archivos a modificar:**
- [processor.ts](src/core/processor.ts) - función `linkNotesToHighlights()`

**Implementación:**
```typescript
function linkNotesToHighlights(clippings: Clipping[]): Clipping[] {
  const highlights = clippings.filter(c => c.type === 'highlight');
  const notes = clippings.filter(c => c.type === 'note');

  for (const note of notes) {
    if (!note.location?.start) continue;

    // Buscar highlight que contenga la nota (range coverage)
    const matchingHighlight = highlights.find(h => {
      if (h.title !== note.title) return false;
      if (!h.location?.start || !h.location?.end) return false;

      // La nota debe estar dentro del rango del highlight
      return h.location.start <= note.location.start &&
             note.location.start <= h.location.end;
    });

    // Fallback: distancia de 10 si no hay match por rango
    const fallbackHighlight = !matchingHighlight
      ? highlights.find(h =>
          h.title === note.title &&
          Math.abs((h.location?.start || 0) - (note.location?.start || 0)) <= 10
        )
      : null;

    const linkedHighlight = matchingHighlight || fallbackHighlight;

    if (linkedHighlight) {
      linkedHighlight.linkedNotes = linkedHighlight.linkedNotes || [];
      linkedHighlight.linkedNotes.push(note);
    }
  }

  return clippings;
}
```

---

## Fase 2: Mejoras en Exportadores ✅ COMPLETADA

> **Implementado en 2026-01-03**
> - Estructura de carpetas configurable para Obsidian y Joplin (flat, by-book, by-author, by-author-book)
> - Case configurable para nombres de autor (original, uppercase, lowercase)
> - Tags del clipping sincronizados en frontmatter (Obsidian) y como tags Joplin
> - CSV ahora incluye columna de tags
> - JSON ahora siempre incluye campo tags (vacío si no hay)
> - GUI actualizada con nuevas opciones de exportación

### 2.1 Jerarquía de 3 Niveles en JEX (Joplin) ✅
**Prioridad:** Media
**Impacto:** Mejor organización para usuarios con muchos libros

**Problema:** TypeScript solo crea `Root > Book`. Python crea `Root > Author > Book`.

**Archivos a modificar:**
- [joplin.exporter.ts](src/exporters/joplin.exporter.ts)
- [exporter.ts](src/types/exporter.ts) - añadir opción

**Implementación:**
```typescript
// En types/exporter.ts
interface JoplinExporterOptions extends ExporterOptions {
  groupByAuthor?: boolean;  // Default: false (backward compatible)
  authorCase?: 'original' | 'uppercase' | 'lowercase';  // Default: 'uppercase'
}

// En joplin.exporter.ts
function createNotebookHierarchy(
  clippings: Clipping[],
  rootName: string,
  options: JoplinExporterOptions
): JoplinNotebook[] {
  const notebooks: JoplinNotebook[] = [];
  const root = createNotebook(rootName);
  notebooks.push(root);

  if (options.groupByAuthor) {
    // Agrupar por autor primero
    const byAuthor = groupBy(clippings, c => c.author || 'Unknown');

    for (const [author, authorClippings] of Object.entries(byAuthor)) {
      const authorName = options.authorCase === 'uppercase'
        ? author.toUpperCase()
        : author;
      const authorNotebook = createNotebook(authorName, root.id);
      notebooks.push(authorNotebook);

      // Luego por libro dentro del autor
      const byBook = groupBy(authorClippings, c => c.title);
      for (const [title, bookClippings] of Object.entries(byBook)) {
        const bookNotebook = createNotebook(title, authorNotebook.id);
        notebooks.push(bookNotebook);
        // ... crear notas
      }
    }
  } else {
    // Comportamiento actual: solo por libro
    // ...
  }

  return notebooks;
}
```

---

### 2.2 ZIP Export para Obsidian
**Prioridad:** Baja (pospuesto)
**Impacto:** Más conveniente para importar a Obsidian

**Archivos a modificar:**
- [obsidian.exporter.ts](src/exporters/obsidian.exporter.ts)
- Añadir dependencia: `jszip` o usar `archiver`

**Implementación:**
```typescript
// Opción: Usar API nativa de Node (sin dependencia)
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';  // o implementar con zlib

interface ObsidianExporterOptions extends ExporterOptions {
  zip?: boolean;  // Default: false
  structure?: 'flat' | 'by-author' | 'by-author-book';
}

async function exportToZip(
  clippings: Clipping[],
  outputPath: string,
  options: ObsidianExporterOptions
): Promise<ExportResult> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = createWriteStream(outputPath);

  archive.pipe(output);

  const byBook = groupBy(clippings, c => c.title);

  for (const [title, bookClippings] of Object.entries(byBook)) {
    const markdown = generateMarkdown(bookClippings);
    const filename = sanitizeFilename(title) + '.md';

    if (options.structure === 'by-author-book') {
      const author = bookClippings[0]?.author || 'Unknown';
      archive.append(markdown, { name: `${author}/${filename}` });
    } else {
      archive.append(markdown, { name: filename });
    }
  }

  await archive.finalize();

  return {
    files: [{ path: outputPath, content: '' }],
    stats: { totalClippings: clippings.length }
  };
}
```

**Decisión necesaria:** ¿Usar `archiver` (más features) o implementar básico con `zlib` nativo?

---

### 2.3 Estructura de Carpetas Configurable (Markdown/Obsidian) ✅
**Prioridad:** Media
**Impacto:** Flexibilidad para diferentes workflows

**Archivos a modificar:**
- [obsidian.exporter.ts](src/exporters/obsidian.exporter.ts)
- [markdown.exporter.ts](src/exporters/markdown.exporter.ts)
- [exporter.ts](src/types/exporter.ts)

**Implementación:**
```typescript
// En types/exporter.ts
interface MarkdownExporterOptions extends ExporterOptions {
  structure?: 'single' | 'per-book' | 'per-author' | 'per-highlight';
  folderCase?: 'original' | 'uppercase' | 'lowercase';
  filenameFormat?: 'title' | 'author-title' | 'date-title';
}

// Lógica de generación de paths
function getOutputPath(clipping: Clipping, options: MarkdownExporterOptions): string {
  const author = applyCase(clipping.author || 'Unknown', options.folderCase);
  const title = sanitizeFilename(clipping.title);

  switch (options.structure) {
    case 'per-author':
      return `${author}/${title}.md`;
    case 'per-highlight':
      return `${author}/${title}/${clipping.id}.md`;
    default:
      return `${title}.md`;
  }
}
```

---

## Fase 3: Configuración y DX

### 3.1 Archivo de Configuración
**Prioridad:** Media
**Impacto:** Evita pasar argumentos repetitivos en CLI

**Archivos a crear/modificar:**
- Crear [config-loader.ts](src/utils/config-loader.ts)
- Modificar [cli.ts](src/cli.ts)
- Añadir tipo en [config.ts](src/types/config.ts)

**Ubicaciones a buscar (en orden):**
1. `.kindletoolsrc` en directorio actual
2. `.kindletoolsrc` en home del usuario
3. `~/.config/kindle-tools/config.json`

**Implementación:**
```typescript
// src/utils/config-loader.ts
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { z } from 'zod';

const ConfigSchema = z.object({
  language: z.string().optional(),
  format: z.enum(['json', 'csv', 'md', 'obsidian', 'joplin', 'html']).optional(),
  outputDir: z.string().optional(),
  groupByBook: z.boolean().optional(),
  groupByAuthor: z.boolean().optional(),
  extractTags: z.boolean().optional(),
  deduplication: z.boolean().optional(),
  merge: z.boolean().optional(),
}).strict();

export type UserConfig = z.infer<typeof ConfigSchema>;

const CONFIG_PATHS = [
  '.kindletoolsrc',
  join(homedir(), '.kindletoolsrc'),
  join(homedir(), '.config', 'kindle-tools', 'config.json'),
];

export function loadConfig(): UserConfig {
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(content);
        return ConfigSchema.parse(parsed);
      } catch (error) {
        console.warn(`Warning: Invalid config at ${configPath}`);
      }
    }
  }
  return {};
}

// En cli.ts - mergear config con argumentos CLI
const userConfig = loadConfig();
const options = { ...userConfig, ...cliArgs };  // CLI args tienen prioridad
```

---

### 3.2 Logging a Archivo
**Prioridad:** Baja
**Impacto:** Útil para debugging y reportar bugs

**Archivos a modificar:**
- Crear [logger.ts](src/utils/logger.ts)
- Modificar [cli.ts](src/cli.ts) - añadir flag `--log-file`

**Implementación:**
```typescript
// src/utils/logger.ts
import { appendFileSync } from 'fs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logFile: string | null = null;

  setLogFile(path: string) {
    this.logFile = path;
  }

  log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

    if (this.logFile) {
      appendFileSync(this.logFile, logLine);
    }

    if (level === 'error') {
      console.error(message);
    }
  }

  debug(msg: string, data?: unknown) { this.log('debug', msg, data); }
  info(msg: string, data?: unknown) { this.log('info', msg, data); }
  warn(msg: string, data?: unknown) { this.log('warn', msg, data); }
  error(msg: string, data?: unknown) { this.log('error', msg, data); }
}

export const logger = new Logger();
```

---

## Fase 4: Features Avanzados

### 4.1 Templates Personalizados
**Prioridad:** Baja
**Impacto:** Personalización total del output

**Archivos a crear/modificar:**
- Crear [template-engine.ts](src/utils/template-engine.ts)
- Modificar exportadores de Markdown

**Variables disponibles:**
- `{{title}}`, `{{author}}`, `{{content}}`
- `{{page}}`, `{{location}}`, `{{date}}`
- `{{type}}`, `{{tags}}`, `{{wordCount}}`

**Implementación básica (Mustache-like):**
```typescript
// src/utils/template-engine.ts
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    if (value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  });
}

// Uso
const template = '> {{content}}\n\n— *{{title}}* by **{{author}}**';
const output = renderTemplate(template, {
  content: clipping.content,
  title: clipping.title,
  author: clipping.author,
});
```

---

### 4.2 Direct Joplin Sync via API
**Prioridad:** Baja
**Impacto:** Sincronización directa sin importar archivos

**Dependencia:** Joplin Desktop con Web Clipper habilitado (puerto 41184)

**Archivos a crear:**
- [joplin-api.ts](src/integrations/joplin-api.ts)

**Implementación:**
```typescript
// src/integrations/joplin-api.ts
const JOPLIN_PORT = 41184;

interface JoplinApiOptions {
  token: string;
  port?: number;
}

export class JoplinApi {
  private baseUrl: string;
  private token: string;

  constructor(options: JoplinApiOptions) {
    this.baseUrl = `http://localhost:${options.port || JOPLIN_PORT}`;
    this.token = options.token;
  }

  async createNotebook(title: string, parentId?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/folders?token=${this.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, parent_id: parentId }),
    });
    const data = await response.json();
    return data.id;
  }

  async createNote(title: string, body: string, notebookId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/notes?token=${this.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, parent_id: notebookId }),
    });
    const data = await response.json();
    return data.id;
  }

  async syncClippings(clippings: Clipping[], rootNotebook: string): Promise<void> {
    // Crear estructura de notebooks y notas
  }
}
```

---

### 4.3 Filtro "New Only" (desde último import)
**Prioridad:** Baja
**Impacto:** Evita re-importar clippings ya procesados

**Implementación:**
```typescript
// Guardar hash de último clipping procesado
interface ImportState {
  lastImportDate: string;
  lastClippingHash: string;
  processedHashes: string[];
}

// En processor.ts
function filterNewOnly(
  clippings: Clipping[],
  state: ImportState
): Clipping[] {
  return clippings.filter(c =>
    !state.processedHashes.includes(generateDuplicateHash(c))
  );
}
```

---

## Resumen de Prioridades

| Tarea | Fase | Prioridad | Complejidad | Estado |
|-------|------|-----------|-------------|--------|
| Encoding Fallback | 1 | Alta | Baja | ✅ Completado |
| Merge Tags | 1 | Alta | Baja | ✅ Completado |
| Range Coverage Linking | 1 | Media | Baja | ✅ Completado |
| 3-Level JEX | 2 | Media | Media | ✅ Completado |
| Folder Structure Config | 2 | Media | Media | ✅ Completado |
| Clipping Tags Sync | 2 | Media | Baja | ✅ Completado |
| ZIP Export Obsidian | 2 | Baja | Media | Pospuesto |
| Config File | 3 | Media | Baja | Pendiente |
| Logging | 3 | Baja | Baja | Pendiente |
| Templates | 4 | Baja | Media | Pendiente |
| Joplin API Sync | 4 | Baja | Alta | Pendiente |
| New Only Filter | 4 | Baja | Media | Pendiente |

---

## Referencia Técnica

### Archivos Principales por Área

| Área | Archivos |
|------|----------|
| Parsing | [parser.ts](src/core/parser.ts), [tokenizer.ts](src/core/tokenizer.ts) |
| Processing | [processor.ts](src/core/processor.ts), [similarity.ts](src/utils/similarity.ts) |
| Exports | [src/exporters/](src/exporters/) (6 archivos) |
| Types | [src/types/](src/types/) (6 archivos) |
| CLI | [cli.ts](src/cli.ts) |
| GUI | [src/gui/](src/gui/) (3 archivos) |

### Comparación con Python (Referencia)

| Funcionalidad | Python | TypeScript |
|--------------|--------|------------|
| Idiomas | 6 | 11 |
| Encodings | utf-8-sig, cp1252, latin-1 | Solo utf-8 |
| Tag merge on dedup | Si | No (pendiente) |
| JEX hierarchy | 3 niveles | 2 niveles |
| Config file | Si | No (pendiente) |
| HTML export | No | Si |
| Quality flags | Básico | Detallado |
| GUI | PyQt5 Desktop | Browser |

### Diferencias de Implementación

**Linking de notas:**
- Python: Range coverage (`H.start <= Note <= H.end`)
- TypeScript: Distancia fija (`abs(H.start - N.start) <= 10`)

**IDs determinísticos:**
- Python: SHA-256 completo con contenido completo
- TypeScript: SHA-256 truncado a 12 chars con prefijo de contenido

**Deduplicación:**
- Python: Flag `is_duplicate`
- TypeScript: Múltiples flags (`isSuspiciousHighlight`, `possibleDuplicateOf`, `similarityScore`)
