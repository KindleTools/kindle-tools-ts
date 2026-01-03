# Future Improvements for Kindle Tools GUI

This document outlines potential improvements for the Testing GUI, with detailed implementation notes for each feature.

---

## 1. Pretty Print JSON

**Priority:** High (very easy to implement)

**Description:** Add a checkbox to format JSON output with indentation for better readability.

**Implementation:**

1. **HTML** (`src/gui/index.html`): Add checkbox in export options:
   ```html
   <label><input type="checkbox" id="export-prettyJson"> Pretty print JSON</label>
   ```

2. **TypeScript** (`src/gui/main.ts`):
   - Add element reference:
     ```typescript
     exportPrettyJson: document.getElementById("export-prettyJson") as HTMLInputElement,
     ```
   - Modify `renderExports()`:
     ```typescript
     const pretty = elements.exportPrettyJson.checked;
     const jsonResult = await jsonExporter.export(result.clippings, { groupByBook, includeStats, pretty });
     ```
   - Add change listener in `init()`:
     ```typescript
     elements.exportPrettyJson.addEventListener("change", renderExports);
     ```

3. **Already implemented in:** `src/exporters/json.exporter.ts` line 51:
   ```typescript
   const indent = options?.pretty ? 2 : undefined;
   ```

---

## 2. Sort/Order Clippings

**Priority:** High (very useful feature)

**Description:** Allow users to sort clippings by date, page, book title, author, or content length.

**Implementation:**

1. **HTML** (`src/gui/index.html`): Add sort selector in Results section or Parse Options:
   ```html
   <div class="option-group">
     <h3>Sorting</h3>
     <label>
       Sort by:
       <select id="opt-sortBy">
         <option value="date-asc">Date (oldest first)</option>
         <option value="date-desc">Date (newest first)</option>
         <option value="book">Book title (A-Z)</option>
         <option value="author">Author (A-Z)</option>
         <option value="page">Page number</option>
         <option value="length-desc">Length (longest first)</option>
         <option value="length-asc">Length (shortest first)</option>
         <option value="original">Original order</option>
       </select>
     </label>
   </div>
   ```

2. **TypeScript** (`src/gui/main.ts`):
   - Add sort function:
     ```typescript
     function sortClippings(clippings: Clipping[], sortBy: string): Clipping[] {
       const sorted = [...clippings];
       switch (sortBy) {
         case "date-asc":
           return sorted.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
         case "date-desc":
           return sorted.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
         case "book":
           return sorted.sort((a, b) => a.title.localeCompare(b.title));
         case "author":
           return sorted.sort((a, b) => a.author.localeCompare(b.author));
         case "page":
           return sorted.sort((a, b) => (a.page ?? 0) - (b.page ?? 0));
         case "length-desc":
           return sorted.sort((a, b) => b.content.length - a.content.length);
         case "length-asc":
           return sorted.sort((a, b) => a.content.length - b.content.length);
         default:
           return sorted;
       }
     }
     ```
   - Apply sorting before rendering clippings and exports

3. **Note:** Could also be added to `ParseOptions` in `src/types/config.ts` if we want to sort during parsing.

---

## 3. Include Raw Fields Option

**Priority:** Medium

**Description:** Option to include `titleRaw`, `authorRaw`, `contentRaw` fields in exports for debugging or data preservation.

**Implementation:**

1. **HTML** (`src/gui/index.html`):
   ```html
   <label><input type="checkbox" id="export-includeRaw"> Include raw fields</label>
   ```

2. **TypeScript** (`src/gui/main.ts`):
   ```typescript
   const includeRaw = elements.exportIncludeRaw.checked;
   const jsonResult = await jsonExporter.export(result.clippings, { groupByBook, includeStats, includeRaw });
   ```

3. **Already implemented in:** `src/exporters/json.exporter.ts` lines 69-78:
   ```typescript
   private prepareClippings(clippings: Clipping[], options?: ExporterOptions): Clipping[] {
     if (options?.includeRaw) {
       return clippings;
     }
     // Remove *Raw fields for cleaner output
     return clippings.map((c) => {
       const { titleRaw: _titleRaw, authorRaw: _authorRaw, contentRaw: _contentRaw, ...rest } = c;
       return rest as Clipping;
     });
   }
   ```

4. **Type already exists:** `ExporterOptions.includeRaw` in `src/types/exporter.ts`

---

## 4. Date Range Filter

**Priority:** Medium-High

