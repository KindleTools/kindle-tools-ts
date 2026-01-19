# KindleToolsTS - Roadmap

**Filosofía:** El proyecto está **feature complete**. Solo aceptamos bug fixes y mejoras menores de calidad.

> **Arquitectura documentada en:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Estado Actual (2026-01-19)

**v1.0 Feature Complete.** El proyecto está listo para release.

Las mejoras documentadas en este roadmap son **opcionales** y pueden implementarse en releases menores futuras (v1.1, v1.2, etc.).

### Cambios Recientes

#### v1.1 (Robustez)

| Cambio | Descripción |
|--------|-------------|
| ✅ Helper `replace` escape regex | Caracteres especiales se tratan como literales |
| ✅ Author fallback HtmlExporter | Usa `DEFAULT_UNKNOWN_AUTHOR` consistentemente |
| ✅ IDs determinísticos importers | `generateImportId` usa hash en lugar de `Date.now()` |
| ✅ Estado inmutable JoplinExporter | `ctx` se pasa como parámetro, no como estado |
| ✅ Reusar `ClippingTypeSchema` | CSV importer usa schema compartido |
| ✅ Evaluar ESLint + Biome | Evaluado: mantener ambos (ESLint solo para neverthrow) |

#### v1.0 (Feature Complete)

| Cambio | Descripción |
|--------|-------------|
| ✅ Regex Unicode para tags | `\p{L}` acepta cualquier letra (ruso, chino, japonés, etc.) |
| ✅ Separadores personalizables | Nueva opción `tagSeparators` en `ParseOptions` |
| ✅ Simplificación de validación | Eliminado filtro de palabras, solo >3 espacios |
| ✅ Documentación `LOCATIONS_PER_PAGE` | Origen de la heurística documentado |

---

## Matriz de Priorización

Clasificación de todas las mejoras identificadas por **Beneficio**, **Dificultad** e **Impacto**.

### Leyenda

| Criterio | Alto | Medio | Bajo |
|----------|------|-------|------|
| **Beneficio** | Mejora significativa para usuarios o mantenibilidad | Mejora moderada | Mejora estética o marginal |
| **Dificultad** | Fácil (<15 min) | Media (15-60 min) | Difícil (>1 hora) |
| **Impacto** | Afecta funcionalidad core o muchos archivos | Afecta un módulo | Cambio localizado |

### Tabla de Priorización Completa

| # | Mejora | Beneficio | Dificultad | Impacto | Prioridad | Fase |
|---|--------|:---------:|:----------:|:-------:|:---------:|:----:|
| **FASE 1 - COMPLETADA** ||||||
| 1 | Regex Unicode para tags | Alto | Fácil | Alto | ✅ | v1.0 |
| 2 | Separadores personalizables (`tagSeparators`) | Alto | Fácil | Alto | ✅ | v1.0 |
| 3 | Simplificación validación tags | Medio | Fácil | Medio | ✅ | v1.0 |
| 4 | Documentar `LOCATIONS_PER_PAGE` | Medio | Fácil | Bajo | ✅ | v1.0 |
| **FASE 2 - COMPLETADA** ||||||
| 5 | Helper `replace` escape regex | Medio | Fácil | Medio | ✅ | v1.1 |
| 6 | Author fallback HtmlExporter | Medio | Fácil | Bajo | ✅ | v1.1 |
| 7 | IDs determinísticos importers | Alto | Media | Alto | ✅ | v1.1 |
| 8 | Estado inmutable JoplinExporter | Alto | Media | Medio | ✅ | v1.1 |
| 9 | Reusar `ClippingTypeSchema` CSV | Medio | Fácil | Medio | ✅ | v1.1 |
| 10 | Evaluar ESLint + Biome duplicación | Medio | Fácil | Medio | ✅ | v1.1 |
| **FASE 3 - CONSOLIDACIÓN (v1.2)** ||||||
| 11 | Refactorizar `CsvImporter.doImport()` | Medio | Media | Medio | 🟢 | v1.2 |
| 12 | Merge `limits.ts` → `rules.ts` | Medio | Fácil | Bajo | 🟢 | v1.2 |
| 13 | Merge `importers/constants.ts` → `rules.ts` | Medio | Fácil | Bajo | 🟢 | v1.2 |
| 14 | Eliminar `AuthorNormalizer` muerto | Medio | Fácil | Bajo | 🟢 | v1.2 |
| **FASE 4 - BAJO VALOR (v1.3+)** ||||||
| 15 | Extraer emojis a constantes | Bajo | Fácil | Bajo | 🟢 | v1.3+ |
| 16 | Separar HTML template | Bajo | Media | Bajo | 🟢 | v1.3+ |
| 17 | Unificar tipos con `z.infer` | Bajo | Media | Bajo | 🟢 | v1.3+ |

