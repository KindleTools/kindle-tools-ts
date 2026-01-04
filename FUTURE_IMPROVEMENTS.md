# Future Improvements

Ideas for future development. None of these are planned - they're possibilities if needed.

---

## Core Features

### Merged Output Mode
Option to output only processed highlights with their associated notes embedded, rather than separate entries for highlights, notes, and bookmarks. Useful when you want a clean "what I highlighted and thought" view.

```typescript
// Instead of separate entries:
{ type: "highlight", content: "Important quote" }
{ type: "note", content: "#review this is key" }

// Get merged output:
{ type: "highlight", content: "Important quote", note: "this is key", tags: ["review"] }
```

### Config File
Support for `.kindletoolsrc` to avoid passing CLI arguments repeatedly:

```json
{
  "language": "auto",
  "format": "obsidian",
  "structure": "by-author",
  "extractTags": true
}
```

### "New Only" Filter
Track previously imported clippings to only process new ones.

---

## Export Enhancements

### ZIP Export for Obsidian
Bundle all generated markdown files into a single ZIP.

### Custom Templates
User-defined templates for Markdown output:

```
{{title}} by {{author}}
> {{content}}
Location: {{location}} | Tags: {{tags}}
```

---

## Integrations

### Direct Joplin Sync
Use Joplin's Web Clipper API (localhost:41184) to sync directly without importing JEX files.

---

## GUI Improvements

### High Priority
- **Sort/Order Clippings**: By date, page, book, author, or length
- **Copy to Clipboard**: Button next to each export preview
- **Date Range Filter**: From/to date inputs

### Medium Priority
- **Multi-Book Selection**: Select multiple books to filter
- **Statistics Charts**: Visual reading analytics
- **Batch Processing**: Upload multiple clippings files

### Low Priority
- **Similarity Threshold Slider**: Adjust fuzzy duplicate detection
- **Dark/Light Theme Toggle**
- **Keyboard Shortcuts**
- **PWA Support**: Installable, offline-capable

---


## High-Value Features (Proposed)

### Notion Integration
Direct export to Notion databases using the official API. Transforms the tool into a productivity hub by syncing highlights to a structured database.

### Visual Enrichment
Fetch high-quality book covers via the Google Books API. This would enhance HTML and Markdown exports, making the visual experience comparable to premium services like Readwise.

### Interactive CLI Mode
A guided, interactive experience using prompts for users who don't want to memorize CLI flags:
- Auto-detection of `My Clippings.txt`
- Interactive format selection menu
- Visual progress bars

### Anki Export
Support for CSV or `.apkg` export for flashcards. Ideal for language learners and students using Kindle for active study to create flashcards from highlights.

---

## Not Planned

These would add significant complexity for limited value:

- **PDF Export**: Would need a PDF rendering library
- **Readwise Sync**: Proprietary API
- **Highlight Colors**: Kindle doesn't export this data
