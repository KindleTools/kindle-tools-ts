/**
 * Kindle Tools - Testing GUI
 * Main entry point for the browser-based testing interface
 */

import {
  type Clipping,
  type ClippingType,
  CsvExporter,
  HtmlExporter,
  JsonExporter,
  MarkdownExporter,
  type ParseOptions,
  type ParseResult,
  parseString,
} from "../index.js";

// =============================================================================
// State
// =============================================================================

interface AppState {
  fileContent: string | null;
  fileName: string | null;
  parseResult: ParseResult | null;
}

const state: AppState = {
  fileContent: null,
  fileName: null,
  parseResult: null,
};

// =============================================================================
// DOM Elements
// =============================================================================

const elements = {
  // File upload
  dropzone: document.getElementById("dropzone") as HTMLDivElement,
  fileInput: document.getElementById("file-input") as HTMLInputElement,
  fileInfo: document.getElementById("file-info") as HTMLDivElement,
  parseBtn: document.getElementById("parse-btn") as HTMLButtonElement,

  // Options
  optLanguage: document.getElementById("opt-language") as HTMLSelectElement,
  optRemoveDuplicates: document.getElementById("opt-removeDuplicates") as HTMLInputElement,
  optMergeNotes: document.getElementById("opt-mergeNotes") as HTMLInputElement,
  optMergeOverlapping: document.getElementById("opt-mergeOverlapping") as HTMLInputElement,
  optExtractTags: document.getElementById("opt-extractTags") as HTMLInputElement,
  optNormalizeUnicode: document.getElementById("opt-normalizeUnicode") as HTMLInputElement,
  optCleanContent: document.getElementById("opt-cleanContent") as HTMLInputElement,
  optCleanTitles: document.getElementById("opt-cleanTitles") as HTMLInputElement,
  optExcludeHighlights: document.getElementById("opt-excludeHighlights") as HTMLInputElement,
  optExcludeNotes: document.getElementById("opt-excludeNotes") as HTMLInputElement,
  optExcludeBookmarks: document.getElementById("opt-excludeBookmarks") as HTMLInputElement,
  optMinContentLength: document.getElementById("opt-minContentLength") as HTMLInputElement,

  // Results tabs
  statsContent: document.getElementById("stats-content") as HTMLDivElement,
  clippingsContent: document.getElementById("clippings-content") as HTMLDivElement,
  warningsContent: document.getElementById("warnings-content") as HTMLDivElement,
  rawContent: document.getElementById("raw-content") as HTMLDivElement,

  // Clippings filters
  clippingsSearch: document.getElementById("clippings-search") as HTMLInputElement,
  clippingsFilterType: document.getElementById("clippings-filter-type") as HTMLSelectElement,
  clippingsFilterBook: document.getElementById("clippings-filter-book") as HTMLSelectElement,

  // Export
  exportGroupByBook: document.getElementById("export-groupByBook") as HTMLInputElement,
  exportIncludeStats: document.getElementById("export-includeStats") as HTMLInputElement,
  exportJsonContent: document.getElementById("export-json-content") as HTMLDivElement,
  exportCsvContent: document.getElementById("export-csv-content") as HTMLDivElement,
  exportMdContent: document.getElementById("export-md-content") as HTMLDivElement,
  exportHtmlContent: document.getElementById("export-html-content") as HTMLIFrameElement,
};

// =============================================================================
// File Upload
// =============================================================================

function setupFileUpload(): void {
  const { dropzone, fileInput } = elements;

  // Click to open file picker
  dropzone.addEventListener("click", () => fileInput.click());

  // Drag and drop - need to prevent default on dragenter and dragover
  dropzone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
    const files = e.dataTransfer?.files;
    const firstFile = files?.[0];
    if (firstFile) {
      handleFile(firstFile);
    }
  });

  // File input change
  fileInput.addEventListener("change", () => {
    const files = fileInput.files;
    const firstFile = files?.[0];
    if (firstFile) {
      handleFile(firstFile);
    }
  });
}

async function handleFile(file: File): Promise<void> {
  state.fileName = file.name;
  state.fileContent = await file.text();

  // Show file info
  elements.fileInfo.innerHTML = `
    <div class="file-info-grid">
      <div class="file-info-item">
        <span class="label">File Name</span>
        <span class="value">${escapeHtml(file.name)}</span>
      </div>
      <div class="file-info-item">
        <span class="label">Size</span>
        <span class="value">${formatBytes(file.size)}</span>
      </div>
      <div class="file-info-item">
        <span class="label">Characters</span>
        <span class="value">${state.fileContent.length.toLocaleString()}</span>
      </div>
    </div>
  `;
  elements.fileInfo.classList.remove("hidden");
  elements.parseBtn.disabled = false;
}

