# KindleToolsTS Roadmap


## 🔧 CLI & GUI Parity (Consistency Update)
Ensure the CLI and GUI offer the same set of powerful filtering and configuration options to avoid user confusion.

- [ ] **CLI Updates**:
  - Add `--exclude-types` flag (e.g., `highlight,note`).
  - Add `--min-length` flag to filter short noise.
  - Add `--filter-books` (allowlist) and `--exclude-books` (blocklist) flags.

- [ ] **GUI Updates**:
  - [x] Add **Tag Case** selector (Original / Uppercase / Lowercase) to match CLI capabilities.
  - [ ] Add **Exclude Books** text area (for blocklisting books).

## 🚀 Toolchain Optimizations (Recommended)

Improvements identified during 2026 toolchain audit to modernize the development workflow.

- [x] **Strict Type Checking (Immediate)**:
  - Add `arethetypeswrong` to CI pipeline to ensure `package.json` exports are correct for all consumers.
  - Status: Implemented check, package is valid.

- [x] **Monorepo Build Caching (Short-term)**:
  - Integrate **Turborepo** to cache `build` and `test` tasks.
  - Ensures changes to GUI don't trigger library re-tests.
  - Status: Implemented.

- [ ] **Modern Documentation (Medium-term)**:
  - Move from `README.md` to a dedicated documentation site.
  - Use **VitePress** for guides ("How to export to Obsidian").
  - Integrate **TypeDoc** for auto-generated API references.

- [ ] **CI/CD Caching (Medium-term)**:
  - Configure GitHub Actions to cache `pnpm` store and `biome` results.
  - Combine with Turborepo for near-instant CI on minor changes.

---

## ✅ **Phase 1 — Add Snyk (Dependency & Code Security)**

Introduce automated security scanning for dependencies and source code to detect vulnerabilities early.

Snyk identifies:  
- Vulnerable dependencies (direct + transitive)  
- Insecure code patterns  
- Misconfigurations  
This is essential for any npm‑published library.


```bash
pnpm add -D snyk
snyk auth
```

Add to `package.json`:
```json
"scripts": {
  "snyk:test": "snyk test",
  "snyk:monitor": "snyk monitor"
}
```
Create `.github/workflows/snyk.yml`:

```yaml
name: Snyk Security Scan

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/setup@v3
      - run: snyk test
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## ✅ **Phase 2 — Add SonarQube (Static Analysis & Code Quality)**

Introduce deep static analysis, code smell detection, and long‑term quality metrics.

SonarQube provides:  
- Bug detection  
- Code smell detection  
- Security hotspot detection  
- Coverage integration with Vitest  
- Historical quality tracking  

This elevates the project to enterprise‑grade quality.

Create `sonar-project.properties`:

```
sonar.projectKey=kindle-tools-ts
sonar.projectName=Kindle Tools TS
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.spec.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.sourceEncoding=UTF-8
```

Update `vitest.config.ts`:

```ts
export default defineConfig({
  coverage: {
    reporter: ["text", "lcov"],
  },
});
```

Run:
```bash
pnpm test:coverage
```

Create `.github/workflows/sonar.yml`:

```yaml
name: SonarQube Scan

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  sonar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install deps
        run: pnpm install

      - name: Run tests
        run: pnpm test:coverage

      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@v2
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

## ✅ **Phase 3 — Add TypeDoc (Automatic API Documentation)**

Generate clean, navigable API documentation directly from TypeScript types and comments.

TypeDoc turns your TypeScript code into professional documentation, ideal for libraries with public APIs.

```bash
pnpm add -D typedoc
```

Create `typedoc.json`:

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs",
  "tsconfig": "tsconfig.json",
  "cleanOutputDir": true
}
```

Add to `package.json`:

```json
"scripts": {
  "docs": "typedoc"
}
```

Create `.github/workflows/docs.yml`:

```yaml
name: Build Docs

on:
  push:
    branches: [ main ]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm docs
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs

  deploy:
    needs: docs
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/deploy-pages@v4

## 🚀 Phase 4 — Exporters & Security Hardening (Post-MVP)

Improve robustness and security of data exports as the user base and data sizes grow.

