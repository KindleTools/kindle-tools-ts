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

**✅ COMPLETADO** - Todas las tareas de limpieza para v1.0 han sido realizadas (2026-01-18).

---

## 2. Opcional

*No hay items pendientes.*

---

## 3. Not Planned

### Descartado (según PLAN.md)

| Item | Razón |
|------|-------|
| **TypeDoc API Documentation** | README de 900+ líneas es suficiente |
| **VitePress Documentation Site** | Over-engineering |
| **Architecture Decision Records** | ARCHITECTURE.md basta |
| **Browser Entry Point separado** | El actual funciona en browser |
| **Refactorizar archivos largos** | Código funciona, refactor estético no justifica riesgo |
| **Monorepo Structure** | Complejidad no justificada |
| **Path Modifiers** | Scope creep |
| **Fuzzy Template Suggestions** | Nice-to-have, no esencial |
| **Proactive Path Validation** | El usuario puede validar antes |
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
| Performance Benchmarking | No hay problemas de rendimiento reportados |
| CLI / CLI Suggestions | Usuarios crean wrappers, fuera de scope |

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
| **Bug CRLF line endings** | 2026-01-17 | ✅ tokenizer ya normaliza |
| **Eliminar LegacyExportResult** | 2026-01-17 | ✅ tipo deprecado eliminado |
| **Eliminar ExporterTagCaseSchema** | 2026-01-17 | ✅ alias no usado eliminado |
| **Eliminar deprecated constants** | 2026-01-17 | ✅ re-exports de rules.js |
| **Eliminar residuos plugins (errores)** | 2026-01-17 | ✅ PluginError, PluginErrorCodes |
| **Eliminar validateConfig** | 2026-01-17 | ✅ código CLI huérfano |
| **Limpiar ARCHITECTURE.md (plugins)** | 2026-01-18 | ✅ 4 secciones eliminadas |
| **Limpiar docs/ARCHITECTURE.md (plugins)** | 2026-01-18 | ✅ 3 secciones actualizadas |
| **Limpiar src/index.ts (comentarios)** | 2026-01-18 | ✅ comentarios duplicados |
| **README v1.0 - Feature Complete** | 2026-01-18 | ✅ nota añadida |

---

## Criterios v1.0

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

**Pendiente:** *Ninguno - Listo para v1.0*

---

## Referencias

- [Snyk: npm Package Best Practices](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [npm-module-checklist](https://github.com/bahmutov/npm-module-checklist)

---

*Actualizado: 2026-01-18 | **v1.0 READY** | Para v1.0: 0 items | Opcional: 0 items*
