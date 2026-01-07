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
│   ├── languages.ts      # Language definitions & patterns
│   └── geography.ts      # Geolocation extensions
│
├── importers/            # 📥 Data Ingestion
│   ├── core/             # Base interfaces and factories
│   ├── formats/          # Concrete implementation (txt, json, csv)
│   └── shared/           # Shared utilities
│
├── exporters/            # 📤 Data Egress
│   ├── core/             # Base interfaces and factories
│   ├── formats/          # Concrete implementations (md, json, joplin...)
│   └── shared/           # Shared utilities
│
├── utils/                # 🛠️ Generic Tools (Stateless & Dumb)
│   ├── fs/               # File system helpers (ZIP, TAR)
│   ├── system/           # Date formatting, Error handling
│   └── text/             # Basic string manip (Encoding, Normalizing)
│
├── templates/            # 🎨 Export Templates (Handlebars)
│   └── default.ts        # Default layouts
│
│
├── node/                 # 🟢 Node.js Entry Point
│   └── index.ts          # Node-specific exports (FileSystem access)
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

### 4. Universal Core vs Node Adapters
**Decision**: Split `src/index.ts` (Universal) and `src/node/index.ts` (Node.js).
**Reason**: To ensure the library works in strictly non-Node environments (like Browsers or Edge Workers), the main entry point MUST NOT depend on 'fs' or 'path'. Node-specific functionality (like `parseFile`) is isolated in a separate entry point.

### 5. Languages as a Domain Concept
**Decision**: Moved `languages.ts` to `domain`.
**Reason**:  Knowledge about what languages are supported and their specific patterns (date formats, keywords) is a core part of the "Kindle Domain", not just an implementation detail of the text parser. This decoupling allows other parts of the system to be language-aware without depending on the `txt` importer.

### 6. Importer/Exporter Pattern
**Decision**: Use a Strategy Pattern for Importers and Exporters.
**Reason**: Allows easy extension. New formats (e.g., Readwise CSV, Notion API) can be added as new classes without modifying the core processing pipeline.

### 7. Deterministic Processing
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
