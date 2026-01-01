# ROADMAP - KindleToolsTS vs KindleClippingsToJEX (Python)

Análisis comparativo entre el proyecto TypeScript (`kindle-tools-ts`) y el proyecto Python original (`KindleClippingsToJEX`). El objetivo es identificar funcionalidades, patrones y mejoras que se pueden aplicar al proyecto TypeScript.

---

## 📊 Tabla Comparativa de Funcionalidades

| Funcionalidad | Python 🐍 | TypeScript 📘 | Estado TS | Notas |
|--------------|-----------|---------------|-----------|-------|
| **Parsing** |||||
| Multi-idioma (6 idiomas) | ✅ | ✅ (11 idiomas) | ✅ Mejor | TS soporta más idiomas |
| Detección automática de idioma | ✅ Score-based | ✅ Score-based | ✅ Igual | Ambos usan conteo de keywords |
| Patrones de idioma en JSON | ✅ Archivo externo | ✅ Constantes TS | ✅ Diferente | TS más type-safe |
| Manejo de encodings múltiples | ✅ utf-8-sig, cp1252, latin-1 | ⚠️ Solo utf-8 | 🔴 Falta | Python más robusto |
| **Deduplicación** |||||
| Eliminación de duplicados exactos | ✅ | ✅ | ✅ Igual | SHA-256 hash |
| Smart merge de overlapping highlights | ✅ | ✅ | ✅ Igual | Ambos detectan extensiones |
| Flagging accidental highlights | ✅ Flags `is_duplicate` | ✅ Flags `isSuspiciousHighlight` | ✅ Igual | Diferentes nombres |
| Umbral de fragmentos (<75 chars) | ✅ | ✅ | ✅ Igual | Mismo umbral |
| Merge de tags durante deduplicación | ✅ `_merge_tags()` | ⚠️ No | 🔴 Falta | Python rescata tags al mergear |
| **Linking de Notas** |||||
| Asociación nota→highlight | ✅ Range coverage | ✅ Distancia 10 locs | ✅ Similar | Python: Start ≤ Note ≤ End |
| Extracción de tags desde notas | ✅ | ✅ | ✅ Igual | Soporta `,`, `;`, newlines |
| **Limpieza de Texto** |||||
| Unicode NFC normalization | ✅ | ✅ | ✅ Igual | |
| De-hyphenation (PDF artifacts) | ✅ | ✅ | ✅ Igual | Mismo regex pattern |
| Espacios antes de puntuación | ✅ | ✅ | ✅ Igual | |
| Capitalizar primera letra | ✅ | ✅ | ✅ Igual | |
| Limpieza de títulos (ediciones) | ✅ | ✅ | ✅ Igual | Ambos limpian "(Spanish Edition)" etc |
| **Generación de IDs** |||||
| IDs determinísticos | ✅ SHA-256 | ✅ SHA-256 | ✅ Igual | Permite re-importar sin duplicar |
| ID basado en contenido (no fecha) | ✅ | ✅ | ✅ Igual | |
| **Exportadores** |||||
| JEX (Joplin) | ✅ | ✅ | ✅ Igual | Tarball con markdown |
| CSV | ✅ UTF-8-SIG | ✅ BOM | ✅ Igual | Excel compatible |
| JSON | ✅ | ✅ | ✅ Igual | |
| Markdown (Obsidian ZIP) | ✅ ZIP con YAML | ✅ Individual files | ✅ Diferente | Python genera ZIP, TS archivos sueltos |
| HTML standalone | ❌ | ✅ | ✅ Mejor | TS tiene dark mode, search |
| **JEX Específico** |||||
| Notebooks jerárquicos | ✅ Root/Author/Book | ✅ Root/Book | ⚠️ Diferente | Python 3 niveles, TS 2 niveles |
| IDs determinísticos de notebooks | ✅ MD5 | ✅ SHA-256 | ✅ Similar | Different hash algo |
| IDs determinísticos de tags | ✅ | ✅ | ✅ Igual | |
| Geo-location en notas | ✅ lat/lon/alt | ✅ | ✅ Igual | |
| Página estimada desde location | ✅ `KINDLE_LOCATION_RATIO=16.69` | ✅ `~16 locs/page` | ✅ Igual | |
| Zero-padded page `[0042]` | ✅ | ✅ | ✅ Igual | |
| **GUI** |||||
| Interfaz gráfica | ✅ PyQt5 "Zen" | ❌ | 🔴 N/A | TS es librería/CLI |
| Drag & Drop | ✅ | ❌ N/A | - | |
| Edición en línea | ✅ | ❌ N/A | - | |
| Live stats | ✅ | ❌ N/A | - | |
| Exportar selección | ✅ | ❌ N/A | - | |
| **CLI** |||||
| CLI completo | ✅ argparse | ✅ Custom | ✅ Igual | |
| Selección de formato | ✅ | ✅ | ✅ Igual | |
| --no-clean flag | ✅ | ✅ --no-dedup, --no-merge | ✅ Igual | |
| Configuración JSON | ✅ config/config.json | ❌ | 🔴 Falta | Python tiene config file |
| **Logging/Stats** |||||
| Logging estructurado | ✅ Python logging | ⚠️ console | ⚠️ Básico | Python tiene app.log |
| Estadísticas de parsing | ✅ failed_blocks, titles_cleaned | ✅ warnings | ✅ Similar | |
| Stats de PDFs limpiados | ✅ pdfs_cleaned | ⚠️ contentWasCleaned | ✅ Similar | |
| **Arquitectura** |||||
| Separación domain/services | ✅ DDD-like | ✅ core/utils/types | ✅ Similar | |
| Dataclasses/Interfaces | ✅ Python dataclasses | ✅ TypeScript interfaces | ✅ Igual | |
| Base exporter abstracto | ✅ BaseExporter | ✅ Exporter interface | ✅ Igual | |