**Description:** Filter clippings by a date range (from date - to date).

**Implementation:**

1. **HTML** (`src/gui/index.html`): Add date inputs in Filtering section:
   ```html
   <label>
     From date:
     <input type="date" id="opt-dateFrom" style="width: 130px">
   </label>
   <label>
     To date:
     <input type="date" id="opt-dateTo" style="width: 130px">
   </label>
   ```

2. **TypeScript** (`src/gui/main.ts`):
   - Add to `getParseOptions()` or filter post-parse:
     ```typescript
     const dateFrom = elements.optDateFrom.value ? new Date(elements.optDateFrom.value) : undefined;
     const dateTo = elements.optDateTo.value ? new Date(elements.optDateTo.value) : undefined;
     ```
   - Filter function:
     ```typescript
     function filterByDateRange(clippings: Clipping[], from?: Date, to?: Date): Clipping[] {
       return clippings.filter(c => {
         if (!c.date) return true; // Include clippings without date
         if (from && c.date < from) return false;
         if (to && c.date > to) return false;
         return true;
       });
     }
     ```

3. **Alternative:** Add to `ParseOptions` in `src/types/config.ts`:
   ```typescript
   /** Filter clippings from this date */
   dateFrom?: Date;
   /** Filter clippings until this date */
   dateTo?: Date;
   ```
   Then implement in `src/core/processor.ts`.

---

## 5. Similarity Threshold for Fuzzy Duplicates

**Priority:** Low-Medium

**Description:** Allow users to adjust the threshold for detecting similar (fuzzy) duplicates.

**Implementation:**

1. **HTML** (`src/gui/index.html`):
   ```html
   <label>
     Similarity threshold:
     <input type="range" id="opt-similarityThreshold" min="0.5" max="1.0" step="0.05" value="0.85">
     <span id="similarity-value">0.85</span>
   </label>
   ```

2. **TypeScript** (`src/gui/main.ts`):
   - Update range display on change
   - Pass to processing options

3. **Existing constant:** `src/core/constants.ts`:
   ```typescript
   export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;
   ```

4. **Used in:** `src/core/processor.ts` in `flagFuzzyDuplicates()` function

5. **Would need to add to `ParseOptions`:**
   ```typescript
   /** Threshold for fuzzy duplicate detection (0-1). Default: 0.85 */
   similarityThreshold?: number;
   ```

---

## 6. Date Locale Configuration

**Priority:** Low

**Description:** Configure the locale used for parsing dates in clipping files from different regions.

**Implementation:**

1. **HTML** (`src/gui/index.html`):
   ```html
   <label>
     Date locale:
     <select id="opt-dateLocale">
       <option value="">Auto-detect</option>
       <option value="en-US">English (US)</option>
       <option value="en-GB">English (UK)</option>
       <option value="es-ES">Spanish</option>
       <option value="de-DE">German</option>
       <option value="fr-FR">French</option>
       <option value="pt-BR">Portuguese (Brazil)</option>
       <option value="it-IT">Italian</option>
       <option value="ja-JP">Japanese</option>
       <option value="zh-CN">Chinese</option>
     </select>
   </label>
   ```

2. **Already in types:** `ParseOptions.dateLocale` in `src/types/config.ts`:
   ```typescript
   /** Locale for date parsing (e.g., 'en-US', 'es-ES') */
   dateLocale?: string;
   ```

3. **Used in:** `src/utils/dates.ts` for parsing Kindle date formats

---

## 7. Multi-Book Selection Filter

**Priority:** Medium

**Description:** Allow selecting multiple books to include (instead of just one or all).

**Implementation:**

1. **HTML** (`src/gui/index.html`): Replace single select with multi-select or checkboxes:
   ```html
   <select id="opt-bookFilter" multiple style="width: 200px; height: 100px">
     <option value="">All books</option>
     <!-- Populated dynamically -->
   </select>
   ```
   Or use a checkbox list with search.

2. **TypeScript** (`src/gui/main.ts`):
   ```typescript
   const selectedBooks = Array.from(elements.optBookFilter.selectedOptions)
     .map(opt => opt.value)
     .filter(v => v !== "");

   return {
     // ...
     onlyBooks: selectedBooks.length > 0 ? selectedBooks : undefined,
   };
   ```

3. **Already supported:** `ParseOptions.onlyBooks` accepts `string[]`

---

## 8. Export Filename Customization

**Priority:** Low

**Description:** Allow customizing the downloaded filename with patterns like `{date}`, `{book}`, etc.

