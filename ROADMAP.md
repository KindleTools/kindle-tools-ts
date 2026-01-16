# KindleToolsTS - Roadmap

Plan para llevar el proyecto a **v1.0 estable** y cerrar el scope de features.

**Filosofía:** Terminar el proyecto, no expandirlo indefinidamente. Ver [PLAN.md](PLAN.md).

> **Arquitectura documentada en:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| 🔴 | Alto |
| 🟡 | Medio |
| 🟢 | Bajo |
| ⭐⭐⭐ | ROI Excelente |

---

## Índice

1. [Para v1.0 (Prioritario)](#1-para-v10-prioritario)
2. [Opcional](#2-opcional)
3. [Not Planned](#3-not-planned)
4. [Completado](#4-completado)

---

## 1. Para v1.0 (Prioritario)

### 1.1 Simplificar/Eliminar Sistema de Plugins

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🔴 Alto | 🟡 Medio | 🟡 Medio | ⭐⭐⭐ |

**Problema:** El sistema de plugins (~1,200 líneas) es over-engineering. Nadie crea plugins de terceros para librerías de este tipo.

**Acción:**
- Eliminar `src/plugins/` completamente
- Remover subpath export `./plugins` de package.json
- Mover ejemplo Anki a documentación o repo separado
- Resultado: -1,200 líneas, API más simple, -1 subpath export

**Justificación:** Ver [PLAN.md](PLAN.md) sección 4.

---

### 1.2 [COMPLETADO]  Tests para generatePath

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Ubicación:** `tests/unit/exporters/exporter-utils.test.ts`

```typescript
describe("generatePath", () => {
  it("replaces placeholders", () => {
    expect(generatePath("{author}/{title}", { title: "1984", author: "Orwell" }))
      .toBe("Orwell/1984");
  });
  it("uses 'unknown' for missing fields", () => {
    expect(generatePath("{series}/{title}", { title: "Book" }))
      .toBe("unknown/Book");
  });
  it("sanitizes special characters", () => {
    expect(generatePath("{title}", { title: "A/B:C" })).toMatch(/A.B.C/);
  });
});
```

**Estado:** ✅ Completado (Tests verificados en `tests/unit/exporters/exporter-utils.test.ts`)


---

### 1.3 Script validar schema.json en CI

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Problema:** `schema.json` puede desincronizarse de schemas Zod.

```typescript
// scripts/validate-schema.ts
const generated = zodToJsonSchema(ConfigFileSchema);
if (JSON.stringify(generated) !== JSON.stringify(existingSchema)) {
  console.error("schema.json out of sync!");
  process.exit(1);
}
```

**Añadir:** `"check:schema": "tsx scripts/validate-schema.ts"` a package.json.

---

### 1.4 Actualizar README para v1.0

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

- [x] Eliminar referencias a cosmiconfig
- [ ] Eliminar referencias al sistema de plugins (tras 1.1)
- [ ] Añadir: "v1.0 - Feature complete, accepting bug fixes only"

---

## 2. Opcional

Items útiles pero **no bloquean v1.0**.

### 2.1 [COMPLETADO] Consolidar Test Fixtures

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

Mover fixtures duplicados a `tests/fixtures/`.

---

### 2.2 Fuzzy CSV Headers

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

Sugerir correcciones para headers con typos (`Titl` → `Title`) usando `fastest-levenshtein`.

---

### 2.3 [COMPLETADO] Tests: Cobertura Importers

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

Tests para: múltiples errores, sugerencias de typos, MAX_VALIDATION_ERRORS.

**Estado:** ✅ Completado (Tests verificados en `tests/unit/importers/importers.test.ts`)

---

### 2.4 Mejorar Parser CSV

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟡 Medio | ⭐⭐ |

Solo si hay bugs reportados. El parser actual funciona.

---

## 3. Not Planned

### Descartado (según PLAN.md)

| Item | Razón |
|------|-------|
| **TypeDoc API Documentation** | README de 900+ líneas es suficiente |
| **VitePress Documentation Site** | Over-engineering |
| **Architecture Decision Records** | ARCHITECTURE.md basta |
| **Browser Entry Point separado** | El actual funciona en browser |
| **Performance Benchmarking** | No hay problemas de rendimiento reportados |
| **Refactorizar archivos largos** | Código funciona, refactor estético no justifica riesgo |
| **Plugin Registry Split** | Irrelevante si eliminamos plugins |
| **Monorepo Structure** | Complejidad no justificada |
| **Path Modifiers** | Scope creep |
| **Fuzzy Template Suggestions** | Nice-to-have, no esencial |
| **Proactive Path Validation** | El usuario puede validar antes |

### Descartado Permanentemente

| Item | Razón |
|------|-------|
| PDF Export | Requiere librería pesada |
| Readwise Sync | API propietaria |
| Highlight Colors | Kindle no exporta |
| Streaming Architecture | Caso raro (50MB+) |
| CLI | Usuarios crean wrappers |
| Web Crypto API async | Complejidad no justificada |

### Sin Plan

- Anki Export (ya existe como ejemplo)
- Notion/Kobo/Apple Books (APIs propietarias, fuera de scope)
- measureTime utility (nice-to-have)

---

## 4. Completado

| Item | Fecha | Verificado |
|------|-------|------------|
| MAX_VALIDATION_ERRORS en importers | 2026-01-15 | ✅ CSV, JSON, TXT |
| Exportar logDebug/logInfo | 2026-01-15 | ✅ src/index.ts |
| Error Codes en README | 2026-01-15 | ✅ |
| Eliminar cosmiconfig | 2026-01-16 | ✅ |
| CSV Type Validation (Zod enum) | 2026-01-15 | ✅ |
| Logging en Importers | 2026-01-15 | ✅ logDebug en CSV/JSON/TXT |
| Consolidar Test Fixtures | 2026-01-16 | ✅ |
| Tests Generate Path | 2026-01-16 | ✅ |
| Cobertura Importers | 2026-01-16 | ✅ |

---

## Criterios v1.0

| Criterio | Estado |
|----------|--------|
| Tests automatizados | ✅ 808 tests |
| CI/CD | ✅ GitHub Actions |
| SemVer | ✅ Changesets |
| TypeScript strict | ✅ |
| ESM + CJS | ✅ |
| Security | ✅ Zod, CSV injection protection |
| Documentación | ✅ README 900+ líneas |
| Error handling | ✅ neverthrow |

**Pendiente:**
- [ ] Eliminar plugins (1.1)
- [ ] Eliminar plugins (1.1)
- [x] Tests generatePath (1.2)
- [ ] Script schema (1.3)
- [ ] README v1.0 (1.4)

---

## Referencias

- [Snyk: npm Package Best Practices](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [npm-module-checklist](https://github.com/bahmutov/npm-module-checklist)

---

*Actualizado: 2026-01-16 | Para v1.0: 4 items | Opcional: 4 items*