---

## 🔴 Funcionalidades que FALTAN en TypeScript

### 1. **Encoding Fallback Chain** ⭐⭐⭐
El proyecto Python intenta múltiples encodings al leer el archivo:
```python
encodings_to_try = ["utf-8-sig", "utf-8", "cp1252", "latin-1"]
```
**Por qué importa:** Usuarios con Kindles antiguos o archivos de Windows pueden tener archivos en cp1252 o latin-1 que fallarían en Node.js con UTF-8.

**Acción:** Implementar detección de encoding o fallback chain en `parseFile()`.

---

### 2. **Merge de Tags durante Deduplicación** ⭐⭐
Cuando Python detecta un duplicado, transfiere los tags del duplicado al "survivor":
```python
def _merge_tags(self, source: Clipping, target: Clipping):
    if source.tags:
        existing_tags = set(target.tags)
        for tag in source.tags:
            if tag not in existing_tags:
                target.tags.append(tag)
```
**Por qué importa:** Si el usuario añade un tag a una nota que luego se mergea, el tag se pierde en TS.

**Acción:** Modificar `smartMergeHighlights()` y `removeDuplicates()` para preservar tags.

---

### 3. **Jerarquía de 3 Niveles en JEX** ⭐⭐
Python organiza los notebooks: `Root > Author (UPPERCASE) > Book`
TypeScript solo hace: `Root > Book`

**Por qué importa:** Para usuarios con muchos libros, agrupar por autor mejora la organización.

**Acción:** Añadir opción `groupByAuthor` en JoplinExporter.

---

### 4. **Archivo de Configuración** ⭐⭐
Python usa `config/config.json` para defaults:
```json
{
    "creator": "Your Name",
    "notebook_title": "Kindle Imports",
    "input_file": "data/My Clippings.txt",
    "output_file": "my_import",
    "language": "es"
}
```
**Por qué importa:** Evita pasar argumentos repetitivos en CLI.

**Acción:** Implementar lectura de `~/.kindle-tools.json` o similar.

---

### 5. **Logging a Archivo** ⭐
Python escribe logs a `app.log` para debugging.

**Por qué importa:** Útil para reportar bugs o analizar problemas.

**Acción:** Añadir opción `--log-file` en CLI.

---

### 6. **ZIP Export para Markdown** ⭐
Python genera un `.zip` con estructura `AUTHOR/Book/Note.md`.
TypeScript genera archivos sueltos.

**Por qué importa:** Más conveniente para importar a Obsidian.

**Acción:** Añadir opción `--zip` en ObsidianExporter.

---

### 7. **Formato Clipboard para Markdown** ⭐
Python tiene `create_clipboard_markdown()` para copiar al clipboard:
```markdown
> Content

— *Title* by **Author** (p. 42, loc. 100)
```
**Por qué importa:** Útil para pegar directamente en notas.

**Acción:** Añadir método en MarkdownExporter para formato conciso.

---

