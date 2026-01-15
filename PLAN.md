# PLAN.md - Análisis de Viabilidad y Simplificación

## Contexto

Este documento analiza el estado actual de **KindleToolsTS** para determinar qué funcionalidades tienen sentido mantener, cuáles podrían simplificarse, y cómo llegar a un "punto de cierre" profesional sin que el proyecto siga expandiéndose indefinidamente.

---

## 1. Estado Actual del Proyecto

### Métricas

| Métrica | Valor | Observación |
|---------|-------|-------------|
| Archivos TypeScript | 108 | Alto para una librería npm |
| Líneas de código (src/) | ~15,500 | Considerable |
| Dependencias runtime | 8 | Razonable |
| Formatos de export | 6 | Completo |
| Idiomas soportados | 11 | Muy completo |
| Archivos de test | 49 | Buena cobertura |

### Arquitectura

El proyecto sigue Clean Architecture / DDD con capas bien definidas:
- **Domain**: Lógica pura de negocio
- **Core**: Orquestación (processor)
- **Importers/Exporters**: Adaptadores
- **Plugins**: Sistema extensible
- **Templates**: Motor Handlebars
- **Schemas**: Validación Zod

---

## 2. Comparativa con la Competencia

He analizado los paquetes npm existentes para parsing de Kindle clippings:

| Paquete | Estado | Idiomas | Exports | Extras |
|---------|--------|---------|---------|--------|
| **klip** | Abandonado (~5 años) | EN | JSON | CLI básico |
| **kindle-clipping** | Abandonado | EN | JSON | Merge básico |
| **@sole/kindle-clippings-parser** | Abandonado | EN | - | Solo parsing |
| **@darylserrano/kindle-clippings** | Abandonado (5 años) | EN | - | - |
| **@hadynz/kindle-clippings** | Abandonado (3 años) | EN/ES/FR | - | - |
| **kindle-tools-ts (este)** | Activo | 11 | 6 formatos | Plugins, templates, dedup, merge... |

### Conclusión de Competencia

**No hay competencia real.** Todos los paquetes existentes son:
- Proyectos abandonados hace años
- Funcionalidad mínima (solo parsing básico)
- Solo inglés o pocos idiomas
- Sin mantenimiento ni tipos TypeScript modernos

**KindleToolsTS es, con diferencia, la solución más completa.** Pero eso plantea la pregunta: ¿es necesario ser TAN completo?

---

## 3. Análisis por Módulo: ¿Qué Tiene Sentido?

### ✅ CORE - Mantener (esencial)

| Módulo | Justificación |
|--------|---------------|
| **Parser TXT** | El corazón del proyecto. Imprescindible. |
| **Detección de idioma** | Diferenciador clave. Sin esto, solo funcionaría en inglés. |
| **Deduplicación** | Muy solicitado. Los clippings se duplican constantemente. |
| **Merge de highlights** | Valor real: Kindle fragmenta highlights largos. |
| **Vinculación notas-highlights** | Útil y único en el mercado. |

### ✅ EXPORTERS - Mantener (core value)

| Formato | Justificación | ¿Mantener? |
|---------|---------------|------------|
| **JSON** | Formato base universal | ✅ Sí |
| **CSV** | Excel, Google Sheets | ✅ Sí |
| **Markdown** | El más solicitado | ✅ Sí |
| **Obsidian** | Gran comunidad, demanda real | ✅ Sí |
| **HTML** | Visualización standalone | ⚠️ Evaluar |
| **Joplin** | Nicho pequeño, código complejo | ⚠️ Evaluar |

### ⚠️ CUESTIONABLE - Evaluar necesidad real

| Módulo | Líneas | Problema | Recomendación |
|--------|--------|----------|---------------|
| **Sistema de Plugins** | ~1,200 | ¿Quién lo va a usar? | Simplificar o eliminar |
| **Motor de Templates** | ~1,400 | Complejidad alta para uso bajo | Simplificar |
| **Importers (JSON/CSV)** | ~600 | ¿Caso de uso real? | Evaluar |
| **Joplin Exporter** | 510 | Muy complejo, nicho pequeño | Mover a plugin externo |
| **Config loader (cosmiconfig)** | ~400 | ¿Necesario para una librería? | Simplificar |

