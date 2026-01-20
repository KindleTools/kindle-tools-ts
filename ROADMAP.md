# KindleToolsTS - Roadmap

**Filosofía:** El proyecto está **feature complete** (v1.2). Solo se aceptan bug fixes y mejoras que aporten valor real.

> **Arquitectura documentada en:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Estado Actual

**v1.2 Stable** - El proyecto está listo para producción con:
- 825+ tests automatizados
- TypeScript strict mode
- ESM + CJS dual build
- 11 idiomas soportados
- 6 formatos de exportación

---

## Mejoras Potenciales

Mejoras identificadas que podrían implementarse si hay demanda o necesidad.

### Control Granular de Metadatos (CSV/JSON)

**Problema:** Actualmente el usuario solo puede elegir `includeRaw: true/false`, pero no tiene control fino sobre qué campos incluir en el export.

**Propuesta:** Añadir opción `fields` en `ExporterOptions`:

```typescript
const exporter = new CsvExporter();
await exporter.export(clippings, {
  fields: ['title', 'author', 'content', 'date'],  // Solo estos campos
});
```

**Beneficio:** El usuario decide exactamente qué datos exportar.
**Esfuerzo:** ~2 horas.
**Archivos:** `exporters/core/types.ts`, `csv.exporter.ts`, `json.exporter.ts`

---

### ✅ Modularización JoplinExporter (Completado)

**Implementado:** JoplinExporter (662 líneas) dividido en carpeta `formats/joplin/`:

```
exporters/formats/joplin/
├── index.ts           # JoplinExporter (orquestador, ~260 líneas)
├── types.ts           # Interfaces + constantes (~140 líneas)
├── serializers.ts     # serialize* functions (~95 líneas)
├── note-builders.ts   # createBookNote, createClippingNotes (~210 líneas)
```

Archivo `joplin.exporter.ts` mantenido como re-export para compatibilidad.

---

## v2.0 - Unificación Types → Zod (Breaking Change)

Migración estructural para usar Zod como única fuente de verdad para tipos.

### Motivación

Actualmente hay **duplicación** entre:
- `src/types/` — Interfaces TypeScript con JSDoc
- `src/schemas/` — Zod schemas

**Beneficios de unificar:**
1. Single Source of Truth
2. Validación runtime + compile-time
3. JSDoc se preserva con `.describe()`

### Alcance

| Tipo | Duplicado | Acción |
|------|-----------|--------|
| `Clipping` | Sí | Migrar a `z.infer<ClippingStrictSchema>` |
| `ParseOptions` | Sí | Migrar a `z.infer<ParseOptionsSchema>` |
| `ClippingsStats` | No | Crear schema nuevo |
| `ParseResult` | No | Crear schema nuevo |
| `ParseWarning` | No | Crear schema nuevo |

### Pasos

1. Crear schemas faltantes (`stats.schema.ts`, `result.schema.ts`)
2. Migrar JSDoc a `.describe()` de Zod
3. Eliminar tipos duplicados de `types/`
4. Actualizar barrel exports en `types/index.ts`
5. Actualizar imports en todo el proyecto (~50 archivos)
6. Bump version a v2.0.0

**Esfuerzo total:** ~6 horas.
**Breaking:** Sí, cambio de imports para usuarios que importen de `#types/`.

---

## Descartado

Ideas evaluadas que **no se implementarán** por bajo valor o complejidad injustificada.

### Bajo Valor (No justifica esfuerzo)

| Item | Razón |
|------|-------|
| Extraer emojis a constantes | Solo afecta 2-3 archivos, impacto mínimo |
| Separar HTML template a archivo | Template literal funciona bien |
| Cache para `detectLanguage` | Sin evidencia de problema de performance |
| Simplificar `TemplateEngineFactory` | Factory pattern apropiado |
| Dividir `presets.ts` | Es archivo de datos, longitud aceptable |

### Fuera de Scope (Permanente)

| Item | Razón |
|------|-------|
| PDF Export | Requiere librería pesada (~500KB) |
| Readwise Sync | API propietaria, scope creep |
| Highlight Colors | Kindle no exporta colores en `My Clippings.txt` |
| Streaming Architecture | Caso raro (archivos >50MB) |
| Plugin System | Over-engineering |
| Notion/Kobo/Apple Books | APIs propietarias, diferentes formatos |
| CLI | Fuera de scope, usuarios crean wrappers |

---

## Principios de Diseño

Criterios para evaluar nuevas propuestas:

1. **Valor real** — ¿Resuelve un problema que usuarios tienen?
2. **Simplicidad** — ¿Es la solución más simple que funciona?
3. **Mantenibilidad** — ¿Añade complejidad que hay que mantener?
4. **Scope** — ¿Está dentro del propósito de la librería?

---

## Referencias

- [Snyk: npm Package Best Practices](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

*Actualizado: 2026-01-20*
