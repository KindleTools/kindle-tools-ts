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

### Preview Mode / Dry Run (GUI Support)

**Problema:** Las transformaciones (merge, dedupe, link) se aplican sin que el usuario pueda ver exactamente qué cambiará. Para una GUI, el usuario necesita revisar y aprobar decisiones.

**Estado actual:**
- Las funciones individuales están exportadas y pueden llamarse por separado
- `removeDuplicates(clippings, false)` flaguea en vez de borrar
- `smartMergeHighlights(clippings, false)` flaguea en vez de fusionar
- Los clippings tienen campos: `isSuspiciousHighlight`, `possibleDuplicateOf`, `similarityScore`

**Lo que falta:** No hay forma de obtener los **pares exactos** de qué se fusionaría con qué.

**Propuesta:** Añadir función `previewProcessing()` que retorna:

```typescript
interface ProcessingPreview {
  duplicates: Array<{ keep: Clipping; discard: Clipping; reason: 'exact' | 'fuzzy' }>;
  merges: Array<{ result: Clipping; sources: [Clipping, Clipping] }>;
  noteLinks: Array<{ highlight: Clipping; note: Clipping; confidence: number }>;
  suspicious: Array<{ clipping: Clipping; reason: SuspiciousReason }>;
  orphanNotes: Clipping[];  // Notas sin highlight asociado
}

// Uso en GUI
const preview = previewProcessing(clippings);
// Mostrar al usuario: "Se fusionarán estos 5 pares de highlights..."
// Usuario aprueba/rechaza cada uno
const approved = userSelectsFromPreview(preview);
const final = applyApprovedChanges(clippings, approved);
```

**Beneficio:** GUI puede mostrar decisiones antes de aplicarlas.
**Esfuerzo:** ~4-6 horas.
**Archivos:** `core/processor.ts`, nuevo `core/preview.ts`

---

### Normalización de Autores

**Problema:** El mismo autor puede aparecer como "J.K. Rowling", "Rowling, J.K.", "JK Rowling" creando libros "duplicados" en la vista.

**Estado actual:** Existe `author-normalizer.ts` con `areSameAuthor()` pero NO está integrado en el procesamiento.

**Propuesta:** Añadir paso opcional de normalización:

```typescript
processClippings(clippings, {
  normalizeAuthors: true,  // Unifica variantes de autor
});

// O para GUI, preview de sugerencias:
const authorGroups = detectAuthorVariants(clippings);
// [{ canonical: "J.K. Rowling", variants: ["Rowling, J.K.", "JK Rowling"], count: 15 }]
```

**Beneficio:** Vista más limpia agrupando por autor real.
**Esfuerzo:** ~2-3 horas.
**Archivos:** `core/processing/author-normalizer.ts` (nuevo), `processor.ts`

---

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
