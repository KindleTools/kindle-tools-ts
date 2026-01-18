# KindleToolsTS - Roadmap

**Filosofía:** El proyecto está **feature complete**. Solo aceptamos bug fixes y mejoras menores de calidad.

> **Arquitectura documentada en:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Estado Actual

**Todas las mejoras de calidad identificadas han sido implementadas (2026-01-18).**

No hay tareas pendientes. El proyecto está listo para v1.0.

---

## Quality Polishing (Pre-v1.0)

Antes del release, priorizamos pequeñas mejoras de consistencia y limpieza:

| Área | Qué revisar |
|------|-------------|
| **Constantes** | ¿Están en el lugar correcto según arquitectura? |
| **Exports** | ¿Todos los módulos exportan lo necesario? |
| **Dead code** | ¿Hay código huérfano de features descartadas? |
| **Naming** | ¿Son consistentes los nombres? |

> **Filosofía**: Pulir detalles pequeños antes de congelar v1.0.
> No justifica nuevas features, pero sí asegurar que todo esté limpio y bien ubicado.

---

## Análisis DRY (2026-01-18)

Análisis exhaustivo del código fuente para identificar violaciones del principio DRY (Don't Repeat Yourself).

### Categoría 1: Definiciones de tipos duplicadas

Los tipos están definidos tanto en `types/` (interfaces manuales) como en `schemas/` (inferidos de Zod), creando redundancia.

| Tipo | Ubicaciones | Recomendación |
|------|-------------|---------------|
| `SupportedLanguage` | `types/language.ts`, `schemas/clipping.schema.ts`, `schemas/shared.schema.ts` | Usar solo `z.infer` del schema |
| `GeoLocation` | `types/geo.ts`, `schemas/config.schema.ts` | Usar solo `z.infer` del schema |
| `ClippingType` | `types/clipping.ts`, `schemas/clipping.schema.ts`, `schemas/config.schema.ts` | Usar solo `z.infer` del schema |
| `TagCase` | `domain/parsing/tags.ts`, `schemas/config.schema.ts`, `types/config.ts` | Usar solo `z.infer` del schema |
| `FolderStructure` | `exporters/core/types.ts`, `schemas/shared.schema.ts` | Usar solo `z.infer` del schema |
| `AuthorCase` | `exporters/core/types.ts`, `schemas/shared.schema.ts` | Usar solo `z.infer` del schema |

**Impacto**: Bajo (los valores literales coinciden). Riesgo de desincronización futura.

### Categoría 2: Lógica de transformación duplicada

| Función | Ubicaciones | Descripción |
|---------|-------------|-------------|
| Case transform | `domain/parsing/tags.ts:cleanTag`, `exporters/shared/exporter-utils.ts:applyCase` | Misma lógica switch uppercase/lowercase/original |

**Solución propuesta**: Extraer a `utils/text/case-transformer.ts`.

### Categoría 3: Enums inline duplicados

| Enum | Ubicaciones |
|------|-------------|
| `ClippingType` enum | `csv.importer.ts:48` repite `z.enum(["highlight", "note", ...])` |

**Solución**: Reusar `ClippingTypeSchema` de `schemas/clipping.schema.ts`.

### Prioridad de corrección

| Prioridad | Item | Razón |
|-----------|------|-------|
| **Baja** | Tipos duplicados | Backward compatibility, ya exportados en API pública |
| **Baja** | Lógica case transform | Funciona, cambio estético |
| **Media** | Enums inline | Fácil de corregir, reduce riesgo de desincronización |

> **Decisión**: Estas violaciones son **aceptables para v1.0**. Son mejoras de higiene que pueden hacerse en una release menor futura (v1.1). El código actual es funcional y well-tested.

---

## Observaciones Adicionales (2026-01-18)

Observaciones de código durante el análisis exhaustivo del proyecto.

### ✅ Lo que está excelente (mantener así)

| Aspecto | Comentario |
|---------|------------|
| Arquitectura Clean | Separación `domain/` → `core/` → `importers/exporters/` muy clara |
| Error handling | Uso de `neverthrow` con Result types es robusto |
| Documentación inline | JSDoc completos en casi todos los módulos |
| Tests | 818 tests con buena cobertura |
| Subpath imports | Uso de `#alias` (no `@alias`) es correcto para Node.js moderno |

### 💡 Sugerencias menores de pulido

#### 1. Regex de validación de tags limitada a alfabeto latino

**Archivo**: `domain/parsing/tags.ts:191`

```typescript
// Actual (solo latín + acentos europeos)
if (!/^[a-zA-ZáéíóúñüàèìòùâêîôûäëïöçÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÇ]/.test(tag))

// Propuesto (cualquier letra Unicode)
if (!/^\p{L}/u.test(tag))
```

**Impacto**: Soportaría correctamente tags en ruso, chino, japonés, coreano (idiomas ya soportados).

#### 2. Filtro de sentence detection solo en inglés

**Archivo**: `domain/parsing/tags.ts:202`

```typescript
// Actual (solo inglés)
if (/\b(the|is|are|was|were|have|has|will|would|could|should|does|did)\b/i.test(tag))

// Propuesto (añadir español/portugués)
if (/\b(the|is|are|was|were|have|has|will|would|could|should|does|did|el|la|es|los|las|un|una|um|uma|de|que)\b/i.test(tag))
```

**Impacto**: Mejor detección de fragmentos de oraciones en español/portugués.

#### 3. Constante `LOCATIONS_PER_PAGE` sin fuente documentada

**Archivo**: `domain/core/locations.ts:21`

El valor `16` es una heurística conocida, pero podría beneficiarse de un link a fuente o explicación más detallada de cómo se derivó.

#### 4. HTML template embebido en exportador

**Archivo**: `exporters/formats/html.exporter.ts`

El HTML está como strings inline. Ya existe `html.styles.ts` para CSS, pero el template HTML sigue embebido. Separarlo mejoraría mantenibilidad.

#### 5. Archivos largos (no crítico)

| Archivo | Líneas | Nota |
|---------|--------|------|
| `importers/formats/txt/parser.ts` | ~450+ | Podría dividirse en el futuro |
| `exporters/formats/joplin.exporter.ts` | ~450+ | Podría dividirse en el futuro |

### 🎯 Prioridad de implementación

| Prioridad | Sugerencia | Esfuerzo |
|-----------|------------|----------|
| **Alta** | Regex Unicode para tags | ~5 min |
| **Media** | Sentence detection multiidioma | ~10 min |
| **Baja** | Documentar `LOCATIONS_PER_PAGE` | ~5 min |
| **Muy Baja** | Separar HTML template | ~30 min |
| **No hacer** | Dividir archivos largos | Riesgo > beneficio |

> **Decisión**: Las sugerencias 1 y 2 son **quick wins** que mejoran la experiencia para usuarios multiidioma. Pueden implementarse antes de v1.0 o en v1.0.1.

---

## Mejoras de Exporters (2026-01-18)

Análisis de la arquitectura de exporters. El código está bien estructurado pero hay oportunidades de mejora.

### ✅ Lo que está excelente

| Aspecto | Comentario |
|---------|------------|
| Arquitectura | Patrón Template Method con `BaseExporter` → `MultiFileExporter` → exporters concretos |
| Reutilización | `exporter-utils.ts` centraliza funciones comunes sin duplicación |
| Type Safety | Validación con Zod, interfaces bien definidas |
| Error handling | Uso de `neverthrow` Result types consistente |
| Factory Pattern | Registry dinámico que permite registrar nuevos exporters |

### 💡 Mejoras propuestas

| Prioridad | Mejora | Esfuerzo | Descripción |
|-----------|--------|----------|-------------|
| **Media** | Eliminar estado mutable en `JoplinExporter` | Medio | `this.ctx` podría causar state leaks si se reutiliza la instancia. Pasar contexto como parámetro. |
| **Baja** | Fallback de author en `HtmlExporter` | 5 min | Línea 169 no usa `DEFAULT_UNKNOWN_AUTHOR` como otros exporters |
| **Baja** | Extraer constantes de emojis | 10 min | Emojis en `html.exporter.ts:186-191` deberían estar en `shared/constants.ts` |
| **Baja** | Validación centralizada de clippings vacíos | 10 min | Mover check a `BaseExporter.export()` para consistencia |
| **Muy Baja** | Documentar CSP incompatibility | 2 min | JavaScript inline no es CSP-compliant, añadir nota en JSDoc |

### 🔧 Detalles técnicos

#### 1. Estado mutable en JoplinExporter

```typescript
// Actual (joplin.exporter.ts:171)
private ctx: JoplinExportContext | null = null;

// Propuesto: pasar ctx como parámetro
protected override async doExport(...): Promise<ExportResult> {
  const ctx = this.createContext(options);
  const preambleFiles = await this.exportPreamble(clippings, options, ctx);
  const bookFiles = await this.processBook(bookClippings, options, engine, ctx);
}
```

#### 2. Author fallback faltante

```typescript
// Actual (html.exporter.ts:169)
<p class="book-author">by ${this.escapeHtml(first.author)}</p>

// Propuesto
<p class="book-author">by ${this.escapeHtml(first.author || this.DEFAULT_UNKNOWN_AUTHOR)}</p>
```

> **Decisión**: Ninguna de estas mejoras es crítica para v1.0. Son mejoras de robustez que pueden implementarse en v1.1 o posteriores.

---

## Mejoras de Importers (2026-01-18)

Análisis de la arquitectura de importers. Código muy bien estructurado con excelente UX de errores.

### ✅ Lo que está excelente

| Aspecto | Comentario |
|---------|------------|
| Arquitectura | Misma estructura que exporters: `BaseImporter` → importers concretos |
| Factory Pattern | Registry dinámico con default importer (`TxtImporter`) |
| Fuzzy matching | Headers CSV con Levenshtein (≤2) para tolerar typos |
| Sugerencias | `"Did you mean 'highlight'?"` en errores de validación |
| Multi-formato JSON | Soporta `{ clippings: [] }`, `{ books: {} }`, y `[]` |
| Modularidad TXT | Parser dividido en: tokenizer → language-detector → parser → text-cleaner |
| Multi-idioma | Detección automática de 10+ idiomas |

### 💡 Mejoras propuestas

| Prioridad | Mejora | Esfuerzo | Descripción |
|-----------|--------|----------|-------------|
| **Baja** | IDs determinísticos en `generateImportId` | 15 min | Usar hash del contenido en lugar de `Date.now()` para idempotencia |
| **Muy Baja** | Cachear resultado de `detectLanguage` | 10 min | Evitar recálculo si se llama múltiples veces |

### 🔧 Detalles técnicos

#### 1. IDs no determinísticos

```typescript
// Actual (importer-utils.ts:21)
export function generateImportId(index: number): string {
  return `imp_${Date.now().toString(36)}_${index.toString(36)}`;
}

// Propuesto: hash del contenido para idempotencia
export function generateImportId(content: string, index: number): string {
  const hash = sha256Sync(content).slice(0, 8);
  return `imp_${hash}_${index.toString(36)}`;
}
```

**Impacto**: Permitiría re-importar el mismo archivo y obtener los mismos IDs, útil para deduplicación.

> **Decisión**: Los importers están **mejor logrados** que los exporters en términos de UX de errores. No hay mejoras urgentes.

---

## Revisión Transversal (2026-01-18)

Análisis general del proyecto: naming, exports, dependencias y tests.

### ✅ Revisión completada

| Área | Estado | Observaciones |
|------|--------|---------------|
| **Naming** | ✅ Impecable | Clases (PascalCase), funciones (camelCase), archivos (kebab-case) |
| **Exports** | ✅ Bien organizado | `src/index.ts` con 184 líneas, secciones claras |
| **Tests** | ✅ 818 tests | 8 carpetas organizadas, 58 unit tests |

### 🔧 Cambios realizados (2026-01-18)

| Cambio | Estado | Descripción |
|--------|--------|-------------|
| ~~Eliminar `@types/handlebars`~~ | ✅ Hecho | Deprecated - Handlebars tiene tipos bundled |
| ~~Eliminar `@types/jszip`~~ | ✅ Hecho | Deprecated - JSZip tiene tipos bundled |
| ~~Actualizar `zod`~~ | ✅ Hecho | 4.3.4 → 4.3.5 (bugfixes menores) |
| ~~Actualizar `vite`~~ | ✅ Hecho | 6.4.1 → 7.3.1 (major update para GUI) |

### 💡 Pendiente para futuro

| Prioridad | Item | Descripción |
|-----------|------|-------------|
| **Info** | Monitorear estabilidad Vite 7 | Verificar que no haya regresiones en el workbench |

---

## Análisis de Templates y Domain (2026-01-18)

Revisión del sistema de templates (Handlebars) y la lógica de dominio.

### ✅ Templates - Estado excelente

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `engine.ts` | 446 | Motor Handlebars con Factory, cache, validación |
| `presets.ts` | 519 | 8 presets (default, minimal, obsidian, joplin, notion, academic, compact, verbose) |
| `helpers.ts` | 276 | 30+ helpers organizados por categoría |
| `types.ts` | 100+ | Contextos tipados (ClippingContext, BookContext, ExportContext) |

**Puntos fuertes:**
- Factory con cache (`TemplateEngineFactory`)
- Helper `opt` para opciones dinámicas en templates
- Validación de custom templates con `validateTemplate()`

### ✅ Domain - Estado excelente

| Módulo | Descripción |
|--------|-------------|
| `rules.ts` | Constantes de negocio centralizadas |
| `analytics/` | `calculateStats()`, `groupByBook()` |
| `core/` | IDs determinísticos (SHA-256), Jaccard similarity |
| `parsing/` | Tags, sanitizers, dates, 11 idiomas |

**Puntos fuertes:**
- IDs idempotentes con `generateClippingId()`
- Lógica de negocio separada de infraestructura
- Tag extraction con validación anti-oraciones

### 💡 Observaciones menores

| Prioridad | Observación | Ubicación |
|-----------|-------------|-----------|
| **Muy Baja** | Helper `replace` usa RegExp sin escape de caracteres especiales | `helpers.ts:97` |
| **Info** | `presets.ts` tiene 519 líneas, podría separarse en archivos por preset | No urgente |

> **Decisión**: Ambos módulos están muy bien estructurados. No hay mejoras necesarias para v1.0.

---

## Planes de Mejora Documentados (2026-01-18)

Análisis exhaustivo del código con planes de acción detallados en `/docs/`.

### Plan 2.1: Consolidación de Archivos

> Documentación completa: [docs/2.1 Plan de Consolidación.md](docs/2.1%20Plan%20de%20Consolidación.md)

Merge de archivos pequeños para reducir fragmentación:

| Fase | Origen | Destino | Riesgo | Archivos Eliminados |
|------|--------|---------|--------|---------------------|
| 1.1 | `core/limits.ts` | `domain/rules.ts` | 🟢 Bajo | 1 |
| 1.2 | `importers/shared/constants.ts` | `domain/rules.ts` | 🟢 Bajo | 1 |
| 2.1 | `utils/text/patterns.ts` | `utils/text/normalizers.ts` | 🟢 Bajo | 1 |
| 2.2 | `utils/text/counting.ts` | `utils/text/normalizers.ts` | 🟢 Bajo | 1 |
| 2.3 | `types/geo.ts` | `utils/geo/index.ts` | 🟢 Bajo | 1 |
| 3.1 | `AuthorNormalizer` (clase muerta) | Eliminar | 🟡 Medio | 1 |

**Resultado**: -6 archivos, ~163 líneas recuperadas.

### Plan 2.2: Eliminación de Abstracciones

> Documentación completa: [docs/2.2 Plan de Eliminación de Abstracciones.md](docs/2.2%20Plan%20de%20Eliminación%20de%20Abstracciones.md)

Simplificación de abstracciones innecesarias:

| Elemento | Tipo | Acción | Riesgo |
|----------|------|--------|--------|
| `AuthorNormalizer` | Clase static-only | Convertir a funciones exportadas | 🟢 Bajo |
| `TemplateEngineFactory` | Factory/Cache | Simplificar a función con closure | 🟡 Medio |

**Abstracciones a mantener** (justificadas):
- `ImporterFactory`, `ExporterFactory` (extensibles)
- `BaseImporter`, `BaseExporter` (herencia correcta)
- `FileSystem`, `Logger` (DI para testing)

### Plan 2.3: Simplificación de Código

> Documentación completa: [docs/2.3 Plan de Simplificación de Código.md](docs/2.3%20Plan%20de%20Simplificación%20de%20Código.md)

Refactorización de funciones complejas:

| Función | Archivo | Líneas | Prioridad | Acción |
|---------|---------|--------|-----------|--------|
| `CsvImporter.doImport()` | csv.importer.ts | 272 | 🔴 Alta | Extraer helpers |
| `JoplinExporter.processBook()` | joplin.exporter.ts | 141 | 🟡 Media | Separar autor/notas |
| `JsonImporter.doImport()` | json.importer.ts | 135 | 🟡 Media | Extraer validación |
| `parseString()` | parser.ts | 137 | ✅ OK | **No refactorizar** |

**Estrategia**: Extraer helpers internos sin crear archivos nuevos.

### Orden de Ejecución Recomendado

```
1. Plan 2.1: Consolidación (Fase 1 → Fase 2 → Fase 3)
2. Plan 2.2: Abstracciones (AuthorNormalizer → TemplateEngineFactory)
3. Plan 2.3: Simplificación (CsvImporter → JsonImporter → JoplinExporter)
```

> **Decisión**: Estas mejoras son de **prioridad baja** (v1.1+). El código actual es funcional y well-tested. Son mejoras de mantenibilidad que no afectan funcionalidad.

---

## Análisis de Complejidad (2026-01-18)

> Documentación completa: [docs/1.4 Análisis de Complejidad Ciclomática.md](docs/1.4%20Análisis%20de%20Complejidad%20Ciclomática.md)

### Funciones con mayor complejidad

| Función | Archivo | Líneas | Nivel Anidamiento |
|---------|---------|--------|-------------------|
| `CsvImporter.doImport()` | csv.importer.ts | 272 | 🔴 4 niveles |
| `JoplinExporter.processBook()` | joplin.exporter.ts | 141 | 🟡 3 niveles |
| `parseString()` | parser.ts | 137 | 🟡 3 niveles |

### Archivos monolíticos (>300 líneas)

| Archivo | Líneas | Estado |
|---------|--------|--------|
| `joplin.exporter.ts` | 514 | 🟡 Podría extraer tipos |
| `templates/presets.ts` | 519 | ✅ OK (datos) |
| `csv.importer.ts` | 388 | 🟡 Podría extraer schema |

**Dependencias circulares**: ✅ Ninguna detectada

---

## Archivos Zombies Identificados (2026-01-18)

> Documentación completa: [docs/1.2 Detección de Archivos Zombies.md](docs/1.2%20Detección%20de%20Archivos%20Zombies.md)

| Categoría | Archivos | Estado |
|-----------|----------|--------|
| **Alto impacto** | `core/limits.ts`, `importers/shared/constants.ts` | Consolidar en `domain/rules.ts` |
| **Medio impacto** | `utils/text/counting.ts`, `utils/text/patterns.ts` | Merge en `normalizers.ts` |
| **API sin uso interno** | `utils/geo/index.ts` (203 líneas) | Mantener (API pública) |

**Archivos consolidables**: 6  
**Líneas recuperables**: ~110  
**Nivel de contaminación**: BAJO

---

## Sugerencias Adicionales (2026-01-18)

Mejoras identificadas durante el análisis exhaustivo del proyecto.

### 🔴 Quick Wins (Alta Prioridad)

| Área | Sugerencia | Archivo | Esfuerzo |
|------|------------|---------|----------|
| **Unicode en tags** | Cambiar `/^[a-zA-Z...]/.test(tag)` a `/^\p{L}/u.test(tag)` para soportar tags en ruso, chino, japonés | `domain/parsing/tags.ts:191` | 5 min |
| **Sentence detection multiidioma** | Añadir palabras en español/portugués al filtro (`el`, `la`, `es`, `de`, `que`, `um`, `uma`) | `domain/parsing/tags.ts:202` | 10 min |

> **Impacto**: Mejora significativa para usuarios multiidioma (11 idiomas soportados).

### 🟡 Prioridad Media

| Área | Sugerencia | Archivo | Esfuerzo |
|------|------------|---------|----------|
| **Documentar `LOCATIONS_PER_PAGE`** | El valor `16` necesita comentario explicando origen | `domain/core/locations.ts:21` | 5 min |
| **HTML template separado** | El HTML está inline; podría ir a archivo `.html` | `exporters/formats/html.exporter.ts` | 30 min |
| **Evaluar linters** | ESLint + Biome: posible duplicación | `eslint.config.mjs`, `biome.json` | 15 min |
| **Turbo.json** | ¿Necesario para monorepo de 1 package? | `turbo.json` | 5 min |

### 🟢 Baja Prioridad (Nice to have)

| Área | Sugerencia | Archivo | Descripción |
|------|------------|---------|-------------|
| **Helper `replace` sin escape** | RegExp sin escapar caracteres especiales | `templates/helpers.ts:97` | Bug potencial |
| **Author fallback en HTML** | No usa `DEFAULT_UNKNOWN_AUTHOR` | `html.exporter.ts:169` | Inconsistencia |
| **Emojis hardcoded** | Podrían estar en constantes compartidas | `html.exporter.ts:186-191` | Mantenibilidad |
| **CSP incompatibility** | JavaScript inline no es CSP-compliant | `html.exporter.ts` | Documentar limitación |

### ⚠️ Observaciones de Arquitectura

| Observación | Estado |
|-------------|--------|
| `ARCHITECTURE.md` muy largo (1,518 líneas) | Podría dividirse en `/docs` |
| `index.ts` con 60+ exports | Necesario para biblioteca npm |
| 30 subdirectorios para 100 archivos | Ratio ~3.3 archivos/carpeta, aceptable |

> **Decisión**: Las quick wins (Unicode y multiidioma) deberían implementarse antes de v1.0. El resto son mejoras para v1.1+.

---

## Not Planned

### Descartado

| Item | Razón |
|------|-------|
| TypeDoc API Documentation | README de 800+ líneas es suficiente |
| VitePress Documentation Site | Over-engineering |
| Architecture Decision Records | ARCHITECTURE.md basta |
| Browser Entry Point separado | El actual funciona en browser |
| Refactorizar archivos largos | Código funciona, refactor estético no justifica riesgo |
| Monorepo Structure | Complejidad no justificada |
| CLI / CLI Suggestions | Usuarios crean wrappers, fuera de scope |

### Descartado Permanentemente

| Item | Razón |
|------|-------|
| PDF Export | Requiere librería pesada |
| Readwise Sync | API propietaria |
| Highlight Colors | Kindle no exporta colores |
| Streaming Architecture | Caso raro (50MB+) |
| Plugin System | Eliminado - over-engineering |
| Notion/Kobo/Apple Books | APIs propietarias |

---

## Criterios v1.0 ✅

| Criterio | Estado |
|----------|--------|
| Tests automatizados | ✅ 818 tests |
| CI/CD | ✅ GitHub Actions |
| SemVer | ✅ Changesets |
| TypeScript strict | ✅ |
| ESM + CJS | ✅ |
| Security | ✅ Zod, CSV injection protection |
| Documentación | ✅ README 800+ líneas |
| Error handling | ✅ neverthrow |
| Dependencies | ✅ 7 runtime |

---

## Referencias

- [Snyk: npm Package Best Practices](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

*Actualizado: 2026-01-18 | **v1.0 Feature Complete***
