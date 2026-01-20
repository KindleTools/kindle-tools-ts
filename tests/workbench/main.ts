/**
 * Kindle Tools - Testing GUI
 * Main entry point for the browser-based testing interface
 */

import type { Clipping, ClippingType } from "#app-types/clipping.js";
import type { ParseOptions, ParseResult } from "#app-types/config.js";
import type { SupportedLanguage } from "#app-types/language.js";
import { processClippings } from "#core/processor.js";
import * as StatUtils from "#domain/analytics/stats.js";
import { type ExportResult, type ExportSuccess, formatUserMessage } from "#errors";
import {
  type AuthorCase,
  CsvExporter,
  type ExportedFile,
  type FolderStructure,
  HtmlExporter,
  JoplinExporter,
  JsonExporter,
  MarkdownExporter,
  ObsidianExporter,
  type TagCase,
} from "#exporters/index.js";
import { CsvImporter, type Importer, JsonImporter, TxtImporter } from "#importers/index.js";
import type { TemplatePreset } from "#templates/types.js";
import type { TarEntry } from "#utils/fs/tar.js";
import * as TarUtils from "#utils/fs/tar.js";
import type { ZipEntry } from "#utils/fs/zip.js";
import * as ZipUtils from "#utils/fs/zip.js";
import * as GeoUtils from "#utils/geo/index.js";
import * as DateUtils from "#utils/system/dates.js";
import * as TextUtils from "#utils/text/normalizers.js";

