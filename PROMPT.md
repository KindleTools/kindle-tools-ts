# Generación de kindle-tools-ts

**Rol:** Actúa como un Staff Software Engineer experto en Node.js, TypeScript y desarrollo de herramientas Open Source.
**Objetivo:** Generar el andamiaje y el código core de `kindle-tools-ts`, una NPM Package robusta para procesar archivos `My Clippings.txt` de Amazon Kindle.

## Contexto y Arquitectura

El proyecto debe seguir una arquitectura modular y moderna, lista para producción en 2026.

* **Patrón de Diseño:** Utiliza el **Patrón Strategy** para separar el *Parser* (Core) de los *Exporters* (Salida).
* **Build System:** Configuración **Dual Build** (ESM y CommonJS) utilizando `tsup`.
* **Tooling:** Configura `Vitest` para testing, `ESLint` + `Prettier` para calidad de código, y `Husky` para pre-commit hooks.
* **Validación:** Usa `zod` si es necesario validar esquemas de entrada/salida.

## Estructura de Archivos Recomendada

Sigue estrictamente esta estructura:

```text
kindle-tools-ts/
├── src/
│   ├── core/
│   │   ├── parser.ts      # Lógica de extracción y Regex
│   │   ├── processor.ts   # Lógica de limpieza, Smart Merging y Deduplicación
│   │   └── constants.ts   # LANGUAGE_MAP, Regex patterns
│   ├── exporters/
│   │   ├── json.ts
│   │   ├── csv.ts
│   │   └── markdown.ts    # Lógica avanzada para Obsidian
│   ├── utils/
│   │   ├── dates.ts       # Manejo robusto de fechas
│   │   └── sanitizers.ts  # Limpieza de títulos (BOM, extensiones)
│   ├── types/
│   │   └── index.ts       # Interfaces compartidas
│   └── index.ts           # Entry point Librería
├── tests/                 # Unit tests con Vitest
├── package.json
└── tsup.config.ts

```

## Lógica del Core (Parser & Processor)

El parser debe ser extremadamente resiliente. Implementa lo siguiente en `src/core`:

1. **Limpieza Inicial:** Elimina el carácter BOM (Byte Order Mark) al inicio del archivo.
2. **Detección de Separador:** El Regex del separador `==========` debe funcionar tanto con saltos de línea Windows (`\r\n`) como Unix (`\n`).
3. **Soporte Multi-idioma:** Implementa un `LANGUAGE_MAP` para detectar metadatos en Español ("Añadido el"), Inglés ("Added on") y Portugués ("Adicionado em").
4. **Normalización de Títulos:**
* Separa Autor de Título (ej: "El Quijote (Cervantes)" -> Título: "El Quijote", Autor: "Cervantes").
* Elimina extensiones de archivos "sideloaded" (ej: limpiar `.pdf`, `.epub`, `_EBOK`).
5. **Manejo de Fechas:** Usa `date-fns` para parsear fechas con variaciones regionales (US vs UK formats).

### Funcionalidades Avanzadas ("Smart Logic")

* **Smart Merging (Crítico):** Si el usuario ha subrayado un texto y luego lo ha extendido, el parser debe detectar solapamientos (overlapping) basados en la ubicación (`location`) y el contenido. Debe fusionarlos manteniendo la versión más larga/reciente.
* **Deduplicación:** Elimina duplicados exactos basados en un hash del contenido + ubicación.
* **Detección de DRM:** Si un recorte está vacío o contiene mensajes de "Límite de exportación excedido", márcalo en el objeto resultante (flag `isLimitReached`).

## Modelado de Datos (TypeScript Interface)

```typescript
interface Clipping {
  id: string;          // Hash único
  title: string;       // Título limpio
  author: string;
  content: string;
  type: 'highlight' | 'note' | 'bookmark';
  page: string | null;
  location: string;    // Ej: "105-106"
  date: Date;
  rawDate: string;     // Fecha original por si falla el parseo
  isLimitReached?: boolean;
  rawContent: string;    // El texto original del recorte
}

```

## Exporters (Especial énfasis en Markdown)

* **JSON/CSV:** Exportaciones estándar planas.
* **Markdown Pro (Obsidian Ready):**
* No generes un solo archivo gigante. Crea una estructura: `output/Título Del Libro/Resumen.md`.
* **Frontmatter:** Incluye YAML al inicio (Title, Author, Date, Tags).
* **Callouts:** Formatea las notas del usuario ("My Note") usando la sintaxis de Callouts de Obsidian (`> [!NOTE]`) para diferenciarlas visualmente de los subrayados del libro.

## Entregables Solicitados

Por favor, genera el código para los los archivos clave. Nota final: Prioriza la legibilidad del código y el manejo de errores.
