# KindleToolsTS Roadmap

## 🚀 Template System Improvements

### 1. Obsidian Template (`BOOK_OBSIDIAN`)
The current Obsidian template is good but can be even better by leveraging dynamic Frontmatter data.

- [ ] **Dynamic Tags in Frontmatter**: 
  - Stop hardcoding tags like `kindle` or `book-notes`.
  - Inject actual tags from the clippings into the YAML frontmatter using the `{{yamlTags}}` helper mixed with default tags.
- [ ] **Cover Image Support (Invalid/Future)**: 
  - Prepare the template to support cover images if the metadata becomes available: `![|150]({{coverUrl}})`.

### 2. New Joplin Preset (`BOOK_JOPLIN`)
Currently, Joplin users have to use the `default` preset, which is generic, or `obsidian`, which looks broken in Joplin due to Callout syntax (`> [!quote]`).

- [ ] **Create Dedicated Preset**: Add `joplin` to the `TemplatePreset` type and `getAvailablePresets()`.
- [ ] **Joplin-Optimized Template**:
  - **Frontmatter**: Use Joplin-compatible YAML headers for seamless import (Title, Author, Source, Created Date).
  - **Tags**: Format tags in the YAML frontmatter so Joplin automatically applies them to the note upon import: `tags: {{join tags ", "}}`.
  - **Syntax**: Use standard Markdown blockquotes (`>`) instead of Obsidian Callouts.
  - **Layout**: Clean headers and simple structure for best readability in Joplin's default viewer.

### 3. General Template Maintenance
- [ ] **Standard Markdown (`BOOK_DEFAULT`)**: Ensure it remains "Universal" and compatible with simple editors (Typora, iA Writer, VS Code) without specific plugin requirements.

---

## 🔧 CLI & GUI Parity (Consistency Update)
Ensure the CLI and GUI offer the same set of powerful filtering and configuration options to avoid user confusion.

- [ ] **CLI Updates**:
  - Add `--exclude-types` flag (e.g., `highlight,note`).
  - Add `--min-length` flag to filter short noise.
  - Add `--filter-books` (allowlist) and `--exclude-books` (blocklist) flags.

- [ ] **GUI Updates**:
  - Add **Tag Case** selector (Original / Uppercase / Lowercase) to match CLI capabilities.
  - Add **Exclude Books** text area (for blocklisting books).

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
```