**Implementation:**

1. **HTML** (`src/gui/index.html`):
   ```html
   <label>
     Filename pattern:
     <input type="text" id="export-filename" value="kindle-clippings" style="width: 200px">
   </label>
   <small>Supports: {date}, {count}, {format}</small>
   ```

2. **TypeScript** (`src/gui/main.ts`):
   ```typescript
   function generateFilename(pattern: string, format: string, count: number): string {
     const date = new Date().toISOString().split('T')[0];
     return pattern
       .replace('{date}', date)
       .replace('{count}', String(count))
       .replace('{format}', format);
   }
   ```

---

## 9. Highlight Color/Category Support

**Priority:** Low (requires Kindle API changes)

**Description:** If Kindle ever exposes highlight colors, support filtering/displaying by color.

**Note:** Currently Kindle's My Clippings.txt does not include highlight color information. This would require:
- Parsing from Kindle's internal database (not My Clippings.txt)
- Or integration with Amazon's Kindle API

**Partial implementation:** Could add a manual tagging system where users assign colors/categories to highlights in the GUI.

---

## 10. Statistics Visualization

**Priority:** Medium

**Description:** Add charts/graphs for reading statistics (highlights per book, reading timeline, etc.).

**Implementation:**

1. **Add a charting library:** Could use Chart.js, D3.js, or simple CSS charts

2. **HTML** (`src/gui/index.html`): Add a "Charts" tab in Results section

3. **Charts to implement:**
   - Bar chart: Highlights per book
   - Timeline: Reading activity over time
   - Pie chart: Distribution by type (highlight/note/bookmark)
   - Word cloud: Most highlighted terms

4. **Data already available in:** `ClippingsStats.booksList` contains per-book statistics

---

## 11. Keyboard Shortcuts

**Priority:** Low

**Description:** Add keyboard shortcuts for common actions.

**Implementation:**

```typescript
document.addEventListener('keydown', (e) => {
  // Ctrl+Enter: Parse file
  if (e.ctrlKey && e.key === 'Enter') {
    if (!elements.parseBtn.disabled) elements.parseBtn.click();
  }
  // Ctrl+S: Download current export
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (!elements.downloadBtn.disabled) downloadExport();
  }
  // Ctrl+1-6: Switch export tabs
  if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
    const tabs = ['json', 'csv', 'md', 'obsidian', 'joplin', 'html'];
    const tab = tabs[parseInt(e.key) - 1];
    document.querySelector(`[data-tab="export-${tab}"]`)?.click();
  }
});
```

---

## 12. Geo-Location Support in GUI

**Priority:** Low

**Description:** Allow adding geographic location metadata to clippings.

**Implementation:**

1. **HTML** (`src/gui/index.html`):
   ```html
   <div class="option-group">
     <h3>Location</h3>
     <label>
       <input type="checkbox" id="opt-useLocation"> Add location
     </label>
     <label>
       Latitude:
       <input type="number" id="opt-latitude" step="0.0001" style="width: 100px">
     </label>
     <label>
       Longitude:
       <input type="number" id="opt-longitude" step="0.0001" style="width: 100px">
     </label>
     <button id="btn-detectLocation" class="btn btn-secondary">Detect</button>
   </div>
   ```

2. **TypeScript** (`src/gui/main.ts`):
   ```typescript
   // Detect location using browser API
   async function detectLocation(): Promise<void> {
     if (!navigator.geolocation) return;
     navigator.geolocation.getCurrentPosition((pos) => {
       elements.optLatitude.value = pos.coords.latitude.toString();
       elements.optLongitude.value = pos.coords.longitude.toString();
     });
   }
   ```

3. **Already in types:** `ParseOptions.geoLocation` in `src/types/config.ts`

4. **Utilities exist:** `src/utils/geo-location.ts` has `formatGeoLocation`, `toGoogleMapsUrl`, etc.

---

## 13. Import/Export Settings

**Priority:** Low

**Description:** Save and load GUI settings (all checkboxes, options) as a JSON file.

**Implementation:**

```typescript
function exportSettings(): void {
  const settings = {
    language: elements.optLanguage.value,
    removeDuplicates: elements.optRemoveDuplicates.checked,
    mergeNotes: elements.optMergeNotes.checked,
    // ... all other options
  };
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  // Download blob
}

function importSettings(file: File): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const settings = JSON.parse(e.target?.result as string);
    // Apply all settings to form elements
  };
  reader.readAsText(file);
}
```

