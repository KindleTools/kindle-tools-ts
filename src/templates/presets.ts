/**
 * Pre-defined Markdown templates for common use cases.
 *
 * Users can use these as starting points for customization.
 *
 * @packageDocumentation
 */

// ============================================================================
// Clipping Templates
// ============================================================================

/**
 * Default clipping template - clean and readable.
 */
export const CLIPPING_DEFAULT = `{{#if (eq type "highlight")}}
> {{content}}
> — Page {{page}}, Location {{location}}
{{#if hasNote}}

**Note:** {{note}}
{{/if}}
{{#if hasTags}}
**Tags:** {{tagsHashtags}}
{{/if}}
{{else if (eq type "note")}}
**Note (Location {{location}}):**
{{content}}
{{else if (eq type "bookmark")}}
**Bookmark** at Location {{location}}{{#if (neq page "?")}} (Page {{page}}){{/if}}
{{/if}}
`;

/**
 * Minimal clipping template - just the essentials.
 */
export const CLIPPING_MINIMAL = `{{#isHighlight}}
> {{content}}
{{/isHighlight}}
{{#isNote}}
- {{content}}
{{/isNote}}
`;

/**
 * Academic/Citation style template.
 */
export const CLIPPING_ACADEMIC = `{{#isHighlight}}
"{{content}}" ({{author}}, *{{title}}*, p. {{page}})
{{#if hasNote}}
  → {{note}}
{{/if}}
{{/isHighlight}}
{{#isNote}}
[Note at {{location}}]: {{content}}
{{/isNote}}
`;

/**
 * Compact template for lists.
 */
export const CLIPPING_COMPACT = `- {{content}}{{#if hasNote}} *({{note}})*{{/if}} [p.{{page}}]
`;

/**
 * Verbose template with all metadata.
 */
export const CLIPPING_VERBOSE = `### {{type}} at Location {{location}}

**Book:** {{title}}
**Author:** {{author}}
**Page:** {{page}}
**Date:** {{date}}
**Source:** {{source}}
{{#if hasTags}}
**Tags:** {{tagsString}}
{{/if}}

{{#isHighlight}}
> {{content}}
{{#if hasNote}}

---
**My thoughts:** {{note}}
{{/if}}
{{/isHighlight}}

{{#isNote}}
{{content}}
{{/isNote}}

---

`;

// ============================================================================
// Book Templates
// ============================================================================

/**
 * Default book template - structured with sections.
 */
export const BOOK_DEFAULT = `# {{title}}

*by {{author}}*

---

**Summary:**
- Highlights: {{highlightCount}}
- Notes: {{noteCount}}
- Bookmarks: {{bookmarkCount}}

---

{{#each clippings}}
{{> clipping this}}

{{/each}}
`;

/**
 * Obsidian-optimized book template with YAML frontmatter.
 */
export const BOOK_OBSIDIAN = `---
title: "{{title}}"
author: "{{author}}"
type: book
source: kindle
highlights: {{highlightCount}}
notes: {{noteCount}}
date_exported: {{exportDateIso}}
tags:
{{#each tags}}
  - {{this}}
{{/each}}
---

# {{title}}

**Author:** [[{{author}}]]

## Statistics
| Metric | Count |
|--------|-------|
| Highlights | {{highlightCount}} |
| Notes | {{noteCount}} |
| Bookmarks | {{bookmarkCount}} |

---

## Highlights

{{#each highlights}}
> [!quote] Page {{page}}, Location {{location}}
> {{content}}
{{#if hasNote}}

> [!note] My Note
> {{note}}
{{/if}}

{{/each}}

{{#if (gt notes.length 0)}}
## Standalone Notes

{{#each notes}}
> [!info] Location {{location}}
> {{content}}

{{/each}}
{{/if}}
`;

/**
 * Joplin-optimized book template.
 * Uses simplified structure and standard Markdown for compatibility.
 */
export const BOOK_JOPLIN = `---
title: "{{title}}"
author: "{{author}}"
source: kindle
created: {{exportDateIso}}
tags: {{join tags ", "}}
---

# {{title}}

*by {{author}}*

**Summary:** {{highlightCount}} highlights, {{noteCount}} notes

---

## Highlights

{{#each highlights}}
> {{content}}
> — *Page {{page}} | Location {{location}}*

{{#if hasNote}}
**Note:** {{note}}
{{/if}}

{{/each}}

{{#if (gt notes.length 0)}}
## Notes

{{#each notes}}
- {{content}} *(Location {{location}})*
{{/each}}
{{/if}}
`;

/**
 * Notion-style book template with databases in mind.
 */
