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