- [ ] **CSV Injection Protection**:
  - Update `escapeCSV` utility to prevent "Formula Injection" attacks.
  - Detect fields starting with `=`, `+`, `-`, `@`.
  - Prefix dangerous fields with a single quote `'` or space to force text interpretation in Excel/LibreOffice.

- [ ] **Large Dataset Handling (Memory Efficiency)**:
  - Refactor `JsonExporter` to use **Streaming** (e.g., `fs.createWriteStream`) instead of building huge arrays in memory.
  - Critical when user libraries exceed 50-100MB of text data.

- [ ] **Consolidated Logic**:
  - Ensure all file path generation logic (flat, by-book, by-author) uses the shared `generateFilePath` utility.
  - Standardize error handling across all exporters using the Template Method pattern in `BaseExporter`.

## 🏗️ Architecture & Flexibility Refactoring (Long Term)

Ideas to make the library more modular and customizable for power users.

- [ ] **Dynamic Path Templating**:
  - Replace rigid `FolderStructure` enums (`by-author`, `by-book`) with a template string system.
  - Example: `--path-format="{author}/{series}/{year} - {title}.md"`.
  - Requires updating `generateFilePath` to use a micro-template engine.

- [ ] **OS-Safe Filename Sanitization**:
  - Update `sanitizeFilename` to handle Windows reserved names (`CON`, `PRN`, `AUX`, `NUL`, etc.) which currently cause write errors even if characters are valid.
  - Ensure max path length (260 chars) compliance on Windows.

- [ ] **Unified Archiver Interface**:
  - Abstract `zip.ts` and `tar.ts` behind a common `Archiver` interface.
  - Allow plugging in other formats (7z, Gzip) easily without changing CLI logic.

- [ ] **Stream-First Architecture**:
  - Update `BaseExporter` signature to write directly to a `WritableStream` instead of returning the full content string.
  - Update `BaseExporter` signature to write directly to a `WritableStream` instead of returning the full content string.
  - This solves the memory issue for large exports permanently at the architecture level.

## 🧩 Code Unification & Cleanup (Low Priority)

Minor refactoring opportunities identified to improve maintainability.

- [ ] **Abstract Grouping Logic in BaseExporter**:
  - `HtmlExporter`, `JsonExporter`, and `MarkdownExporter` all implement similar `groupByBook` loops.
  - Create a `exportGroupedFiles(clippings, renderFn)` helper in `BaseExporter` to standardize file generation and path handling across all exporters.

- [ ] **Externalize HTML Styles**:
  - Move the large CSS string in `HtmlExporter` to a separate `html-styles.ts` or raw import to keep the exporter logic clean.

- [ ] **Shared Clipping Sanitizer**:
  - Move `JsonExporter`'s `prepareClippings` logic (removing raw fields, ensuring tags) to a shared utility `sanitizeClippingForExport`.
  - This allows other exporters to easily offer "clean" output modes.

- [ ] **Folder Hierarchy Abstraction**:
  - The logic for determining folder structures (`by-author`, `by-book`) is duplicated between `ObsidianExporter` and `JoplinExporter`.
  - Create a shared `PathHierarchyBuilder` or similar utility to centralize this logic.

- [ ] **Creator Metadata in Data Formats**:
  - Currently, `JSON` and `CSV` exporters do not include the `creator` (user attribution) field.
  - Consider adding this metadata to ensure full parity with Joplin/HTML exports.

- [ ] **Robust CSV Parsing**:
  - The current `CsvImporter` uses a manual parsing strategy which may be fragile with complex CSVs (e.g. quoted newlines, escaped quotes).
  - Migrate to a robust library like `csv-parse/sync` or `papaparse` for production-grade reliability, or implement a comprehensive test suite for "torture cases".

## 🌟 Project Evolution & Ecosystem

Strategic improvements to elevate the project from a library to a complete solution.

- [ ] **Real-World Stress Testing**:
  - Create a test suite with "ugly" `My Clippings.txt` files (mixed languages, legacy formats, corruption).
  - Ensure robustness against malformed separators or missing lines.

- [ ] **"Cookbook" Documentation**:
  - Create a "Recipes" section in the documentation.
  - Examples: "Obsidian Flashcards Setup", "Programming Notes Workflow".
  - Showcases practical use of `customTemplates`.

