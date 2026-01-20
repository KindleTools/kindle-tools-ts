/**
 * Kindle Tools - Testing GUI
 * Main entry point for the browser-based testing interface
 */

import type { SupportedLanguage } from "#app-types/language.js";
import { processClippings } from "#core/processor.js";
import { CsvImporter, type Importer, JsonImporter, TxtImporter } from "#importers/index.js";
import {
  downloadExport,
  elements,
  getParseOptions,
  loadOptionsFromStorage,
  populateBookFilter,
  renderClippings,
  renderClippingsTable,
  renderExports,
  renderRawData,
  renderStats,
  renderWarnings,
  saveOptionsToStorage,
  setupTabs,
  updateTabCounts,
} from "./ui.js";
import { detectInputFormat, escapeHtml, formatBytes, state, UTILS } from "./utils.js";

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
// Filters
// =============================================================================

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