---

## Plan de Acción

### Fase 1: v1.0 Release ✅ COMPLETADA

#### 1.1 ✅ Regex Unicode para tags

**Archivo:** `domain/parsing/tags.ts:191`

**Cambio:** `\p{L}` acepta cualquier letra Unicode (cirílico, CJK, etc.)

```typescript
// Antes
if (!/^[a-zA-ZáéíóúñüàèìòùâêîôûäëïöçÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÇ]/.test(tag))

// Después
if (!/^\p{L}/u.test(tag))
```

#### 1.2 ✅ Separadores personalizables (NUEVA FEATURE)

**Archivos:** `domain/parsing/tags.ts`, `types/config.ts`, `core/processor.ts`

**Cambio:** Nueva opción `tagSeparators` permite al usuario definir sus propios separadores.

```typescript
// Uso
parseString(content, {
  extractTags: true,
  tagSeparators: "/",  // Solo slash como separador
});

// O con regex
parseString(content, {
  extractTags: true,
  tagSeparators: /[,;|]+/,  // Coma, punto y coma, o pipe
});
```

**Default:** `/[,;.\n\r]+/` (coma, punto y coma, punto, newline)

#### 1.3 ✅ Simplificación de validación de tags

**Archivo:** `domain/parsing/tags.ts`

**Cambio:** Eliminado el filtro de palabras ("the", "is", etc.) que causaba falsos negativos.

**Validación actual (más simple y confiable):**
- Longitud: 2-50 caracteres
- Empieza con letra Unicode (`\p{L}`)
- Máximo 3 espacios internos

**Razón:** El usuario activa `extractTags: true` explícitamente = confiar en que sus notas son tags.

#### 1.4 ✅ Documentar `LOCATIONS_PER_PAGE`

**Archivo:** `domain/core/locations.ts:12-27`

**Cambio:** Documentación completa del origen de la heurística (128 bytes/location, ~16 locations/página).

---

### Fase 2: v1.1 ✅ COMPLETADA

Mejoras de robustez que previenen bugs edge-case.

#### 2.1 ✅ Helper `replace` con escape de regex

**Archivo:** `templates/helpers.ts:97`

**Problema:** El helper `replace` usa el primer argumento como RegExp sin escapar caracteres especiales. Si el usuario pasa `"."`, reemplaza cualquier carácter.

**Implementación:**
```typescript
// Antes
Handlebars.registerHelper('replace', (str, find, replace) => {
  return str.replace(new RegExp(find, 'g'), replace);
});

// Después
Handlebars.registerHelper('replace', (str, find, replace) => {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(escaped, 'g'), replace);
});
```

**Beneficio:** Evita comportamiento inesperado con caracteres especiales regex.
**Esfuerzo:** ~10 minutos.

#### 2.2 ✅ Author fallback en HtmlExporter

**Archivo:** `exporters/formats/html.exporter.ts:169`

**Problema:** No usa `DEFAULT_UNKNOWN_AUTHOR` como otros exporters.

**Implementación:**
```typescript
// Antes
<p class="book-author">by ${this.escapeHtml(first.author)}</p>

// Después
<p class="book-author">by ${this.escapeHtml(first.author || DEFAULTS.UNKNOWN_AUTHOR)}</p>
```

**Beneficio:** Consistencia con otros exporters.
**Esfuerzo:** ~5 minutos.

