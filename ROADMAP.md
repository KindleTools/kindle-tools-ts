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
  - **Tags**: Format tags in the YAML frontmatter so Joplin automatically applies them to the note upon import: `tags: [kindle, {{join tags ", "}}]`.
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