---

## 14. Dark/Light Theme Toggle

**Priority:** Low

**Description:** Allow switching between dark and light themes.

**Implementation:**

1. **CSS** (`src/gui/styles.css`): Add light theme variables:
   ```css
   [data-theme="light"] {
     --bg-primary: #f5f5f5;
     --bg-secondary: #ffffff;
     --bg-tertiary: #e0e0e0;
     --text-primary: #1a1a1a;
     --text-secondary: #666666;
     /* ... etc */
   }
   ```

2. **HTML**: Add toggle button in header

3. **TypeScript**: Toggle `data-theme` attribute on `<html>` element and save preference to localStorage

---

## 15. Batch Processing Multiple Files

**Priority:** Medium

**Description:** Allow uploading multiple My Clippings.txt files and merge them.

**Implementation:**

1. **HTML**: Change file input to accept multiple:
   ```html
   <input type="file" id="file-input" accept=".txt" multiple hidden>
   ```

2. **TypeScript** (`src/gui/main.ts`):
   ```typescript
   async function handleFiles(files: FileList): Promise<void> {
     const contents: string[] = [];
     for (const file of files) {
       contents.push(await file.text());
     }
     // Concatenate or merge clippings from all files
     state.fileContent = contents.join('\n==========\n');
   }
   ```

3. **Note:** Would need deduplication across files (already handled by `removeDuplicates`)

---

## 16. Real-time Preview While Typing Options

**Priority:** Low

**Description:** Auto-refresh preview as options change (with debounce).

**Already partially implemented:** Options trigger re-parse on change. Could add:
- Debouncing for rapid changes
- Loading indicator during parse
- Disable auto-refresh for large files (add manual refresh button)

---

## 17. Copy to Clipboard Buttons

**Priority:** Medium (quick win)

**Description:** Add "Copy" button next to each export preview.

**Implementation:**

1. **HTML**: Add button next to each export content div

2. **TypeScript**:
   ```typescript
   async function copyToClipboard(format: string): Promise<void> {
     const content = exportResults[format]?.content;
     if (content) {
       await navigator.clipboard.writeText(content);
       // Show toast notification
     }
   }
   ```

---

## 18. Search Within Export Preview

**Priority:** Low

**Description:** Add Ctrl+F style search within the export preview panes.

**Implementation:** Could use a simple text highlight approach:
```typescript
function highlightSearchTerm(container: HTMLElement, term: string): void {
  const text = container.textContent || '';
  const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
  container.innerHTML = escapeHtml(text).replace(regex, '<mark>$1</mark>');
}
```

---

## 19. Responsive Mobile Layout

**Priority:** Low-Medium

**Description:** Improve GUI layout for mobile/tablet devices.

**Implementation:** Add CSS media queries:
```css
@media (max-width: 768px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
  .tabs {
    flex-wrap: wrap;
  }
  .clippings-table {
    font-size: 0.8rem;
  }
  /* ... etc */
}
```

---

## 20. Progressive Web App (PWA) Support

**Priority:** Low

**Description:** Make the GUI installable as a PWA for offline use.

**Implementation:**

1. Add `manifest.json` with app metadata
2. Add service worker for caching
3. Add install prompt handling

**Benefits:** Works offline, can be "installed" on desktop/mobile

---

## Implementation Priority Summary

| Priority | Features |
|----------|----------|
| **High** | Pretty Print JSON, Sort Clippings, Copy to Clipboard |
| **Medium** | Date Range Filter, Multi-Book Selection, Statistics Charts, Batch Processing |
| **Low** | Include Raw Fields, Similarity Threshold, Date Locale, Filename Customization, Keyboard Shortcuts, Geo-Location, Settings Import/Export, Theme Toggle, PWA |

---

## Notes for Future Development

1. **All `ParseOptions` are defined in:** `src/types/config.ts`
2. **All `ExporterOptions` are defined in:** `src/types/exporter.ts`
3. **GUI state is managed in:** `src/gui/main.ts` (simple object, no framework)
4. **Exporters are in:** `src/exporters/*.exporter.ts`
5. **Processing logic is in:** `src/core/processor.ts`
6. **The GUI uses Vite for dev server:** `pnpm gui` to start

When implementing new features:
1. Check if the option already exists in types
2. Add HTML element
3. Add element reference in `elements` object
4. Use in `getParseOptions()` or `renderExports()`
5. Add event listener in `init()` if needed
