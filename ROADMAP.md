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