// =============================================================================
// Parsing
// =============================================================================

function getParseOptions(): ParseOptions {
  const excludeTypes: ClippingType[] = [];
  if (elements.optExcludeHighlights.checked) excludeTypes.push("highlight");
  if (elements.optExcludeNotes.checked) excludeTypes.push("note");
  if (elements.optExcludeBookmarks.checked) excludeTypes.push("bookmark");

  return {
    language: elements.optLanguage.value as ParseOptions["language"],
    removeDuplicates: elements.optRemoveDuplicates.checked,
    mergeNotes: elements.optMergeNotes.checked,
    mergeOverlapping: elements.optMergeOverlapping.checked,
    extractTags: elements.optExtractTags.checked,
    normalizeUnicode: elements.optNormalizeUnicode.checked,
    cleanContent: elements.optCleanContent.checked,
    cleanTitles: elements.optCleanTitles.checked,
    excludeTypes: excludeTypes.length > 0 ? excludeTypes : undefined,
    minContentLength: parseInt(elements.optMinContentLength.value, 10) || undefined,
  };
}

function parseFile(): void {
  if (!state.fileContent) return;

  const options = getParseOptions();
  const startTime = performance.now();

  try {
    state.parseResult = parseString(state.fileContent, options);
    const parseTime = performance.now() - startTime;

    console.log("Parse result:", state.parseResult);
    console.log(`Parsed in ${parseTime.toFixed(2)}ms`);

    renderStats();
    renderClippings();
    renderWarnings();
    renderRawData();
    renderExports();
    populateBookFilter();
  } catch (error) {
    console.error("Parse error:", error);
    elements.statsContent.innerHTML = `
      <div style="color: var(--error); padding: 20px;">
        <strong>Parse Error:</strong><br>
        ${escapeHtml(error instanceof Error ? error.message : String(error))}
      </div>
    `;
  }
}

// =============================================================================
// Render Functions
// =============================================================================

