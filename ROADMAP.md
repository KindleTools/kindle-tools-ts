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

**Problema:** El sistema de plugins (~2,100 líneas) es over-engineering. Nadie crea plugins de terceros para librerías de este tipo.

**Acción:**
- Eliminar `src/plugins/` completamente
- Remover subpath export `./plugins` de package.json
- Mover ejemplo Anki a documentación o repo separado
- Resultado: -2,100 líneas, API más simple, -1 subpath export

**Justificación:** Ver [PLAN.md](PLAN.md) sección 4.

---

### 1.2 Bug: Parser CRLF line endings

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

**Bug:** Test `should handle varying line endings` falla - el parser no maneja correctamente CRLF (`\r\n`).

**Ubicación:** `tests/unit/importers/txt/parser.test.ts:156`

**Acción:** Revisar normalización de line endings en el tokenizer/parser.

---

### 1.3 Actualizar README para v1.0

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

- [ ] Eliminar referencias al sistema de plugins (tras 1.1)
- [ ] Añadir: "v1.0 - Feature complete, accepting bug fixes only"

---

## 2. Opcional

Items útiles pero **no bloquean v1.0**.

### 2.1 Mejorar Parser CSV

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟡 Medio | ⭐⭐ |

Solo si hay bugs reportados. El parser actual funciona.

---

### 2.2 Config Validation Fuzzy Suggestions

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟢 Bajo | 🟢 Bajo | ⭐⭐⭐ |

Validar keys de configuración con suggested fixes (`extracTags` -> `extractTags`).

---

### 2.3 Author Normalization

| Impacto | Esfuerzo | Riesgo | ROI |
|---------|----------|--------|-----|
| 🟡 Medio | 🟡 Medio | 🟢 Bajo | ⭐⭐ |

Usar Levenshtein para sugerir unificación de autores ("J.K. Rowling" vs "Rowling, J.K.").

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
| **CLI / CLI Suggestions** | Usuarios crean wrappers, fuera de scope |

### Descartado Permanentemente

| Item | Razón |
|------|-------|
| PDF Export | Requiere librería pesada |
| Readwise Sync | API propietaria |
| Highlight Colors | Kindle no exporta |
| Streaming Architecture | Caso raro (50MB+) |
| Web Crypto API async | Complejidad no justificada |

### Sin Plan

- Anki Export (ya existe como ejemplo, mover a docs tras eliminar plugins)
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
| Script validar schema.json | 2026-01-16 | ✅ CI workflow + scripts/validate-schema.ts |

---

## Criterios v1.0

| Criterio | Estado |
|----------|--------|
| Tests automatizados | ✅ 829 tests (1 failing: CRLF) |
| CI/CD | ✅ GitHub Actions |
| SemVer | ✅ Changesets |
| TypeScript strict | ✅ |
| ESM + CJS | ✅ |
| Security | ✅ Zod, CSV injection protection |
| Documentación | ✅ README 900+ líneas |
| Error handling | ✅ neverthrow |
| Dependencies | ✅ 6 runtime (reducido de 8) |

**Pendiente:**
- [ ] Eliminar plugins (1.1)
- [ ] Fix CRLF parser (1.2)
- [ ] README v1.0 (1.3)

---

## Referencias

- [Snyk: npm Package Best Practices](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [npm-module-checklist](https://github.com/bahmutov/npm-module-checklist)

---

*Actualizado: 2026-01-16 | Para v1.0: 3 items | Opcional: 3 items*