- [ ] **Automated Release Pipeline**:
  - Implement functional GitHub Actions for publishing to NPM.
  - Use `semantic-release` or `changesets` for automated versioning and changelog generation.

## 🚀 Advanced Power Features (Long Term)

High-value features to transform the reading analysis experience.

- [ ] **Metadata Enrichment (fetch-meta)**:
  - Optional integration with OpenLibrary or Google Books APIs.
  - Auto-correct book titles, fetch ISBNs, and download cover images for HTML/Obsidian exports.

- [ ] **Incremental Exports (Diff Mode)**:
  - Add `--diff-against=<previous_export.json>` flag.
  - Export only new highlights added since the last run.
  - Perfect for syncing with DBs (Notion, Airtable) without re-uploading everything.

- [ ] **Reading Habits Visualization**:
  - Enhance HTML export and GUI with "Spotify Wrapped" style charts.
  - Heatmaps (highlights per day), Reading Timeline (start/finish dates), and Time-of-Day analysis.
```

## 🛠️ Enterprise & Architecture Improvements

Features to align with enterprise-grade TypeScript tooling standards.

- [ ] **Factored Configuration**:
  - Implement a configuration loader (e.g., `cosmiconfig`) to support `.kindletoolsrc` or `kindle-tools.config.js`.
  - Allow users to persist preferences (e.g., `author-case`, `folder-structure`) instead of repeated CLI flags.

- [ ] **Structured Logging & Observability**:
  - Replace direct `console.log` calls with a proper `Logger` interface.
  - Support levels (`debug`, `info`, `warn`, `error`).
  - Add `--json` output flag for machine-consumable logs (useful for pipeline integrations).
  - Enable `--quiet` mode easily via the logger abstraction.

- [ ] **Streaming Architecture (Scalability)**:
  - Refactor `importers` to accept Node.js Streams instead of loading entire files into memory.
  - Critical for future-proofing against massive clipping libraries (500MB+).
  - Update `cli.ts` to pipe input file streams to importers.

- [ ] **Data Validation Strategy**:
  - Integrate `zod` for rigorous schema validation.
  - **Exporter Options Validation**: Implement Zod schemas for `ExporterOptions` (e.g., `MarkdownOptionsSchema`) to validate runtime configuration and provide user-friendly CLI errors.
  - Create schemas for generic JSON imports to ensure type safety at runtime.
  - Implement a configuration schema to validate `.kindletoolsrc`.
  
- [ ] **Centralized Error Handling**:
  - Create a unified `AppError` class with error codes (e.g., `ERR_IO`, `ERR_PARSE`).
  - Refactor `cli.ts` to implement a "panic handler" that distinguishes expected operational errors (print nice message) from unexpected bugs (print stack trace).

## 🔮 Visionary Features (The "Wow" Factor)

Ideas to push the boundaries of what a clipping manager can do.

- [ ] **Plugin Architecture (Extensibility)**:
  - Create a public `ExporterPlugin` interface.
  - Allow users/developers to register custom exporters at runtime: `kindleTools.registerExporter("notion", NotionExporter)`.
  - Enables a community-driven ecosystem of adapters (e.g., `kindle-tools-roam`, `kindle-tools-logseq`) without bloating the core.

- [ ] **AI Enrichment Integration (LLM)**:
  - Add optional hook for API Keys (OpenAI/Anthropic/Local).
  - **Auto-Tagging**: Analyze book highlights to suggest thematic tags.
  - **Summarization**: Generate a "Key Takeaways" summary paragraph for each book based on user highlights.

- [ ] **Property-Based Testing (Fuzzing)**:
  - Implementation using `fast-check`.
  - Generate thousands of semi-random, malformed clipping inputs to ensure the Parser never crashes (unhandled exceptions).
  - Guarantee robust handling of corrupt files or edge-case encodings.

- [ ] **"Spotify Wrapped" for Reading**:
  - Enhance `HtmlExporter` with embedded visualizations (using lightweight libraries like Chart.js or pure SVG).
  - Charts: "Highlights per Month", "Most Read Authors", "Reading Calendar Heatmap".
  - Create shareable, visual summaries of reading habits.

- [ ] **Flashcard Export (Spaced Repetition)**:
  - **Anki Support**: Export directly to `.apkg` or Anki-optimized CSV.
  - Automatically create "Cloze Deletion" cards from highlights for active recall.

- [ ] **Incremental Sync ("Diffing Mode")**:
  - The "Holy Grail" for PKM users (Obsidian, Logseq).
  - Maintain a state file (hashes of previously imported clips).
  - Run imports in "Additive Mode": Only create files for *new* highlights, preventing overwrite of manual edits in existing notes.

## 🏗️ Scalability & Robustness Improvements (Post-Refactor)

Enhancements to solidify the architecture after the migration to Native Node Subpath Imports.

- [ ] **Architectural Separation (Monorepo)**:
  - Migrate project structure to a **pnpm workspace** to strictly separate concerns.
  - `packages/core`: Pure business logic, parsers, and exporters (Environment agnostic).
  - `packages/cli`: Command Line Interface implementation.
  - `packages/gui`: Browser-based application (Vite).
  - **Goal**: Completely prevent leakage of Node.js modules (`fs`, `path`) into the browser environment and manage dependencies granularly.

- [ ] **Explicit Browser Entry Point**:
  - Add a `"browser"` field or correct `exports` condition in `package.json` pointing to a browser-specific bundle.
  - Ensure users consuming the library in web frameworks (React, Vue, etc.) automatically get the version without `fs` dependencies (using the new `file-parser.ts` logic) without extra configuration.

- [ ] **E2E Testing for GUI**:
  - Integrate **Playwright** or **Cypress** to automate GUI testing.
  - Automated flows: Page load, Drag & Drop simulation, DOM verification of parsed cards.
  - **Goal**: Ensure UI stability alongside Core logic tests.

- [ ] **Performance Benchmarking**:
  - Create a benchmark script to generate synthetic files with 10k-50k clippings.
  - Measure parsing and deduplication time to detect regressions before they affect users with large libraries.

- [ ] **Architecture Decision Records (ADR)**:
  - Document key architectural decisions:
    - Adoption of `NodeNext` and Native Subpath Imports.
    - Strategy for separating Node/Browser logic (`file-parser.ts`).
    - Usage of relative imports in GUI to avoid bundler issues.
  - Create `docs/adr/` to maintain this context for future contributors.


## 🌟 2026 Competitive Edge (Market Alignment)

Strategic features to bridge the gap with paid tools like Readwise and community plugins, focusing on privacy and local-first principles.

- [ ] **Metadata Enrichment (The "Wow" Factor)**:
  - Integrate public APIs (OpenLibrary, Google Books) to fetch covers, genres, and publication dates.
  - Transform raw text exports into "Visual Libraries" with cover art in HTML/Obsidian views.

- [ ] **Spaced Repetition Integration**:
  - Add exporters for **Anki** (`.apkg`) and **Flashcards** (Obsidian/Logseq standard `#flashcard`).
  - Convert passive highlights into active knowledge review systems.