function renderStats(): void {
  const result = state.parseResult;
  if (!result) return;

  const { stats, meta } = result;

  elements.statsContent.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="value">${stats.total}</div>
        <div class="label">Total</div>
      </div>
      <div class="stat-card highlight">
        <div class="value">${stats.highlights}</div>
        <div class="label">Highlights</div>
      </div>
      <div class="stat-card note">
        <div class="value">${stats.notes}</div>
        <div class="label">Notes</div>
      </div>
      <div class="stat-card bookmark">
        <div class="value">${stats.bookmarks}</div>
        <div class="label">Bookmarks</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.clips}</div>
        <div class="label">Clips</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.uniqueBooks}</div>
        <div class="label">Books</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.uniqueAuthors}</div>
        <div class="label">Authors</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.totalWords.toLocaleString()}</div>
        <div class="label">Words</div>
      </div>
    </div>

    <div class="meta-info">
      <div class="meta-item">
        <span class="label">Language Detected</span>
        <span class="value">${meta.detectedLanguage.toUpperCase()}</span>
      </div>
      <div class="meta-item">
        <span class="label">Parse Time</span>
        <span class="value">${meta.parseTime.toFixed(2)}ms</span>
      </div>
      <div class="meta-item">
        <span class="label">Total Blocks</span>
        <span class="value">${meta.totalBlocks}</span>
      </div>
      <div class="meta-item">
        <span class="label">Parsed Blocks</span>
        <span class="value">${meta.parsedBlocks}</span>
      </div>
      <div class="meta-item">
        <span class="label">File Size</span>
        <span class="value">${formatBytes(meta.fileSize)}</span>
      </div>
      ${
        stats.earliestDate && stats.latestDate
          ? `
      <div class="meta-item">
        <span class="label">Date Range</span>
        <span class="value">${formatDate(stats.earliestDate)} - ${formatDate(stats.latestDate)}</span>
      </div>
      `
          : ""
      }
    </div>

    ${renderQualityStats(result.clippings)}
  `;
}

function renderQualityStats(clippings: Clipping[]): string {
  const suspicious = clippings.filter((c) => c.isSuspiciousHighlight).length;
  const fuzzyDuplicates = clippings.filter((c) => c.possibleDuplicateOf).length;
  const linked = clippings.filter((c) => c.linkedNoteId || c.linkedHighlightId).length;
  const withTags = clippings.filter((c) => c.tags && c.tags.length > 0).length;

  if (suspicious === 0 && fuzzyDuplicates === 0 && linked === 0 && withTags === 0) {
    return "";
  }

  return `
    <h3 style="margin-top: 20px; color: var(--text-secondary); font-size: 0.9rem;">Quality Flags</h3>
    <div class="stats-grid" style="margin-top: 10px;">
      ${
        suspicious > 0
          ? `
        <div class="stat-card">
          <div class="value" style="color: var(--warning)">${suspicious}</div>
          <div class="label">Suspicious</div>
        </div>
      `
          : ""
      }
      ${
        fuzzyDuplicates > 0
          ? `
        <div class="stat-card">
          <div class="value" style="color: var(--warning)">${fuzzyDuplicates}</div>
          <div class="label">Possible Duplicates</div>
        </div>
      `
          : ""
      }
      ${
        linked > 0
          ? `
        <div class="stat-card">
          <div class="value" style="color: var(--success)">${linked}</div>
          <div class="label">Linked Notes</div>
        </div>
      `
          : ""
      }
      ${
        withTags > 0
          ? `
        <div class="stat-card">
          <div class="value" style="color: var(--accent)">${withTags}</div>
          <div class="label">With Tags</div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

function renderClippings(): void {
  const result = state.parseResult;
  if (!result) return;

  renderClippingsTable(result.clippings);
}

function renderClippingsTable(clippings: Clipping[]): void {
  if (clippings.length === 0) {
    elements.clippingsContent.innerHTML = '<div class="placeholder">No clippings found</div>';
    return;
  }

  const rows = clippings
    .map(
      (c) => `
    <tr>
      <td><span class="type-badge ${c.type}">${c.type}</span></td>
      <td title="${escapeHtml(c.title)}">${truncate(c.title, 30)}</td>
      <td title="${escapeHtml(c.author)}">${truncate(c.author, 20)}</td>
      <td>${c.page ?? "-"}</td>
      <td>${c.location.raw}</td>
      <td>
        ${truncate(c.content, 60)}
        ${renderFlags(c)}
      </td>
      <td>${c.date ? formatDate(c.date) : "-"}</td>
    </tr>
  `,
    )
    .join("");

  elements.clippingsContent.innerHTML = `
    <div class="clippings-container">
      <table class="clippings-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Title</th>
            <th>Author</th>
            <th>Page</th>
            <th>Location</th>
            <th>Content</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p style="margin-top: 10px; color: var(--text-secondary); font-size: 0.85rem;">
      Showing ${clippings.length} clippings
    </p>
  `;
}

function renderFlags(c: Clipping): string {
  const flags: string[] = [];

  if (c.isSuspiciousHighlight) {
    flags.push(
      `<span class="flag-badge suspicious" title="${c.suspiciousReason}">suspicious</span>`,
    );
  }
  if (c.possibleDuplicateOf) {
    flags.push(
      `<span class="flag-badge duplicate" title="Similar to ${c.possibleDuplicateOf}">duplicate?</span>`,
    );
  }
  if (c.linkedNoteId || c.linkedHighlightId) {
    flags.push(`<span class="flag-badge linked">linked</span>`);
  }
  if (c.tags && c.tags.length > 0) {
    flags.push(
      `<span class="flag-badge linked" title="${c.tags.join(", ")}">${c.tags.length} tags</span>`,
    );
  }

  return flags.join("");
}

function renderWarnings(): void {
  const result = state.parseResult;
  if (!result) return;

  if (result.warnings.length === 0) {
    elements.warningsContent.innerHTML = `
      <div class="placeholder" style="color: var(--success);">
        No warnings - file parsed cleanly
      </div>
    `;
    return;
  }

  const warnings = result.warnings
    .map(
      (w) => `
    <div class="warning-item">
      <div class="type">${w.type}</div>
      <div class="message">${escapeHtml(w.message)}</div>
      <div class="block-index">Block #${w.blockIndex}</div>
    </div>
  `,
    )
    .join("");

  elements.warningsContent.innerHTML = `
    <div class="warnings-list">${warnings}</div>
    <p style="margin-top: 10px; color: var(--text-secondary);">
      ${result.warnings.length} warning(s) found
    </p>
  `;
}

function renderRawData(): void {
  const result = state.parseResult;
  if (!result) return;

  elements.rawContent.innerHTML = `<pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
}

