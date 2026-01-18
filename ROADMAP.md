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
