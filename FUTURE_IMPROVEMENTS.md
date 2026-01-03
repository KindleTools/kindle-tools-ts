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

## Not Planned

These would add significant complexity for limited value:

- **PDF Export**: Would need a PDF rendering library
- **Notion Integration**: Different API model
- **Readwise Sync**: Proprietary API
- **Highlight Colors**: Kindle doesn't export this data
