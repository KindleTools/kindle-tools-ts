# Architecture & Design Decisions

## 🏗️ Project Structure

This project follows a **Feature/Domain-based Architecture**, moving away from a traditional Layered Architecture (controllers/services/utils) to better reflect the business domain.

### Core Principles

1.  **Collocation**: Code that changes together stays together.
2.  **Explicit Domain**: The `core` folder contains the business rules, not generic utilities.
3.  **Dependency Rule**: Dependencies point inwards. Importers depend on Core; Core depends on nothing (or minimal Utils).

### Directory Brekadown

```
src/
├── core/                 # 🧠 The Brain: Domain Logic (Business Rules)
│   ├── processor.ts      # Main pipeline orchestration
│   ├── hashing.ts        # ID generation logic (Business Rule)
│   ├── similarity.ts     # Fuzzy duplicate detection logic (Business Rule)
│   └── constants.ts      # Domain constants
│
├── domain/               # 📦 Domain Entities & Pure Logic
│   ├── stats.ts          # Statistics calculation
│   ├── sanitizers.ts     # Data cleaning rules
│   └── geo-location.ts   # Geolocation extensions
│
├── importers/            # 📥 Data Ingestion
│   ├── txt/              # Kindle "My Clippings.txt" parser
│   │   ├── core/         # Parser-specific logic (Tokenizer, Cleaner)
│   │   └── index.ts
│   ├── json/             # JSON importer
│   └── csv/              # CSV importer
│
├── exporters/            # 📤 Data Egress
│   ├── markdown/         # Markdown & Almanac-style exports
│   ├── json/             # JSON data dump
│   ├── joplin/           # JEX (Joplin Export) archive generation
│   └── obsidian/         # Obsidian vault generation
│
├── utils/                # 🛠️ Generic Tools (Stateless & Dumb)
│   ├── fs/               # File system helpers (ZIP, TAR)
│   ├── system/           # Date formatting, Error handling
│   └── text/             # Basic string manip (Encoding, Normalizing)
│
├── templates/            # 🎨 Export Templates (Handlebars)
│   └── default.ts        # Default layouts
│
└── gui/                  # 🖥️ Web Interface (Vite/Vanilla JS)
    └── main.ts
```

---

## 🧠 Key Design Decisions

### 1. Hashing as a Domain Concept
**Decision**: Moved `hashing.ts` from `utils` to `core`.
**Reason**: The generation of a Clipping ID is not a generic utility. It is a fundamental business rule that defines **identity**. If we change how we hash (e.g., stopping the inclusion of location), we fundamentally change the application's behavior regarding duplicates.

### 2. Similarity Engine location
**Decision**: Moved `similarity.ts` from `utils` to `core`.
**Reason**: The Jaccard similarity logic is the engine behind the "Fuzzy Duplicate Detection" feature. It is core business logic, not a generic string utility.

### 3. Parser-Specific Cleaning
**Decision**: Moved `text-cleaner.ts` inside `importers/txt/core`.
**Reason**: This file handles artifacts specific to the Kindle TXT format (PDF line breaks, etc.). It is not a general text utility and shouldn't be exposed as such. It is highly coupled to the TXT parser.

### 4. Importer/Exporter Pattern
**Decision**: Use a Strategy Pattern for Importers and Exporters.
**Reason**: Allows easy extension. New formats (e.g., Readwise CSV, Notion API) can be added as new classes without modifying the core processing pipeline.

### 5. Deterministic Processing
**Decision**: The `process()` function in `core/processor.ts` is pure and deterministic.
**Reason**: It takes raw clippings and returns processed clippings + stats. It does not perform I/O. This makes the core logic 100% testable without mocks.

---

## 🔄 Data Flow

1.  **Import**: Raw file -> `Importer` -> `Clipping[]` (Raw)
2.  **Process**: `Clipping[]` -> `Processor` -> `Clipping[]` (Cleaned, Deduped, Linked)
3.  **Export**: `Clipping[]` -> `Exporter` -> Output (File/String/Archive)

---

## 🔮 Future Improvements

-   **Pipeline Object**: Convert the `process()` function into a composable `Pipeline` class to allow plugins/middleware.
-   **FileSystem Abstraction**: Create a proper `VirtualFileSystem` to handle exports uniformly (whether writing to disk in Node or creating a ZIP in Browser).
