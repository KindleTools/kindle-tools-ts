/**
 * CSV Importer for Kindle clippings.
 *
 * Imports clippings from CSV files exported by this tool.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import type { Clipping, ClippingType } from "#app-types/clipping.js";
import type { ImportResult } from "../core/types.js";
import { BaseImporter } from "../shared/base-importer.js";
import { generateImportId, parseLocationString } from "../shared/index.js";

/**
 * Schema for validating CSV row data.
 * All fields are optional strings since CSV parsing returns strings.
 * Type validation is lenient here - we validate/default specific values after parsing.
 */
const CsvRowSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  type: z.string().optional(), // Validate specific values after parsing (accepts empty string)
  page: z.string().optional(),
  location: z.string().optional(),
  date: z.string().optional(),
  content: z.string().optional(),
  wordcount: z.string().optional(),
  tags: z.string().optional(),
});

type CsvRow = z.infer<typeof CsvRowSchema>;

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
      return this.error(new Error("CSV file has no data rows"), warnings, "EMPTY_FILE");
    }

    // Parse header row
    const headerRow = rows[0];
    if (!headerRow) {
      return this.error(new Error("CSV file has no header row"), warnings, "INVALID_FORMAT");
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
      return this.error(
        new Error("CSV must have at least 'content' or 'title' column"),
        warnings,
        "INVALID_FORMAT",
      );
    }

    const clippings: Clipping[] = [];

    // Parse data rows
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row || row.length === 0 || (row.length === 1 && !row[0]?.trim())) {
        continue; // Skip empty rows
      }

      try {
        // Build row object from columns
        const getValue = (column: string): string => {
          const idx = colIndex[column];
          return idx !== undefined ? (row[idx] ?? "") : "";
        };

        const rowData = {
          id: getValue("id"),
          title: getValue("title"),
          author: getValue("author"),
          type: getValue("type") as CsvRow["type"],
          page: getValue("page"),
          location: getValue("location"),
          date: getValue("date"),
          content: getValue("content"),
          wordcount: getValue("wordcount"),
          tags: getValue("tags"),
        };

        // Validate row data with Zod
        const validatedRow = CsvRowSchema.safeParse(rowData);

        if (!validatedRow.success) {
          const issues = validatedRow.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
          warnings.push(`Row ${rowIdx + 1} validation failed: ${issues.join(", ")}`);
          continue;
        }

        const data = validatedRow.data;

        const id = data.id || generateImportId(rowIdx);
        const title = data.title || "Unknown";
        const author = data.author || "Unknown";
        const type = (data.type || "highlight") as ClippingType;
        const pageStr = data.page;
        const page = pageStr ? Number.parseInt(pageStr, 10) : null;
        const location = parseLocationString(data.location ?? "");
        const dateStr = data.date ?? "";
        const date = dateStr ? new Date(dateStr) : null;
        const content = data.content ?? "";
        const wordCountStr = data.wordcount;
        const wordCount = wordCountStr
          ? Number.parseInt(wordCountStr, 10)
          : content.split(/\s+/).filter(Boolean).length;
        const tagsStr = data.tags;
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
      return this.error(new Error("No valid clippings found in CSV file"), warnings, "PARSE_ERROR");
    }

    return this.success(clippings, warnings);
  }
}
