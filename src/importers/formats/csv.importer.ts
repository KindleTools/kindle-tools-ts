/**
 * CSV Importer for Kindle clippings.
 *
 * Imports clippings from CSV files exported by this tool.
 *
 * @packageDocumentation
 */

import type { Clipping, ClippingType } from "#app-types/clipping.js";
import type { ImportResult } from "../core/types.js";
import { BaseImporter } from "../shared/base-importer.js";
import { generateImportId, parseLocationString } from "../shared/index.js";

/**
 * Parse CSV content, handling quoted fields with embedded commas and newlines.
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  // Remove BOM if present
  const cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const nextChar = cleanContent[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\r") {
      } else if (char === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Import clippings from CSV format.
 */
export class CsvImporter extends BaseImporter {
  readonly name = "csv";
  readonly extensions = [".csv"];

  /**
   * Import clippings from CSV content.
   *
   * Expected columns:
   * id, title, author, type, page, location, date, content, wordCount, tags
   */
  protected async doImport(content: string): Promise<ImportResult> {
    const warnings: string[] = [];
    const rows = parseCSV(content);

    if (rows.length < 2) {
      return this.error(new Error("CSV file has no data rows"), warnings);
    }

    // Parse header row
    const headerRow = rows[0];
    if (!headerRow) {
      return this.error(new Error("CSV file has no header row"), warnings);
    }

    const headers = headerRow.map((h) => h.toLowerCase().trim());

    // Map column names to indices
    const colIndex: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header) {
        colIndex[header] = i;
      }
    }

    // Required columns
    const hasContent = "content" in colIndex;
    const hasTitle = "title" in colIndex;

    if (!hasContent && !hasTitle) {
      return this.error(new Error("CSV must have at least 'content' or 'title' column"), warnings);
    }

    const clippings: Clipping[] = [];

    // Parse data rows
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row || row.length === 0 || (row.length === 1 && !row[0]?.trim())) {
        continue; // Skip empty rows
      }

      try {
        const getValue = (column: string): string => {
          const idx = colIndex[column];
          return idx !== undefined ? (row[idx] ?? "") : "";
        };

        const id = getValue("id") || generateImportId(rowIdx);
        const title = getValue("title") || "Unknown";
        const author = getValue("author") || "Unknown";
        const type = (getValue("type") || "highlight") as ClippingType;
        const pageStr = getValue("page");
        const page = pageStr ? Number.parseInt(pageStr, 10) : null;
        const location = parseLocationString(getValue("location"));
        const dateStr = getValue("date");
        const date = dateStr ? new Date(dateStr) : null;
        const content = getValue("content");
        const wordCountStr = getValue("wordcount");
        const wordCount = wordCountStr
          ? Number.parseInt(wordCountStr, 10)
          : content.split(/\s+/).filter(Boolean).length;
        const tagsStr = getValue("tags");
        const tags = tagsStr
          ? tagsStr
              .split(/[;,]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined;

        // Build base clipping with required fields
        const clipping: Clipping = {
          id,
          title,
          titleRaw: title,
          author,
          authorRaw: author,
          content,
          contentRaw: content,
          type,
          page,
          location,
          date,
          dateRaw: dateStr,
          isLimitReached: false,
          isEmpty: content.trim().length === 0,
          language: "en",
          source: "kindle",
          wordCount,
          charCount: content.length,
          blockIndex: rowIdx - 1,
        };

        // Add tags only if they have values
        if (tags !== undefined && tags.length > 0) {
          clipping.tags = tags;
        }

        clippings.push(clipping);
      } catch (e) {
        warnings.push(`Failed to parse row ${rowIdx + 1}: ${e}`);
      }
    }

    if (clippings.length === 0) {
      return this.error(new Error("No valid clippings found in CSV file"), warnings);
    }

    return this.success(clippings, warnings);
  }
}