#### 2.3 ✅ IDs determinísticos en importers

**Archivo:** `importers/shared/importer-utils.ts:21`

**Problema:** `generateImportId` usa `Date.now()`, lo que genera IDs diferentes cada vez que se importa el mismo archivo.

**Implementación:**
```typescript
// Antes
export function generateImportId(index: number): string {
  return `imp_${Date.now().toString(36)}_${index.toString(36)}`;
}

// Después
import { sha256Sync } from '#utils/security/hashing.js';

export function generateImportId(content: string, index: number): string {
  const hash = sha256Sync(`${content}|${index}`).slice(0, 8);
  return `imp_${hash}_${index.toString(36)}`;
}
```

**Beneficio:** Re-importar el mismo archivo genera los mismos IDs = deduplicación consistente.
**Esfuerzo:** ~15 minutos.
**Breaking:** Sí, cambio de firma. Actualizar callers.

#### 2.4 ✅ Estado inmutable en JoplinExporter

**Archivo:** `exporters/formats/joplin.exporter.ts:171`

**Problema:** `this.ctx` es estado mutable que puede causar leaks si se reutiliza la instancia.

**Implementación:**
```typescript
// Antes
private ctx: JoplinExportContext | null = null;

async doExport(...) {
  this.ctx = this.createContext(options);
  // usa this.ctx en métodos privados
}

// Después
// Eliminar this.ctx
// Pasar ctx como parámetro a todos los métodos

async doExport(...) {
  const ctx = this.createContext(options);
  const preamble = await this.exportPreamble(clippings, options, ctx);
  const books = await this.processBooks(clippings, options, ctx);
}
```

**Beneficio:** Thread-safe, sin state leaks.
**Esfuerzo:** ~30 minutos (muchos métodos que actualizar).

#### 2.5 ✅ Reusar ClippingTypeSchema en CSV

**Archivo:** `importers/formats/csv.importer.ts:48`

**Problema:** Define `z.enum(["highlight", "note", ...])` inline en lugar de reusar `ClippingTypeSchema`.

**Implementación:**
```typescript
// Antes
type: z.enum(["highlight", "note", "bookmark", "clip", "article"]).optional()

// Después
import { ClippingTypeSchema } from '#schemas/clipping.schema.js';
type: ClippingTypeSchema.optional()
```

**Beneficio:** Single source of truth para tipos de clipping.
**Esfuerzo:** ~5 minutos.

#### 2.6 ✅ Evaluar duplicación ESLint + Biome

**Archivos:** `eslint.config.mjs`, `biome.json`

**Problema:** Ambos linters están configurados, posible duplicación de reglas.

**Investigación necesaria:**
1. Listar reglas activas en ambos
2. Identificar overlaps
3. Decidir: ¿eliminar ESLint o configurar reglas complementarias?

**Recomendación:** Biome es más rápido y completo. Considerar migrar completamente a Biome y eliminar ESLint.

**Esfuerzo:** ~30 minutos investigación + ~15 minutos cambio.

---

### Fase 3: v1.2 (Consolidación)

Reducción de archivos y simplificación de estructura.

#### 3.1 Merge `limits.ts` → `rules.ts`

**Archivos:** `core/limits.ts` → `domain/rules.ts`

**Implementación:**
1. Mover constantes de `limits.ts` a sección nueva en `rules.ts`
2. Actualizar imports en todo el proyecto
3. Eliminar `limits.ts`
4. Actualizar barrel exports

**Esfuerzo:** ~10 minutos.

#### 3.2 Merge `importers/constants.ts` → `rules.ts`

**Archivos:** `importers/shared/constants.ts` → `domain/rules.ts`

**Implementación:** Misma que 3.1.

**Esfuerzo:** ~10 minutos.

#### 3.3 Merge utils de texto

**Archivos:** `utils/text/patterns.ts` + `utils/text/counting.ts` → `utils/text/normalizers.ts`

**Implementación:**
1. Mover funciones a `normalizers.ts`
2. Actualizar imports
3. Eliminar archivos originales

**Esfuerzo:** ~15 minutos.

#### 3.4 Eliminar `AuthorNormalizer`