## ⚠️ Funcionalidades que TypeScript hace DIFERENTE

### 1. **Detección de Idioma**
| Python | TypeScript |
|--------|------------|
| Busca en archivo `languages.json` | Constantes embebidas en código |
| Fallback a español | Fallback a inglés |

**Valoración:** TypeScript es más type-safe, pero Python es más configurable.
**Recomendación:** Mantener constantes TS pero considerar soporte para idiomas custom.

---

### 2. **Linking de Notas a Highlights**
| Python | TypeScript |
|--------|------------|
| Range coverage: `H.start ≤ Note.loc ≤ H.end` | Distancia: `abs(H.start - N.start) <= 10` |

**Valoración:** Python es más preciso para notas al final de highlights largos.
**Recomendación:** Considerar cambiar a range coverage en TS.

---

### 3. **Formato de Página en Título (JEX)**
| Python | TypeScript |
|--------|------------|
| `[0042] snippet...` | `[0042] 📖 snippet...` |

**Valoración:** TS usa emojis para tipo, Python no.
**Recomendación:** Preferencia personal; mantener actual.

---

### 4. **Body de Nota (JEX)**
| Python | TypeScript |
|--------|------------|
| `clip.content` + footer con metadata | Metadata en formato bold de Markdown |

Python:
```
contenido

-----
- date: ...
- author: ...
- book: ...
-----
```

TypeScript:
```
**Book:** Title
**Author:** Author
...
---
> contenido
```

**Valoración:** Python más limpio para lectura, TS más estructurado.
**Recomendación:** Considerar opción de formato.

---

## ✅ Funcionalidades SUPERIORES en TypeScript

1. **Más idiomas soportados** (11 vs 6)
2. **HTML Exporter** con dark mode y search
3. **Fuzzy duplicate detection** con Jaccard similarity (flagging, no removal)
4. **Quality flags** detallados (suspiciousReason: 'too_short' | 'fragment' | 'incomplete')
5. **Geo-location utilities** completas (parsing, validation, distance calculation, URLs)
6. **Page utilities** (formatPage, estimateFromLocation, getPageInfo)
7. **CLI más rico** (validate command, colored output, --pretty)
8. **TypeScript types** para mejor DX

---

## 🚀 ROADMAP de Implementación

### v1.3.0 - Paridad con Python
- [ ] **Encoding fallback chain** en parseFile
- [ ] **Merge tags** durante deduplicación
- [ ] **3-level JEX notebooks** (opción groupByAuthor)
- [ ] **Config file** (~/.kindle-tools.json)

### v1.4.0 - Quality of Life
- [ ] **ZIP export** para Obsidian
- [ ] **Clipboard format** en MarkdownExporter
- [ ] **Logging to file** (--log-file)
- [ ] **Range coverage** para linking notas

### v1.5.0 - Advanced Features (del roadmap Python)
- [ ] **Direct Joplin Sync** via API (Port 41184)
- [ ] **"New Only" filter** (desde último import)
- [ ] **Reading Timeline** visualization
- [ ] **Tag Cloud** sidebar

---

## 📝 Ideas del Proyecto Python que Podemos Adoptar

### Pequeñas Mejoras
1. **Autor en UPPERCASE para carpetas** - Python lo hace para los notebooks de autor
2. **Stats de títulos limpiados** - `titles_cleaned: 15, title_changes: [(...)]`
3. **Fallback graceful** - Si languages.json no existe, usar defaults
4. **Validación de config** - Verificar que config.json tiene campos válidos

### Patrones de Código
1. **Builder pattern para entidades Joplin** - `JoplinEntityBuilder.create_notebook()`
2. **Cache de entidades** - `authors_cache`, `books_cache` para evitar duplicados
3. **Separación de concerns** - `identity_service.py` solo para IDs

### UX del CLI
1. **Mostrar snippets de bloques fallidos** - Para debugging
   ```python
   snippet = raw.strip().replace("\n", " ")[:500]
   stats["failed_blocks"].append(snippet)
   ```
2. **Estadísticas detalladas al final** - parsed/skipped/failed

---

## 🔄 Comparación de Implementación: Lo Mejor de Cada Uno

### Generación de IDs

**Python:**
```python
unique_string = f"{clean_content}|{clean_title}|{clean_author}|{loc_marker}"
return hashlib.sha256(unique_string.encode("utf-8")).hexdigest()
```