### ❌ CANDIDATOS A ELIMINAR

| Módulo | Razón para eliminar |
|--------|---------------------|
| **Sistema de plugins completo** | Over-engineering. Nadie crea plugins para librerías de este tipo. |
| **Hooks (beforeExport, afterImport)** | Sin casos de uso reales documentados. |
| **Template presets (7 tipos)** | Demasiados. 2-3 bastarían. |
| **Config file discovery (6+ formatos)** | .kindletoolsrc.toml? ¿En serio? JSON basta. |
| **Plugin discovery dinámico** | Complejidad innecesaria. |

---

## 4. Dependencias: Análisis

### Runtime Dependencies (8)

| Dependencia | Tamaño | ¿Necesaria? | Alternativa |
|-------------|--------|-------------|-------------|
| **zod** | ~50KB | ✅ Sí | Core para validación |
| **date-fns** | ~80KB (con locales) | ✅ Sí | Necesario para 11 idiomas |
| **handlebars** | ~80KB | ⚠️ Evaluar | ¿String templates bastarían? |
| **jszip** | ~90KB | ⚠️ Solo Joplin | Mover a plugin |
| **neverthrow** | ~5KB | ⚠️ Gusto personal | Podría ser internal |
| **cosmiconfig** | ~20KB | ❌ Excesivo | Config manual |
| **@iarna/toml** | ~30KB | ❌ ¿Quién usa TOML? | Eliminar |
| **fastest-levenshtein** | ~2KB | ✅ Útil | Mantener |

### Potencial de Reducción

Si eliminamos/simplificamos:
- cosmiconfig + @iarna/toml: -50KB
- jszip (movido a plugin): -90KB
- handlebars (templates simples): -80KB

**Reducción potencial: ~220KB** (de ~335KB actuales = **65% menos**)

---

## 5. Propuesta de Simplificación

### Opción A: Poda Ligera (Conservador)

Mantener la arquitectura actual pero:
1. Eliminar config loader complejo → Solo `parseConfig(options)`
2. Eliminar sistema de plugins → Los usuarios que quieran plugins hacen fork
3. Reducir template presets de 7 a 3 (default, minimal, obsidian)
4. Mover Joplin exporter a repositorio separado

**Resultado**: ~12,000 líneas, 5 dependencias

### Opción B: Core Only (Agresivo)

Librería minimalista:
1. Parser + Processor (dedup, merge, link)
2. Exporters: JSON, CSV, Markdown, Obsidian
3. Sin plugins, sin templates customizables, sin config files
4. Configuración via objeto JavaScript simple

**Resultado**: ~6,000 líneas, 3 dependencias (zod, date-fns, fastest-levenshtein)

### Opción C: Estado Actual + Cierre (Pragmático)

Aceptar que el proyecto ya está "completo" y:
1. Declarar feature-freeze
2. Solo bug fixes y security patches
3. No añadir nada nuevo
4. Documentar "this is it"

**Resultado**: Mantener las ~15,500 líneas pero no crecer más

---

## 6. Mi Recomendación

### El Problema Real

El proyecto no está "mal diseñado". El problema es el **scope creep mental**: siempre hay "una cosa más" que sería útil.

### La Solución

**Opción C modificada: Feature Freeze + Poda selectiva**

1. **Declarar v1.0** como "feature complete"
2. **Eliminar** lo que nadie usa (no lo que "podría" usarse):
   - Sistema de plugins complejo → Reemplazar por documentación de cómo extender
   - Config file discovery → Solo objeto de config
   - TOML support → Nadie lo necesita
3. **Mantener** todo lo que da valor diferencial:
   - 11 idiomas
   - Deduplicación inteligente
   - Merge de highlights
   - Los 5-6 exporters (incluso Joplin, ya está hecho)