const UTILS = {
  ...DateUtils,
  ...GeoUtils,
  ...TextUtils,
  ...StatUtils,
  ...TarUtils,
  ...ZipUtils,
};

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
  optTagCase: document.getElementById("opt-tagCase") as HTMLSelectElement,
  optHighlightsOnly: document.getElementById("opt-highlightsOnly") as HTMLInputElement,
  optMergedOutput: document.getElementById("opt-mergedOutput") as HTMLInputElement,
  optRemoveUnlinkedNotes: document.getElementById("opt-removeUnlinkedNotes") as HTMLInputElement,
  optNormalizeUnicode: document.getElementById("opt-normalizeUnicode") as HTMLInputElement,
  optCleanContent: document.getElementById("opt-cleanContent") as HTMLInputElement,
  optCleanTitles: document.getElementById("opt-cleanTitles") as HTMLInputElement,
  optExcludeHighlights: document.getElementById("opt-excludeHighlights") as HTMLInputElement,
  optExcludeNotes: document.getElementById("opt-excludeNotes") as HTMLInputElement,
  optExcludeBookmarks: document.getElementById("opt-excludeBookmarks") as HTMLInputElement,
  optMinContentLength: document.getElementById("opt-minContentLength") as HTMLInputElement,
  optExcludeBooks: document.getElementById("opt-excludeBooks") as HTMLTextAreaElement,
  optStrict: document.getElementById("opt-strict") as HTMLInputElement,
  optDateLocale: document.getElementById("opt-dateLocale") as HTMLSelectElement,

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
  exportTitle: document.getElementById("export-title") as HTMLInputElement,
  exportCreator: document.getElementById("export-creator") as HTMLInputElement,
  exportGroupByBook: document.getElementById("export-groupByBook") as HTMLInputElement,
  exportIncludeStats: document.getElementById("export-includeStats") as HTMLInputElement,
  exportIncludeClippingTags: document.getElementById(
    "export-includeClippingTags",
  ) as HTMLInputElement,
  exportIncludeRaw: document.getElementById("export-includeRaw") as HTMLInputElement,
  exportPretty: document.getElementById("export-pretty") as HTMLInputElement,
  exportFolderStructure: document.getElementById("export-folderStructure") as HTMLSelectElement,
  exportAuthorCase: document.getElementById("export-authorCase") as HTMLSelectElement,
  exportTemplatePreset: document.getElementById("export-templatePreset") as HTMLSelectElement,
  exportJsonContent: document.getElementById("export-json-content") as HTMLDivElement,
  exportCsvContent: document.getElementById("export-csv-content") as HTMLDivElement,
  exportMdContent: document.getElementById("export-md-content") as HTMLDivElement,
  exportObsidianContent: document.getElementById("export-obsidian-content") as HTMLDivElement,
  exportJoplinContent: document.getElementById("export-joplin-content") as HTMLDivElement,
  exportHtmlContent: document.getElementById("export-html-content") as HTMLIFrameElement,
  downloadBtn: document.getElementById("download-btn") as HTMLButtonElement,

  // Book filter
  optBookFilter: document.getElementById("opt-bookFilter") as HTMLSelectElement,

  // Tab counts
  clippingsCount: document.getElementById("clippings-count") as HTMLSpanElement,
  warningsCount: document.getElementById("warnings-count") as HTMLSpanElement,

  // Clear button
  clearBtn: document.getElementById("clear-btn") as HTMLButtonElement,
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

  const bookFilter = elements.optBookFilter.value;

  // Parse excludeBooks textarea (one book per line)
  const excludeBooksText = elements.optExcludeBooks.value.trim();
  const excludeBooks = excludeBooksText
    ? excludeBooksText
        .split("\n")
        .map((b) => b.trim())
        .filter((b) => b.length > 0)
    : undefined;

  const dateLocale = elements.optDateLocale.value || undefined;

  return {
    language: elements.optLanguage.value as ParseOptions["language"],
    removeDuplicates: elements.optRemoveDuplicates.checked,
    mergeNotes: elements.optMergeNotes.checked,
    mergeOverlapping: elements.optMergeOverlapping.checked,
    extractTags: elements.optExtractTags.checked,
    tagCase: elements.optExtractTags.checked
      ? (elements.optTagCase.value as TagCase)
      : (undefined as unknown as TagCase),
    highlightsOnly: elements.optHighlightsOnly.checked,
    mergedOutput: elements.optMergedOutput.checked,
    removeUnlinkedNotes: elements.optRemoveUnlinkedNotes.checked,
    normalizeUnicode: elements.optNormalizeUnicode.checked,
    cleanContent: elements.optCleanContent.checked,
    cleanTitles: elements.optCleanTitles.checked,
    excludeTypes: excludeTypes.length > 0 ? excludeTypes : undefined,
    minContentLength: parseInt(elements.optMinContentLength.value, 10) || undefined,
    onlyBooks: bookFilter ? [bookFilter] : undefined,
    excludeBooks,
    dateLocale,
    strict: elements.optStrict.checked,
  };
}

/**
 * Detect input file format from filename.
 */
function detectInputFormat(fileName: string): "txt" | "json" | "csv" {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  switch (ext) {
    case "json":
      return "json";
    case "csv":
      return "csv";
    default:
      return "txt";
  }
}