**TypeScript:**
```typescript
const input = `${normalizedTitle}|${normalizedLocation}|${type}|${prefix}`;
return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 12);
```

**Diferencias:**
- Python incluye contenido COMPLETO en el hash
- TypeScript usa solo primeros 50 chars de content
- TypeScript incluye `type` en el hash
- TypeScript trunca a 12 chars, Python usa hash completo

**Recomendación:** El approach de TS es mejor (más compacto, menos colisiones potenciales por incluir type).

---

### Deduplicación

**Python:**
- Procesa highlights y notes por separado
- Usa `is_duplicate = True` flag
- Ordena por location.start
- Compara survivor vs current

**TypeScript:**
- Procesa highlights, luego otros
- Usa múltiples flags (isSuspiciousHighlight, possibleDuplicateOf)
- Ordena por location.start
- Similar sliding window approach

**Recomendación:** TS tiene mejor granularidad de flags (suspicious vs duplicate).

---

### Text Cleaning

**Python (TextCleaner.clean_text):**
```python
text = unicodedata.normalize("NFC", text)
text = text.replace("\r\n", "\n")
text = re.sub(r"([^\W\d_]+)-\s*\n\s*([^\W\d_]+)", r"\1\2", text)  # De-hyphenation
text = re.sub(r" +", " ", text)  # Multiple spaces
text = re.sub(r"\s+([.,;:!?])", r"\1", text)  # Space before punctuation
```

**TypeScript (cleanText):**
```typescript
result = result.replace(/pattern/g, replacement);
appliedOperations.push("dehyphenation");  // Track what was applied
return { text: result, wasCleaned: result !== original, appliedOperations };
```

**Diferencias:**
- TypeScript retorna metadata sobre qué operaciones se aplicaron
- Python usa `\W\d_` class, TS enumera caracteres explícitamente
- TS mantiene `contentWasCleaned` flag en Clipping

**Recomendación:** TS es mejor por la transparencia de operaciones.

---

---

## 🏷️ Análisis Detallado: Extracción de Tags desde Notas

### Estado Actual en TypeScript ✅

**¿Es opcional? SÍ** - La extracción de tags es **opt-in** (desactivada por defecto):

```typescript
// src/types/config.ts
export interface ParseOptions {
  extractTags?: boolean;  // Default: false
}

// src/core/processor.ts
if (options?.extractTags) {  // Solo si está habilitado
  const tagResult = extractTagsFromLinkedNotes(result);
}
```

### Flujo Completo de Notas → Tags

1. **linkNotesToHighlights()** - Vincula notas a highlights por proximidad de location (≤10 posiciones)
2. **extractTagsFromNote()** - Parsea el contenido de la nota buscando separadores (`,`, `;`, `\n`)
3. **Tags se asignan** al highlight en `clipping.tags: string[]`

### ¿Contempla ambos casos de uso?

| Caso de Uso | Soporte | Cómo Activarlo |
|-------------|---------|----------------|
| **Notas como reflexiones largas** | ✅ | Default: `extractTags: false` |
| **Notas como tags** | ✅ | `extractTags: true` |
| **Notas mixtas (texto + tags)** | ⚠️ Parcial | Se extraen potenciales tags, pero se pierden si parecen frases |

### Comparación con Python

| Aspecto | Python | TypeScript |
|---------|--------|------------|
| **¿Es opcional?** | ❌ Siempre activo | ✅ Opcional con flag |
| **Linking algoritmo** | Range coverage: `H.start ≤ Note ≤ H.end` | Distancia: `abs(H.start - N.start) <= 10` |
| **Separadores** | `,`, `;`, `.`, `\n` | `,`, `;`, `\n` |
| **Validación de tags** | Básica (strip) | Avanzada (min/max length, no sentences) |

### Mejoras Identificadas

1. **Range Coverage Linking** - Cambiar a algoritmo de Python para notas al final de highlights largos
2. **Añadir `.` como separador** - Compatibilidad con Python
3. **Tag-only note detection** - Ya implementado con `isTagOnlyNote` flag

---

## 🔤 Análisis Detallado: Soporte de Encodings

### Estado Actual

**ENTRADA (Lectura):**
```typescript
// src/core/parser.ts
const content = await fs.readFile(filePath, "utf-8");  // ⚠️ Solo UTF-8
```