4. **Cerrar el ROADMAP**:
   - Mover todo a "Won't Do" excepto bugs reales
   - No añadir features nuevas

---

## 7. Qué Cortar del ROADMAP Actual

### Eliminar de "Media Prioridad"

| Item | Razón |
|------|-------|
| TypeDoc API Documentation | Over-engineering. El README es suficiente. |
| Mejorar Parser CSV | El actual funciona. No gold-plating. |

### Eliminar de "Baja Prioridad"

| Item | Razón |
|------|-------|
| VitePress Documentation Site | Un README basta para una librería de este tipo |
| Architecture Decision Records | Nadie los lee |
| Browser Entry Point separado | El actual ya funciona en browser |
| Performance Benchmarking | Premature optimization |
| Plugin Registry Split | Si eliminamos plugins, irrelevante |

### Eliminar de "Para Estudio"

| Item | Razón |
|------|-------|
| Monorepo Structure | Complejidad innecesaria |
| Plugin Registry Split | Ver arriba |

### Mantener (Quick Wins Reales)

| Item | Razón |
|------|-------|
| Bug Fix CSV Type Validation | Es un bug real |
| Límites de Seguridad de Memoria | Seguridad real |
| Consolidar Test Fixtures | Mantenibilidad |

---

## 8. Definición de "Terminado"

### v1.0 Release Criteria

Para poder decir "el proyecto está terminado":

1. **Funcionalidad Core**: ✅ Ya está
   - Parser funciona con 11 idiomas
   - Deduplicación y merge funcionan
   - 5 exporters principales funcionan

2. **Calidad**: Parcial
   - [ ] Fix del bug CSV Type Validation
   - [ ] Tests para generatePath
   - [ ] Límites de memoria en importers

3. **Documentación**: ✅ Ya está
   - README completo
   - Ejemplos de uso
   - API documentada inline

4. **Simplificación**:
   - [ ] Eliminar cosmiconfig (config via objeto)
   - [ ] Eliminar @iarna/toml
   - [ ] Simplificar o eliminar sistema de plugins

### Post-v1.0

- Solo bug fixes
- No features nuevas
- PRs de la comunidad evaluados con criterio estricto

---

## 9. Conclusión

### El proyecto NO está mal

Es una librería bien diseñada, con buena arquitectura y funcionalidad real. El problema no es técnico, es de **scope**.

### La solución NO es reescribir

Es **cerrar**. Declarar que está terminado y resistir la tentación de "mejorar" cosas que ya funcionan.

### Acciones Concretas

1. **Hacer los 3 bug fixes** de Media Prioridad con ROI alto
2. **Eliminar plugins** (o reducir a lo mínimo)
3. **Eliminar cosmiconfig** → Config simple
4. **Publicar v1.0** con changelog
5. **Cerrar ROADMAP** → Solo "Bugs" y "Won't Do"
6. **Escribir en README**: "Feature complete. Only accepting bug fixes."

### Lo que NO hacer

- No añadir más exporters
- No añadir más idiomas
- No mejorar el sistema de templates
- No crear documentación elaborada
- No crear sitio web
- No hacer monorepo

---

## 10. Resumen Ejecutivo

| Aspecto | Estado Actual | Recomendación |
|---------|---------------|---------------|
| **Arquitectura** | Buena | Mantener |
| **Core (parser, processor)** | Completo | Mantener |
| **Exporters** | 6 formatos | Mantener los 5-6 |
| **Plugins** | Over-engineered | Eliminar o simplificar drásticamente |
| **Templates** | Complejo | Reducir presets de 7 a 3 |
| **Config** | Over-engineered | Simplificar a objeto JS |
| **Dependencias** | 8 | Reducir a 4-5 |
| **Scope** | Creciendo | Congelar |

### El verdadero problema

No es "¿qué más añadir?" sino "¿cuándo parar?".

**La respuesta: Ahora.**

---

*Documento generado: 2026-01-15*
*Autor: Análisis asistido por Claude*