**Problema:** Clase con métodos estáticos que no se usa internamente (solo API pública).

**Implementación:**
1. Verificar si hay uso externo documentado
2. Si no: eliminar clase, convertir a funciones exportadas
3. Si sí: mantener como deprecated o alias

**Esfuerzo:** ~10 minutos.

#### 3.5 Refactorizar `CsvImporter.doImport()`

**Archivo:** `importers/formats/csv.importer.ts`

**Problema:** Función de 272 líneas con 4 niveles de anidamiento.

**Implementación:**
```typescript
// Extraer helpers internos
private parseHeaders(row: string[]): HeaderMap { ... }
private validateRow(row: string[], headers: HeaderMap): ValidationResult { ... }
private buildClipping(row: string[], headers: HeaderMap): Clipping { ... }

async doImport(content: string): Promise<ImportResult> {
  const rows = this.parseCSV(content);
  const headers = this.parseHeaders(rows[0]);

  return rows.slice(1)
    .map(row => this.validateRow(row, headers))
    .filter(r => r.isValid)
    .map(r => this.buildClipping(r.row, headers));
}
```

**Beneficio:** Legibilidad, testabilidad de partes.
**Esfuerzo:** ~45 minutos.

---

### Fase 4: v1.3+ (Bajo Valor / Opcional)

Mejoras estéticas que no justifican esfuerzo inmediato.

| Mejora | Razón de baja prioridad |
|--------|-------------------------|
| Extraer case transformer | Duplicación funciona, cambio estético |
| Extraer emojis a constantes | Solo afecta HTML exporter |
| Separar HTML template | Funciona bien inline |
| Cache `detectLanguage` | No hay evidencia de problema de performance |
| Unificar tipos con `z.infer` | Tipos actuales funcionan, riesgo de breaking changes |
| Simplificar `TemplateEngineFactory` | Factory pattern es apropiado aquí |

---

## Not Planned (Descartado)

### Descartado para v1.x

| Item | Razón |
|------|-------|
| Dividir `presets.ts` (519 líneas) | Es un archivo de datos, la longitud es aceptable |
| Dividir archivos largos de parser | Código funcional, refactor estético no justifica riesgo |
| TypeDoc API Documentation | README de 800+ líneas es suficiente |
| VitePress Documentation Site | Over-engineering |
| Architecture Decision Records | ARCHITECTURE.md basta |
| Browser Entry Point separado | El actual funciona en browser |
| Monorepo Structure | Complejidad no justificada |
| CLI | Usuarios crean wrappers, fuera de scope |

### Descartado Permanentemente

| Item | Razón |
|------|-------|
| PDF Export | Requiere librería pesada (~500KB) |
| Readwise Sync | API propietaria, scope creep |
| Highlight Colors | Kindle no exporta colores en `My Clippings.txt` |
| Streaming Architecture | Caso raro (archivos >50MB) |
| Plugin System | Eliminado - over-engineering |
| Notion/Kobo/Apple Books | APIs propietarias, diferentes formatos |

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

## Resumen Ejecutivo

### ✅ Fase 1: v1.0 (COMPLETADA)
- Regex Unicode para tags (`\p{L}`)
- Nueva opción `tagSeparators` para separadores personalizables
- Simplificación de validación de tags
- Documentación de `LOCATIONS_PER_PAGE`

### ✅ Fase 2: v1.1 (COMPLETADA)
- **6 mejoras de robustez** que previenen bugs edge-case
- Items 2.1-2.6: escape regex, author fallback, IDs determinísticos, estado inmutable, DRY schemas, linter evaluado

### 🟢 Fase 3: v1.2 (Futuro)
- **4 consolidaciones** que reducen archivos y complejidad
- Items 3.1-3.4: merge constantes, refactor CsvImporter, eliminar código muerto

### ⚪ Fase 4: v1.3+ (Opcional)
- **3 mejoras cosméticas** de bajo valor que pueden ignorarse

---

## Referencias

- [Snyk: npm Package Best Practices](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

*Actualizado: 2026-01-19 | **v1.1 Robustez Complete***