// =============================================================================
// Export Preview
// =============================================================================

async function renderExports(): Promise<void> {
  const result = state.parseResult;
  if (!result) return;

  const groupByBook = elements.exportGroupByBook.checked;
  const includeStats = elements.exportIncludeStats.checked;

  // JSON Export
  const jsonExporter = new JsonExporter();
  const jsonResult = await jsonExporter.export(result.clippings, { groupByBook, includeStats });
  elements.exportJsonContent.textContent =
    typeof jsonResult.output === "string" ? jsonResult.output : "[Binary output]";
  elements.exportJsonContent.classList.remove("placeholder");

  // CSV Export
  const csvExporter = new CsvExporter();
  const csvResult = await csvExporter.export(result.clippings, {});
  elements.exportCsvContent.textContent =
    typeof csvResult.output === "string" ? csvResult.output : "[Binary output]";
  elements.exportCsvContent.classList.remove("placeholder");

  // Markdown Export
  const mdExporter = new MarkdownExporter();
  const mdResult = await mdExporter.export(result.clippings, { groupByBook: false });
  elements.exportMdContent.textContent =
    typeof mdResult.output === "string" ? mdResult.output : "[Binary output]";
  elements.exportMdContent.classList.remove("placeholder");

  // HTML Export
  const htmlExporter = new HtmlExporter();
  const htmlResult = await htmlExporter.export(result.clippings, { includeStats });
  if (typeof htmlResult.output === "string") {
    const blob = new Blob([htmlResult.output], { type: "text/html" });
    elements.exportHtmlContent.src = URL.createObjectURL(blob);
  }
}

// =============================================================================
// Filtering
// =============================================================================

function populateBookFilter(): void {
  const result = state.parseResult;
  if (!result) return;

  const books = [...new Set(result.clippings.map((c) => c.title))].sort();

  elements.clippingsFilterBook.innerHTML = `
    <option value="">All books (${books.length})</option>
    ${books.map((b) => `<option value="${escapeHtml(b)}">${truncate(b, 40)}</option>`).join("")}
  `;
}

function filterClippings(): void {
  const result = state.parseResult;
  if (!result) return;

  const searchTerm = elements.clippingsSearch.value.toLowerCase();
  const typeFilter = elements.clippingsFilterType.value;
  const bookFilter = elements.clippingsFilterBook.value;

  let filtered = result.clippings;

  if (searchTerm) {
    filtered = filtered.filter(
      (c) =>
        c.content.toLowerCase().includes(searchTerm) ||
        c.title.toLowerCase().includes(searchTerm) ||
        c.author.toLowerCase().includes(searchTerm),
    );
  }

  if (typeFilter) {
    filtered = filtered.filter((c) => c.type === typeFilter);
  }

  if (bookFilter) {
    filtered = filtered.filter((c) => c.title === bookFilter);
  }

  renderClippingsTable(filtered);
}

// =============================================================================
// Tabs
// =============================================================================

function setupTabs(): void {
  document.querySelectorAll(".tabs").forEach((tabContainer) => {
    tabContainer.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.getAttribute("data-tab");
        if (!tabId) return;

        // Update active tab
        for (const t of tabContainer.querySelectorAll(".tab")) {
          t.classList.remove("active");
        }
        tab.classList.add("active");

        // Update active content
        const panel = tabContainer.closest(".panel");
        if (panel) {
          for (const content of panel.querySelectorAll(".tab-content")) {
            content.classList.remove("active");
          }
          const targetContent = panel.querySelector(`#tab-${tabId}`);
          targetContent?.classList.add("active");
        }
      });
    });
  });
}

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, maxLength))}...`;
}

// =============================================================================
// Initialize
// =============================================================================

function init(): void {
  setupFileUpload();
  setupTabs();

  // Parse button
  elements.parseBtn.addEventListener("click", parseFile);

  // Re-parse on option change
  const optionInputs = document.querySelectorAll("#options-section input, #options-section select");
  optionInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (state.parseResult) {
        parseFile();
      }
    });
  });

  // Filtering
  elements.clippingsSearch.addEventListener("input", filterClippings);
  elements.clippingsFilterType.addEventListener("change", filterClippings);
  elements.clippingsFilterBook.addEventListener("change", filterClippings);

  // Export options
  elements.exportGroupByBook.addEventListener("change", renderExports);
  elements.exportIncludeStats.addEventListener("change", renderExports);

  console.log("Kindle Tools Testing GUI initialized");
}

// Start the app
init();