async function parseFile(): Promise<void> {
  if (!state.fileContent || !state.fileName) return;

  // Show loading state
  const originalText = elements.parseBtn.textContent;
  elements.parseBtn.textContent = "Parsing...";
  elements.parseBtn.disabled = true;

  const inputFormat = detectInputFormat(state.fileName);
  const startTime = performance.now();

  try {
    // Unified pipeline: Importer -> Processor -> Display
    let importer: Importer;
    if (inputFormat === "json") importer = new JsonImporter();
    else if (inputFormat === "csv") importer = new CsvImporter();
    else importer = new TxtImporter();

    // 1. Import phase (raw parsing)
    const result = await importer.import(state.fileContent);

    if (result.isErr()) {
      throw result.error;
    }

    const importResult = result.value;

    // 2. Processing phase (clean, dedup, link, filter)
    const uiOptions = getParseOptions();

    // Use detected language from importer if available, otherwise default
    const detectedLanguage = (importResult.meta?.detectedLanguage as SupportedLanguage) || "en";

    const processResult = processClippings(importResult.clippings, {
      ...uiOptions,
      detectedLanguage,
    });

    // 3. Stats calculation
    const stats = UTILS.calculateStats(processResult.clippings);

    // Augment based on processing results
    stats.duplicatesRemoved = processResult.duplicatesRemoved;
    stats.mergedHighlights = processResult.mergedHighlights;
    stats.linkedNotes = processResult.linkedNotes;
    stats.emptyRemoved = processResult.emptyRemoved;

    const parseTime = performance.now() - startTime;

    state.parseResult = {
      clippings: processResult.clippings,
      stats,
      warnings: importResult.warnings.map((msg: string, idx: number) => ({
        type: "unknown_format" as const,
        message: msg,
        blockIndex: idx,
      })),
      meta: {
        fileSize: state.fileContent.length,
        parseTime,
        detectedLanguage: detectedLanguage,
        totalBlocks:
          importResult.clippings.length +
          processResult.duplicatesRemoved +
          processResult.emptyRemoved,
        parsedBlocks: importResult.clippings.length,
      },
    };

    console.log("Parse result:", state.parseResult);
    console.log(`Parsed in ${parseTime.toFixed(2)}ms`);

    renderStats();
    renderClippings();
    renderWarnings();
    renderRawData();
    renderExports();
    populateBookFilter();
    updateTabCounts();
    elements.clearBtn.disabled = false;
  } catch (error) {
    console.error("Parse error:", error);

    // Handle typed ImportError
    const importError = error as {
      code?: string;
      message?: string;
      details?: unknown[];
      warnings?: string[];
    };

    let errorHtml = `<div style="color: var(--error); padding: 20px;">`;

    if (importError.code) {
      // Typed error from neverthrow Result
      errorHtml += `<strong>Import Error [${escapeHtml(importError.code)}]</strong><br>`;
      errorHtml += `<p>${escapeHtml(importError.message || "Unknown error")}</p>`;

      // Show validation details if present (e.g., Zod errors)
      if (importError.details && Array.isArray(importError.details)) {
        errorHtml += `<details style="margin-top: 10px;"><summary>Validation Details (${importError.details.length} issues)</summary><ul>`;
        for (const detail of importError.details as { path?: unknown[]; message?: string }[]) {
          const path = detail.path?.join(".") || "root";
          errorHtml += `<li><code>${escapeHtml(path)}</code>: ${escapeHtml(detail.message || "Invalid")}</li>`;
        }
        errorHtml += `</ul></details>`;
      }

      // Show warnings if present
      if (importError.warnings && importError.warnings.length > 0) {
        errorHtml += `<details style="margin-top: 10px;"><summary>Warnings (${importError.warnings.length})</summary><ul>`;
        for (const warning of importError.warnings) {
          errorHtml += `<li>${escapeHtml(warning)}</li>`;
        }
        errorHtml += `</ul></details>`;
      }
    } else {
      // Generic Error fallback
      errorHtml += `<strong>Parse Error:</strong><br>`;
      errorHtml += escapeHtml(error instanceof Error ? error.message : String(error));
    }

    errorHtml += `</div>`;
    elements.statsContent.innerHTML = errorHtml;
  } finally {
    // Restore button state
    elements.parseBtn.textContent = originalText ?? "Parse File";
    elements.parseBtn.disabled = false;
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
        <div class="value">${stats.totalHighlights}</div>
        <div class="label">Highlights</div>
      </div>
      <div class="stat-card note">
        <div class="value">${stats.totalNotes}</div>
        <div class="label">Notes</div>
      </div>
      <div class="stat-card bookmark">
        <div class="value">${stats.totalBookmarks}</div>
        <div class="label">Bookmarks</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.totalClips}</div>
        <div class="label">Clips</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.totalBooks}</div>
        <div class="label">Books</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.totalAuthors}</div>
        <div class="label">Authors</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.totalWords.toLocaleString()}</div>
        <div class="label">Words</div>
      </div>
    </div>

    <div class="meta-info-container">
      <h3>Metadata</h3>
      <div class="meta-info-grid">
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
          stats.dateRange.earliest && stats.dateRange.latest
            ? `
        <div class="meta-item">
          <span class="label">Date Range</span>
          <span class="value">${formatDate(stats.dateRange.earliest)} - ${formatDate(stats.dateRange.latest)}</span>
        </div>
        `
            : ""
        }
      </div>
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

  elements.rawContent.innerHTML = `<div class="raw-data-container"><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></div>`;
}