export const BOOK_NOTION = `# 📚 {{title}}

| Property | Value |
|----------|-------|
| Author | {{author}} |
| Highlights | {{highlightCount}} |
| Notes | {{noteCount}} |
| Exported | {{exportDate}} |

---

## Key Highlights

{{#each highlights}}
### Highlight {{@index}}
> {{content}}

📍 Page {{page}} | Location {{location}}
{{#if hasNote}}
💡 **Note:** {{note}}
{{/if}}
{{#if hasTags}}
🏷️ {{tagsString}}
{{/if}}

---

{{/each}}

{{#if (gt notes.length 0)}}
## Personal Notes

{{#each notes}}
- **[{{location}}]** {{content}}
{{/each}}
{{/if}}
`;

/**
 * Minimal book template.
 */
export const BOOK_MINIMAL = `# {{title}}
*{{author}}*

{{#each highlights}}
> {{content}}

{{/each}}
`;

/**
 * Academic/Study book template.
 */
export const BOOK_ACADEMIC = `# {{title}}

**Author:** {{author}}
**Total Annotations:** {{totalClippings}}
**Date Compiled:** {{exportDate}}

---

## Summary & Key Takeaways

*[Add your summary here]*

---

## Annotated Passages

{{#each highlights}}
### Passage {{add @index 1}}

> {{content}}

**Location:** Page {{page}}, Kindle Location {{location}}

{{#if hasNote}}
**Analysis/Notes:**
{{note}}
{{/if}}

{{#if hasTags}}
**Keywords:** {{tagsString}}
{{/if}}

---

{{/each}}

## Study Notes

{{#each notes}}
- {{content}} *(Location {{location}})*
{{/each}}

---

## References

{{author}}. *{{title}}.* [Kindle Edition].
`;

// ============================================================================
// Export Templates
// ============================================================================

/**
 * Default export template - all books in one file.
 */
export const EXPORT_DEFAULT = `# Kindle Highlights

*{{totalClippings}} clippings from {{bookCount}} books*
*Exported on {{exportDate}}*

---

{{#each books}}
## {{title}}
*{{author}}*

{{#each clippings}}
{{> clipping this}}

{{/each}}
---

{{/each}}
`;

/**
 * Summary export template - statistics focus.
 */
export const EXPORT_SUMMARY = `# 📖 Reading Highlights Summary

**Export Date:** {{exportDate}}

## 📊 Overview

| Metric | Count |
|--------|-------|
| Total Books | {{bookCount}} |
| Total Highlights | {{totalHighlights}} |
| Total Notes | {{totalNotes}} |
| Total Bookmarks | {{totalBookmarks}} |

---

## 📚 Books

{{#each books}}
### {{add @index 1}}. {{title}}
*by {{author}}*

- Highlights: {{highlightCount}}
- Notes: {{noteCount}}
- Top quote: "{{truncate highlights.0.content 100}}"

{{/each}}
`;

/**
 * Index/Table of Contents export template.
 */
export const EXPORT_INDEX = `# Kindle Library Index

*{{bookCount}} books with {{totalClippings}} annotations*

---

## Books List

{{#each books}}
{{add @index 1}}. **{{title}}** — {{author}} ({{highlightCount}} highlights, {{noteCount}} notes)
{{/each}}

---

*Exported: {{exportDate}}*
`;

// ============================================================================
// Template Presets (Named Collections)
// ============================================================================

// Re-export types from centralized location
// Import for local usage
// Import for local usage
import type { TemplatePreset as PresetType, TemplateCollection } from "./types.js";

// Re-export for consumers
export type { TemplateCollection, TemplatePreset } from "./types.js";

/**
 * Get a complete template collection by preset name.
 */
export function getTemplatePreset(preset: PresetType): TemplateCollection {
  switch (preset) {
    case "minimal":
      return {
        clipping: CLIPPING_MINIMAL,
        book: BOOK_MINIMAL,
        export: EXPORT_DEFAULT,
      };
    case "obsidian":
      return {
        clipping: CLIPPING_DEFAULT,
        book: BOOK_OBSIDIAN,
        export: EXPORT_DEFAULT,
      };
    case "joplin":
      return {
        clipping: CLIPPING_DEFAULT,
        book: BOOK_JOPLIN,
        export: EXPORT_DEFAULT,
      };
    case "notion":
      return {
        clipping: CLIPPING_DEFAULT,
        book: BOOK_NOTION,
        export: EXPORT_DEFAULT,
      };
    case "academic":
      return {
        clipping: CLIPPING_ACADEMIC,
        book: BOOK_ACADEMIC,
        export: EXPORT_SUMMARY,
      };
    case "compact":
      return {
        clipping: CLIPPING_COMPACT,
        book: BOOK_MINIMAL,
        export: EXPORT_INDEX,
      };
    case "verbose":
      return {
        clipping: CLIPPING_VERBOSE,
        book: BOOK_DEFAULT,
        export: EXPORT_DEFAULT,
      };
    default:
      return {
        clipping: CLIPPING_DEFAULT,
        book: BOOK_DEFAULT,
        export: EXPORT_DEFAULT,
      };
  }
}

/**
 * List all available preset names.
 */
export function getAvailablePresets(): PresetType[] {
  return ["default", "minimal", "obsidian", "joplin", "notion", "academic", "compact", "verbose"];
}