**SALIDA (Escritura):**
| Formato | Encoding | Estado |
|---------|----------|--------|
| CSV | UTF-8 con BOM (`\uFEFF`) | ✅ Excel compatible |
| JSON | UTF-8 sin BOM | ✅ Estándar |
| Markdown | UTF-8 | ✅ Node default |
| HTML | UTF-8 (meta charset) | ✅ Con declaración |

### Comparación con Python

```python
# Python - Fallback chain robusto
encodings_to_try = ["utf-8-sig", "utf-8", "cp1252", "latin-1"]
for enc in encodings_to_try:
    try:
        with open(file_path, "r", encoding=enc) as f:
            content = f.read()
        break
    except UnicodeDecodeError:
        continue
```

### Problema

Archivos de Kindles antiguos o de Windows pueden estar en:
- `cp1252` (Windows-1252) - Común en Windows español/europeo
- `latin-1` (ISO-8859-1) - Fallback universal
- `utf-8-sig` (UTF-8 con BOM) - Windows con BOM

Si un usuario tiene un archivo en `cp1252`, **Node.js fallará** con `ENOENT` o caracteres corruptos.

### Solución Propuesta

```typescript
import { detect } from 'chardet';

async function parseFileRobust(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const encoding = detect(buffer) || 'utf-8';
  return buffer.toString(encoding);
}
```

**Dependencia sugerida:** `chardet` (detección de encoding) o `iconv-lite` (conversión).

---

## 🏗️ Análisis de Arquitectura: Importadores y Exportadores

### Exportadores - Comparación

| Aspecto | Python | TypeScript |
|---------|--------|------------|
| **Base class** | `BaseExporter(ABC)` abstracto | `Exporter` interface |
| **Método principal** | `export(clippings, output_file, context)` | `export(clippings, options): Promise<ExportResult>` |
| **Output** | Escribe a archivo directamente | Retorna contenido (más flexible) |
| **Context/Options** | `Dict[str, Any]` no tipado | `ExporterOptions` tipado |
| **Múltiples archivos** | Manual por exporter | `ExportedFile[]` estándar |
| **Builder pattern** | ✅ `JoplinEntityBuilder` | ❌ Inline methods |
| **Caching** | ✅ `authors_cache`, `books_cache` | ⚠️ Solo `tagMap` |

### Python - ClippingsService (Orquestador)

```python
class ClippingsService:
    def __init__(self):
        self.exporters_cache: Dict[str, BaseExporter] = {}  # Lazy loading
    
    def process_clippings(...):
        clippings = self.parser.parse_file(input_file)
        if enable_deduplication:
            clippings = deduplicator.deduplicate(clippings)
        exporter = self._get_exporter(format)
        exporter.export(clippings, output_file, context)
```

**Ventaja:** Centraliza el flujo parse → dedupe → export.

### TypeScript - Sin orquestador central

El CLI maneja el flujo directamente. Para librerías, el usuario debe orquestar:

```typescript
const result = await parseFile(file);
const processed = process(result.clippings, options);
const exported = await exporter.export(processed.clippings);
```

### Recomendaciones

1. **Añadir `ExportService`** - Clase orquestadora como Python
2. **Builder para JEX** - Separar construcción de entidades Joplin
3. **Cache de entidades** - Evitar crear duplicados de notebooks/tags
4. **Hooks pre/post export** - Para logging, validación, etc.

---

## 🎮 Control del Usuario sobre Exports (NUEVA FUNCIONALIDAD)

### Estado Actual

| Control | Soportado | Dónde |
|---------|-----------|-------|
| Formato de salida | ✅ | `--format=json/csv/md/...` |
| Agrupar por libro | ✅ | `groupByBook: true` |
| Pretty print JSON | ✅ | `pretty: true` |
| Incluir raw fields | ✅ | `includeRaw: true` |
| Incluir stats | ✅ | `includeStats: true` |
| **Seleccionar campos** | ❌ | - |
| **Estructura carpetas** | ❌ | - |
| **Templates personalizados** | ⚠️ Solo placeholder | `template?: string` |
| **UPPERCASE en carpetas** | ❌ | - |
| **Un MD por highlight** | ❌ | - |

### Funcionalidades Necesarias

#### 1. Selección de Campos para Export
```typescript
interface ExporterOptions {
  fields?: Array<keyof Clipping>;  // ['title', 'author', 'content', 'tags']
  // Solo estos campos se incluyen en el output
}
```