// =============================================================================
// Export Preview
// =============================================================================

// Store export results for download
const exportResults: Record<
  string,
  { content: string | Uint8Array; extension: string; mimeType: string }
> = {};

/**
 * Helper to safely extract success data from ExportResult.
 * Returns null and logs error if export failed.
 */
function unwrapExport(result: ExportResult, exporterName: string): ExportSuccess | null {
  if (result.isErr()) {
    console.error(`${exporterName} export error:`, formatUserMessage(result.error));
    return null;
  }
  return result.value;
}

async function renderExports(): Promise<void> {
  const result = state.parseResult;
  if (!result) return;

  const groupByBook = elements.exportGroupByBook.checked;
  const includeStats = elements.exportIncludeStats.checked;
  const includeClippingTags = elements.exportIncludeClippingTags.checked;
  const includeRaw = elements.exportIncludeRaw.checked;
  const pretty = elements.exportPretty.checked;
  const folderStructure = elements.exportFolderStructure.value as FolderStructure;
  const authorCase = elements.exportAuthorCase.value as AuthorCase;
  const templatePreset = elements.exportTemplatePreset.value as TemplatePreset;
  const title = elements.exportTitle.value.trim() || undefined;
  const creator = elements.exportCreator.value.trim() || undefined;

  // JSON Export
  const jsonExporter = new JsonExporter();
  const jsonResultRaw = await jsonExporter.export(result.clippings, {
    groupByBook,
    includeStats,
    includeClippingTags,
    includeRaw,
    pretty,
  });
  const jsonData = unwrapExport(jsonResultRaw, "JSON");
  if (jsonData) {
    const jsonContent = typeof jsonData.output === "string" ? jsonData.output : "[Binary output]";
    elements.exportJsonContent.textContent = jsonContent;
    elements.exportJsonContent.classList.remove("placeholder");
    exportResults.json = { content: jsonContent, extension: ".json", mimeType: "application/json" };
  }

  // CSV Export
  const csvExporter = new CsvExporter();
  const csvResultRaw = await csvExporter.export(result.clippings, {
    includeClippingTags,
    includeRaw,
  });
  const csvData = unwrapExport(csvResultRaw, "CSV");
  if (csvData) {
    const csvContent = typeof csvData.output === "string" ? csvData.output : "[Binary output]";
    elements.exportCsvContent.textContent = csvContent;
    elements.exportCsvContent.classList.remove("placeholder");
    exportResults.csv = { content: csvContent, extension: ".csv", mimeType: "text/csv" };
  }

  // Markdown Export
  const mdExporter = new MarkdownExporter();
  const mdResultRaw = await mdExporter.export(result.clippings, { groupByBook, templatePreset });
  const mdData = unwrapExport(mdResultRaw, "Markdown");

  if (mdData) {
    if (mdData.files && mdData.files.length > 0) {
      const mdContent = typeof mdData.output === "string" ? mdData.output : "[Binary output]";
      elements.exportMdContent.textContent = mdContent;
      elements.exportMdContent.classList.remove("placeholder");

      try {
        const entries: ZipEntry[] = mdData.files.map((f: ExportedFile) => ({
          name: f.path,
          content: f.content,
          date: new Date(),
        }));

        const zipData = await UTILS.createZipArchive(entries);

        exportResults.md = {
          content: zipData,
          extension: ".zip",
          mimeType: "application/zip",
        };
      } catch (err) {
        console.error("ZIP generation error for MD:", err);
        exportResults.md = {
          content: mdContent,
          extension: ".md",
          mimeType: "text/markdown",
        };
      }
    } else {
      const mdContent = typeof mdData.output === "string" ? mdData.output : "[Binary output]";
      elements.exportMdContent.textContent = mdContent;
      elements.exportMdContent.classList.remove("placeholder");
      exportResults.md = { content: mdContent, extension: ".md", mimeType: "text/markdown" };
    }
  }

  // Obsidian Export
  const obsidianExporter = new ObsidianExporter();
  const obsidianResultRaw = await obsidianExporter.export(result.clippings, {
    groupByBook,
    folderStructure,
    authorCase,
    includeClippingTags,
  });
  const obsidianData = unwrapExport(obsidianResultRaw, "Obsidian");

  if (obsidianData) {
    if (obsidianData.files && obsidianData.files.length > 0) {
      renderMultiFilePreview(elements.exportObsidianContent, obsidianData.files);

      try {
        const entries: ZipEntry[] = obsidianData.files.map((f: ExportedFile) => ({
          name: f.path,
          content: f.content,
          date: new Date(),
        }));

        const zipData = await UTILS.createZipArchive(entries);

        exportResults.obsidian = {
          content: zipData,
          extension: ".zip",
          mimeType: "application/zip",
        };
      } catch (err) {
        console.error("ZIP generation error:", err);
        exportResults.obsidian = {
          content: `Error generating ZIP: ${err}`,
          extension: ".txt",
          mimeType: "text/plain",
        };
      }
    } else {
      const obsidianContent =
        typeof obsidianData.output === "string" ? obsidianData.output : "[Binary output]";
      elements.exportObsidianContent.textContent = obsidianContent;
      elements.exportObsidianContent.classList.remove("placeholder");

      exportResults.obsidian = {
        content: obsidianContent,
        extension: ".md",
        mimeType: "text/markdown",
      };
    }
  }

  // Joplin Export
  const joplinExporter = new JoplinExporter();
  const joplinResultRaw = await joplinExporter.export(result.clippings, {
    groupByBook,
    folderStructure,
    authorCase,
    includeClippingTags,
    notebookName: title,
    creator,
  });
  const joplinData = unwrapExport(joplinResultRaw, "Joplin");

  if (joplinData) {
    if (joplinData.files && joplinData.files.length > 0) {
      renderMultiFilePreview(elements.exportJoplinContent, joplinData.files);

      try {
        const entries: TarEntry[] = joplinData.files.map((f: ExportedFile) => ({
          name: f.path,
          content: f.content,
        }));

        const tarData = UTILS.createTarArchive(entries);

        exportResults.joplin = {
          content: tarData,
          extension: ".jex",
          mimeType: "application/x-tar",
        };
      } catch (err) {
        console.error("JEX generation error:", err);
        exportResults.joplin = {
          content: `Error: ${err}`,
          extension: ".txt",
          mimeType: "text/plain",
        };
      }
    } else {
      const joplinContent =
        typeof joplinData.output === "string" ? joplinData.output : "[Binary output]";
      elements.exportJoplinContent.textContent = joplinContent;
      elements.exportJoplinContent.classList.remove("placeholder");
      exportResults.joplin = {
        content: joplinContent,
        extension: ".md",
        mimeType: "text/markdown",
      };
    }
  }

  // HTML Export
  const htmlExporter = new HtmlExporter();
  const htmlResultRaw = await htmlExporter.export(result.clippings, { includeStats, title });
  const htmlData = unwrapExport(htmlResultRaw, "HTML");
  if (htmlData && typeof htmlData.output === "string") {
    const blob = new Blob([htmlData.output], { type: "text/html" });
    elements.exportHtmlContent.src = URL.createObjectURL(blob);
    exportResults.html = { content: htmlData.output, extension: ".html", mimeType: "text/html" };
  }

  // Enable download button
  elements.downloadBtn.disabled = false;
}