- [ ] **"Smart Watch" Mode**:
  - Implement a daemon command (`kindle-tools watch`) that auto-detects Kindle USB connection.
  - Trigger automatic backup and sync workflows without user intervention.

- [ ] **WebAssembly (WASM) & Serverless Web App**:
  - Leverage the isomorphic core to build a pure client-side web tool hosted on GitHub Pages.
  - "Drag & Drop -> Download Vault": Zero servers, maximum privacy, instant utility for non-technical users.

- [ ] **Plugin/Extension System**:
  - Refactor `ExporterFactory` to specific plugin interfaces.
  - Allow community-contributed exporters (e.g., `kindle-tools-notion`, `kindle-tools-roam`) to be loaded at runtime.

## 🧹 API Cleanliness & Maintenance

Tasks focused on long-term maintainability and developer experience.

- [ ] **Centralized Options Definition (SSOT)**:
  - Create `src/core/options.def.ts` to define CLI and GUI options programmatically.
  - Generate CLI flags and GUI forms from this single source of truth to ensure 100% parity.

- [ ] **Strict Node/Browser Split (Tree Shaking)**:
  - Refactor `src/index.ts` to strictly separate Node.js dependencies (like `fs`) from the core logic.
  - Consider creating specific entry points: `kindle-tools-ts/node` vs `kindle-tools-ts/browser` (or `core`) to prevent bundler errors in frontend projects.
