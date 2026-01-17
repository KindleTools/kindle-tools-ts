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

### 1.1 Bug: Parser CRLF line endings

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Bug:** Test `should handle varying line endings` falla - el parser no maneja correctamente CRLF (`\r\n`).

**Ubicación:** `tests/unit/importers/txt/parser.test.ts:156`

**Acción:** Revisar normalización de line endings en el tokenizer/parser.

---

### 1.2 Actualizar README para v1.0

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

- [x] Eliminar referencias al sistema de plugins
- [ ] Añadir: "v1.0 - Feature complete, accepting bug fixes only"

---

## 2. Opcional

Items útiles pero **no bloquean v1.0**. Filosofía: solo limpieza de bajo riesgo.

### 2.1 Eliminar LegacyExportResult

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `src/exporters/core/types.ts:159-167`

Tipo deprecado sin uso interno. Verificar si hay consumidores externos antes de eliminar.

---

### 2.2 Limpiar aliases redundantes de schema

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `src/schemas/exporter.schema.ts:31-52`

`FolderStructureSchema`, `AuthorCaseSchema`, `ExporterTagCaseSchema` son re-exports del mismo schema base.

---

### 2.3 Eliminar deprecated constants

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟢 Bajo | 🟢 Bajo | 🟢 Bajo | ⭐⭐ |

**Ubicación:** `src/domain/core/constants.ts:1-26`

Re-exports deprecados desde `../rules.js`.

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
| **Monorepo Structure** | Complejidad no justificada |
| **Path Modifiers** | Scope creep |
| **Fuzzy Template Suggestions** | Nice-to-have, no esencial |
| **Proactive Path Validation** | El usuario puede validar antes |
| **CLI / CLI Suggestions** | Usuarios crean wrappers, fuera de scope |
| **Fuzzy TXT Parsing** | Over-engineering, el parser funciona |
| **Author Normalization O(n)** | Optimización prematura |
| **Universal Compatibility Layer** | Ya funciona en browser |
| **Workbench Refactoring** | Está en tests/, no afecta bundle |
| **Dependency Injection Expansion** | Over-engineering |

### Descartado Permanentemente

| Item | Razón |
|------|-------|
| PDF Export | Requiere librería pesada |
| Readwise Sync | API propietaria |
| Highlight Colors | Kindle no exporta |
| Streaming Architecture | Caso raro (50MB+) |
| Web Crypto API async | Complejidad no justificada |
| Plugin System | Eliminado - over-engineering |

### Sin Plan

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
| Consolidar Test Fixtures | 2026-01-16 | ✅ tests/fixtures/ |
| Tests Generate Path | 2026-01-16 | ✅ exporter-utils.test.ts |
| Cobertura Importers | 2026-01-16 | ✅ importers.test.ts |
| Fuzzy CSV Headers | 2026-01-16 | ✅ csv-fuzzy-headers.test.ts |
| **Eliminar sistema de plugins** | 2026-01-16 | ✅ -2,100 líneas, -84 tests |
| **Eliminar ConfigFile/defineConfig** | 2026-01-16 | ✅ -170 líneas, API simplificada |

---

## Criterios v1.0

| Criterio | Estado |
|----------|--------|
| Tests automatizados | ✅ 736 tests (1 failing: CRLF) |
| CI/CD | ✅ GitHub Actions |
| SemVer | ✅ Changesets |
| TypeScript strict | ✅ |
| ESM + CJS | ✅ |
| Security | ✅ Zod, CSV injection protection |
| Documentación | ✅ README 800+ líneas |
| Error handling | ✅ neverthrow |
| Dependencies | ✅ 6 runtime |

**Pendiente:**
- [ ] Fix CRLF parser (1.1)
- [ ] README v1.0 (1.2)

---

## Referencias

- [Snyk: npm Package Best Practices](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [npm-module-checklist](https://github.com/bahmutov/npm-module-checklist)

---

*Actualizado: 2026-01-17 | Para v1.0: 2 items | Opcional: 3 items (limpieza)*