function renderMultiFilePreview(container: HTMLElement, files: ExportedFile[]): void {
  container.innerHTML = "";
  container.classList.remove("placeholder");

  // Summary header
  const totalSize = files.reduce(
    (acc, f: ExportedFile) =>
      acc + (typeof f.content === "string" ? f.content.length : f.content.length),
    0,
  );

  const summary = document.createElement("div");
  summary.style.marginBottom = "10px";
  summary.style.color = "var(--text-secondary)";
  summary.style.fontSize = "0.85rem";
  summary.textContent = `Generated ${files.length} files (${formatBytes(totalSize)})`;
  container.appendChild(summary);

  // Explorer container
  const explorer = document.createElement("div");
  explorer.className = "file-explorer";

  // File list sidebar
  const fileList = document.createElement("div");
  fileList.className = "file-list";

  // Content preview area
  const preview = document.createElement("div");
  preview.className = "file-content-preview";

  // Helper to show content
  const showFile = (file: ExportedFile) => {
    // Update active class
    const items = fileList.querySelectorAll(".file-list-item");
    items.forEach((item) => {
      if (item.getAttribute("data-path") === file.path) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    if (file.content instanceof Uint8Array) {
      preview.textContent = `[Binary content, ${file.content.length} bytes]`;
    } else {
      preview.textContent = file.content;
    }
  };

  // Build file list
  files.forEach((file) => {
    const item = document.createElement("div");
    item.className = "file-list-item";
    item.textContent = file.path;
    item.title = file.path;
    item.setAttribute("data-path", file.path);
    item.addEventListener("click", () => showFile(file));
    fileList.appendChild(item);
  });

  explorer.appendChild(fileList);
  explorer.appendChild(preview);
  container.appendChild(explorer);

  // Show first file if available
  if (files.length > 0) {
    const first = files[0];
    if (first) {
      showFile(first);
    }
  }
}

// =============================================================================
// Filtering
// =============================================================================

function populateBookFilter(): void {
  const result = state.parseResult;
  if (!result) return;

  const books = [...new Set(result.clippings.map((c) => c.title))].sort();

  const optionsHtml = `
    <option value="">All books (${books.length})</option>
    ${books.map((b) => `<option value="${escapeHtml(b)}">${truncate(b, 40)}</option>`).join("")}
  `;

  // Update both book filters
  elements.clippingsFilterBook.innerHTML = optionsHtml;
  elements.optBookFilter.innerHTML = optionsHtml;
}

// Get currently active export tab
function getActiveExportTab(): string {
  const activeTab = document.querySelector("#export-section .tab.active");
  const tabName = activeTab?.getAttribute("data-tab")?.replace("export-", "") || "json";
  return tabName;
}

// Download current export
function downloadExport(): void {
  const activeTab = getActiveExportTab();
  const exportData = exportResults[activeTab];

  if (!exportData) {
    console.error("No export data available for:", activeTab);
    return;
  }

  const fileName = `kindle-clippings${exportData.extension}`;
  const blob =
    exportData.content instanceof Uint8Array
      ? new Blob([exportData.content as unknown as BlobPart], { type: exportData.mimeType })
      : new Blob([exportData.content as string], { type: exportData.mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
// Tab Counts
// =============================================================================

function updateTabCounts(): void {
  const result = state.parseResult;
  if (result) {
    elements.clippingsCount.textContent = `(${result.clippings.length})`;
    elements.warningsCount.textContent =
      result.warnings.length > 0 ? `(${result.warnings.length})` : "";
  } else {
    elements.clippingsCount.textContent = "";
    elements.warningsCount.textContent = "";
  }
}

// =============================================================================
// Clear / Reset
// =============================================================================

function clearAll(): void {
  state.fileContent = null;
  state.fileName = null;
  state.parseResult = null;

  // Reset UI
  elements.fileInfo.classList.add("hidden");
  elements.fileInfo.innerHTML = "";
  elements.parseBtn.disabled = true;
  elements.clearBtn.disabled = true;
  elements.downloadBtn.disabled = true;

  // Reset results
  elements.statsContent.innerHTML = '<div class="placeholder">Parse a file to see statistics</div>';
  elements.clippingsContent.innerHTML =
    '<div class="placeholder">Parse a file to see clippings</div>';
  elements.warningsContent.innerHTML =
    '<div class="placeholder">Parse a file to see warnings</div>';
  elements.rawContent.innerHTML =
    '<div class="placeholder">Parse a file to see raw JSON data</div>';

  // Reset exports
  elements.exportJsonContent.innerHTML = '<div class="placeholder">Parse a file first</div>';
  elements.exportCsvContent.innerHTML = '<div class="placeholder">Parse a file first</div>';
  elements.exportMdContent.innerHTML = '<div class="placeholder">Parse a file first</div>';
  elements.exportObsidianContent.innerHTML = '<div class="placeholder">Parse a file first</div>';
  elements.exportJoplinContent.innerHTML = '<div class="placeholder">Parse a file first</div>';
  elements.exportHtmlContent.src = "";

  // Reset tab counts
  updateTabCounts();

  // Reset book filters
  elements.clippingsFilterBook.innerHTML = '<option value="">All books</option>';
  elements.optBookFilter.innerHTML = '<option value="">All books</option>';

  // Reset file input
  elements.fileInput.value = "";
}

// =============================================================================
// LocalStorage Persistence
// =============================================================================

const STORAGE_KEY = "kindle-workbench-options";

function saveOptionsToStorage(): void {
  const options = {
    language: elements.optLanguage.value,
    removeDuplicates: elements.optRemoveDuplicates.checked,
    mergeNotes: elements.optMergeNotes.checked,
    mergeOverlapping: elements.optMergeOverlapping.checked,
    extractTags: elements.optExtractTags.checked,
    tagCase: elements.optTagCase.value,
    highlightsOnly: elements.optHighlightsOnly.checked,
    mergedOutput: elements.optMergedOutput.checked,
    removeUnlinkedNotes: elements.optRemoveUnlinkedNotes.checked,
    normalizeUnicode: elements.optNormalizeUnicode.checked,
    cleanContent: elements.optCleanContent.checked,
    cleanTitles: elements.optCleanTitles.checked,
    excludeHighlights: elements.optExcludeHighlights.checked,
    excludeNotes: elements.optExcludeNotes.checked,
    excludeBookmarks: elements.optExcludeBookmarks.checked,
    minContentLength: elements.optMinContentLength.value,
    strict: elements.optStrict.checked,
    dateLocale: elements.optDateLocale.value,
    // Export options
    exportGroupByBook: elements.exportGroupByBook.checked,
    exportIncludeStats: elements.exportIncludeStats.checked,
    exportIncludeClippingTags: elements.exportIncludeClippingTags.checked,
    exportIncludeRaw: elements.exportIncludeRaw.checked,
    exportPretty: elements.exportPretty.checked,
    exportFolderStructure: elements.exportFolderStructure.value,
    exportAuthorCase: elements.exportAuthorCase.value,
    exportTemplatePreset: elements.exportTemplatePreset.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
}

function loadOptionsFromStorage(): void {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const options = JSON.parse(saved);

    // Parse options
    if (options.language) elements.optLanguage.value = options.language;
    if (typeof options.removeDuplicates === "boolean")
      elements.optRemoveDuplicates.checked = options.removeDuplicates;
    if (typeof options.mergeNotes === "boolean")
      elements.optMergeNotes.checked = options.mergeNotes;
    if (typeof options.mergeOverlapping === "boolean")
      elements.optMergeOverlapping.checked = options.mergeOverlapping;
    if (typeof options.extractTags === "boolean")
      elements.optExtractTags.checked = options.extractTags;
    if (options.tagCase) elements.optTagCase.value = options.tagCase;
    if (typeof options.highlightsOnly === "boolean")
      elements.optHighlightsOnly.checked = options.highlightsOnly;
    if (typeof options.mergedOutput === "boolean")
      elements.optMergedOutput.checked = options.mergedOutput;
    if (typeof options.removeUnlinkedNotes === "boolean")
      elements.optRemoveUnlinkedNotes.checked = options.removeUnlinkedNotes;
    if (typeof options.normalizeUnicode === "boolean")
      elements.optNormalizeUnicode.checked = options.normalizeUnicode;
    if (typeof options.cleanContent === "boolean")
      elements.optCleanContent.checked = options.cleanContent;
    if (typeof options.cleanTitles === "boolean")
      elements.optCleanTitles.checked = options.cleanTitles;
    if (typeof options.excludeHighlights === "boolean")
      elements.optExcludeHighlights.checked = options.excludeHighlights;
    if (typeof options.excludeNotes === "boolean")
      elements.optExcludeNotes.checked = options.excludeNotes;
    if (typeof options.excludeBookmarks === "boolean")
      elements.optExcludeBookmarks.checked = options.excludeBookmarks;
    if (options.minContentLength) elements.optMinContentLength.value = options.minContentLength;
    if (typeof options.strict === "boolean") elements.optStrict.checked = options.strict;
    if (options.dateLocale) elements.optDateLocale.value = options.dateLocale;

    // Export options
    if (typeof options.exportGroupByBook === "boolean")
      elements.exportGroupByBook.checked = options.exportGroupByBook;
    if (typeof options.exportIncludeStats === "boolean")
      elements.exportIncludeStats.checked = options.exportIncludeStats;
    if (typeof options.exportIncludeClippingTags === "boolean")
      elements.exportIncludeClippingTags.checked = options.exportIncludeClippingTags;
    if (typeof options.exportIncludeRaw === "boolean")
      elements.exportIncludeRaw.checked = options.exportIncludeRaw;
    if (typeof options.exportPretty === "boolean")
      elements.exportPretty.checked = options.exportPretty;
    if (options.exportFolderStructure)
      elements.exportFolderStructure.value = options.exportFolderStructure;
    if (options.exportAuthorCase) elements.exportAuthorCase.value = options.exportAuthorCase;
    if (options.exportTemplatePreset)
      elements.exportTemplatePreset.value = options.exportTemplatePreset;

    // Update tagCase enabled state based on extractTags
    elements.optTagCase.disabled = !elements.optExtractTags.checked;
  } catch {
    console.warn("Failed to load saved options from localStorage");
  }
}

// =============================================================================
// Initialize
// =============================================================================

function init(): void {
  setupFileUpload();
  setupTabs();
  loadOptionsFromStorage();

  // Parse button
  elements.parseBtn.addEventListener("click", parseFile);

  // Clear button
  elements.clearBtn.addEventListener("click", clearAll);

  // Toggle tagCase enabled state based on extractTags
  elements.optExtractTags.addEventListener("change", () => {
    elements.optTagCase.disabled = !elements.optExtractTags.checked;
  });

  // Re-parse on option change + save to localStorage
  const optionInputs = document.querySelectorAll("#options-section input, #options-section select");
  optionInputs.forEach((input) => {
    input.addEventListener("change", () => {
      saveOptionsToStorage();
      if (state.parseResult) {
        parseFile();
      }
    });
  });

  // Filtering
  elements.clippingsSearch.addEventListener("input", filterClippings);
  elements.clippingsFilterType.addEventListener("change", filterClippings);
  elements.clippingsFilterBook.addEventListener("change", filterClippings);

  // Export options + save to localStorage
  const exportInputs = [
    elements.exportGroupByBook,
    elements.exportIncludeStats,
    elements.exportIncludeClippingTags,
    elements.exportIncludeRaw,
    elements.exportPretty,
    elements.exportFolderStructure,
    elements.exportAuthorCase,
    elements.exportTemplatePreset,
  ];

  exportInputs.forEach((input) => {
    input.addEventListener("change", () => {
      saveOptionsToStorage();
      renderExports();
    });
  });

  // Download button
  elements.downloadBtn.addEventListener("click", downloadExport);

  console.log("Kindle Tools Testing GUI initialized");
}

// Start the app
init();