#### 2. Estructura de Carpetas Configurable
```typescript
interface MarkdownExporterOptions {
  // Estructura de archivos
  structure: 'single' | 'by-book' | 'by-author' | 'by-author-book' | 'by-highlight';
  
  // Case de carpetas
  authorCase: 'original' | 'uppercase' | 'lowercase';
  bookCase: 'original' | 'uppercase' | 'lowercase';
  
  // Formato de nombres de archivo
  filenameFormat: 'title' | 'date-title' | 'author-title';
}
```

#### 3. Templates Personalizados
```typescript
interface ExporterOptions {
  template?: {
    highlight?: string;  // "{{content}}\n\n— *{{title}}* by **{{author}}**"
    note?: string;       // "📝 {{content}}"
    header?: string;     // "# {{title}} by {{author}}\n\n"
    footer?: string;     // "---\nExported on {{date}}"
  }
}
```

**Template variables disponibles:**
- `{{title}}`, `{{author}}`, `{{content}}`
- `{{page}}`, `{{location}}`, `{{date}}`
- `{{type}}`, `{{tags}}`, `{{wordCount}}`

#### 4. Granularidad de Output para Markdown

```typescript
type OutputGranularity = 
  | 'all-in-one'      // Un archivo con todo
  | 'per-book'        // Un archivo por libro (actual)
  | 'per-author'      // Un archivo por autor
  | 'per-highlight';  // Un archivo por highlight (para Zettelkasten)
```

---

## 🚀 ROADMAP de Implementación (Actualizado)

### v1.3.0 - Paridad con Python
- [ ] **Encoding fallback chain** en parseFile (usar `chardet`)
- [ ] **Merge tags** durante deduplicación
- [ ] **3-level JEX notebooks** (Root > Author > Book)
- [ ] **Config file** (`~/.kindle-tools.json` o `.kindletoolsrc`)
- [ ] **Range coverage linking** (mejorar asociación nota→highlight)

### v1.4.0 - Control del Usuario
- [ ] **Field selection** en exports (`fields: ['title', 'content', 'tags']`)
- [ ] **Folder structure options** (`by-author`, `by-author-book`, `by-highlight`)
- [ ] **Case options** para carpetas (`authorCase: 'uppercase'`)
- [ ] **Output granularity** (`per-book`, `per-author`, `per-highlight`)
- [ ] **ZIP export** para Obsidian
- [ ] **Clipboard format** compacto en Markdown

### v1.5.0 - Templates & Personalización
- [ ] **Custom templates** con variables (Mustache-like syntax)
- [ ] **Preset templates** (Academic, Zettelkasten, Simple)
- [ ] **Metadata format options** (footer vs header, list vs bold)
- [ ] **Date format config** (`YYYY-MM-DD`, locale, etc.)

### v1.6.0 - Arquitectura & DX
- [ ] **ExportService** orquestador
- [ ] **JoplinEntityBuilder** class (builder pattern)
- [ ] **Entity caching** para exporters
- [ ] **Pre/post export hooks**
- [ ] **Logging to file** (`--log-file`)
- [ ] **Verbose stats** (titles_cleaned, failed_blocks snippets)

### v2.0.0 - Advanced Features
- [ ] **Direct Joplin Sync** via API (Port 41184)
- [ ] **"New Only" filter** (desde último import)
- [ ] **Interactive CLI** (selección de formato, preview)
- [ ] **Watch mode** (detectar cambios en archivo)

---

## 📌 Conclusión

El proyecto TypeScript ya tiene **paridad funcional** con Python en la mayoría de áreas, e incluso es **superior** en algunos aspectos (más idiomas, HTML export, quality flags, geo-location).

**Brechas críticas a cerrar:**
1. ⭐⭐⭐ **Encoding fallback** - Importante para compatibilidad cross-platform
2. ⭐⭐ **Range coverage linking** - Mejora la precisión de nota→highlight
3. ⭐⭐ **Control de usuario sobre exports** - Estructura, campos, templates

**Fortalezas del proyecto TypeScript:**
- Es **librería-first** (Python es GUI-first)
- API bien tipada para desarrolladores
- Más formatos de export (HTML con search)
- Flags de calidad granulares

**Aprendizajes del proyecto Python a adoptar:**
1. `ClippingsService` como orquestador
2. Builder pattern para entidades Joplin
3. Caching de entidades para evitar duplicados
4. Snippets de bloques fallidos para debugging

El proyecto TypeScript está bien posicionado como **librería y CLI**, con margen de mejora en **personalización de exports** y **compatibilidad de encodings**.
