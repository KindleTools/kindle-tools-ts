/**
 * CSV Importer for Kindle clippings.
 *
 * Imports clippings from CSV files exported by this tool.
 *
 * @packageDocumentation
 */

import { distance } from "fastest-levenshtein";
import { z } from "zod";
import type { Clipping, ClippingType } from "#app-types/clipping.js";
import {
  type ImportErrorDetail,
  type ImportResult,
  importEmptyFile,
  importInvalidFormat,
  importValidationError,
  logDebug,
} from "#errors";
import { BaseImporter } from "../shared/base-importer.js";
import { generateImportId, MAX_VALIDATION_ERRORS, parseLocationString } from "../shared/index.js";

/**
 * Schema for validating CSV row data.
 * All fields are optional strings since CSV parsing returns strings.
 * Type validation is lenient here - we validate/default specific values after parsing.
 */
const CsvRowSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  type: z.enum(["highlight", "note", "bookmark", "clip", "article"]).or(z.literal("")).optional(),
  page: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), {
      message: "Page must be a valid number",
    }),
  location: z.string().optional(),
  date: z.string().optional(),
  content: z.string().optional(),
  wordcount: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), {
      message: "Word count must be a valid number",
    }),
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
 * Get suggestion for validation error using Levenshtein distance.
 */
function getSuggestion(field: string, value: unknown): string | undefined {
  if (field === "date") {
    return "Use ISO 8601: YYYY-MM-DD";
  }
  if (field === "type" && typeof value === "string") {
    const validTypes = ["highlight", "note", "bookmark", "clip", "article"];
    const lower = value.toLowerCase();

    // Find closest match
    let bestMatch = "";
    let minDistance = Infinity;

    for (const type of validTypes) {
      if (lower === type) return undefined; // Exact match (should be handled by validator but safe to keep)

      const d = distance(lower, type);
      if (d < minDistance) {
        minDistance = d;
        bestMatch = type;
      }
    }

    // Only suggest if distance is small enough (arbitrary threshold, e.g. 3)
    if (minDistance <= 3) {
      return `Did you mean '${bestMatch}'?`;
    }
  }
  return undefined;
}

/**
 * Import clippings from CSV format.
 */
export class CsvImporter extends BaseImporter {
  readonly name = "csv";
  readonly extensions: string[] = [".csv"];

  /**
   * Import clippings from CSV content.
   *
   * Expected columns:
   * id, title, author, type, page, location, date, content, wordCount, tags
   */
  protected async doImport(content: string): Promise<ImportResult> {
    logDebug("CSV Import started", {
      operation: "import_csv",
      data: { contentLength: content.length },
    });

    const warnings: string[] = [];
    const errors: ImportErrorDetail[] = [];
    const rows = parseCSV(content);

    if (rows.length < 2) {
      logDebug("CSV Import failed: no data rows", {
        operation: "import_csv",
        data: { rowsFound: rows.length },
      });
      return importEmptyFile("CSV file has no data rows");
    }

    // Parse header row
    const headerRow = rows[0];
    if (!headerRow) {
      return importInvalidFormat("CSV file has no header row");
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
      return importInvalidFormat("CSV must have at least 'content' or 'title' column");
    }

    const clippings: Clipping[] = [];

    // Parse data rows
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      if (errors.length >= MAX_VALIDATION_ERRORS) {
        const msg = `Stopped after ${MAX_VALIDATION_ERRORS} errors. File may be corrupted.`;
        errors.push({
          row: -1,
          field: "file",
          message: msg,
        });
        warnings.push(msg); // Add to warnings for visibility in partial success
        break;
      }

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
          validatedRow.error.issues.forEach((issue) => {
            const field = issue.path.join(".") || "unknown";
            const suggestion = getSuggestion(field, (rowData as any)[field]);

            // Add to structured errors
            errors.push({
              row: rowIdx + 1,
              field,
              message: issue.message,
              ...(suggestion ? { suggestion } : {}),
            });

            // Add to warnings for legacy support
            warnings.push(
              `Row ${rowIdx + 1} field '${field}' invalid: ${issue.message}${suggestion ? ` (${suggestion})` : ""}`,
            );
          });
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

        // Manual date validation for suggestion
        const date = dateStr ? new Date(dateStr) : null;
        if (dateStr && isNaN(date?.getTime() ?? NaN)) {
          const suggestion = getSuggestion("date", dateStr);
          errors.push({
            row: rowIdx + 1,
            field: "date",
            message: "Invalid date format",
            ...(suggestion ? { suggestion } : {}),
          });
          warnings.push(
            `Row ${rowIdx + 1} invalid date: ${dateStr}${suggestion ? ` (${suggestion})` : ""}`,
          );
          continue; // Skip this row
        }

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
        const message = e instanceof Error ? e.message : String(e);
        errors.push({
          row: rowIdx + 1,
          field: "row",
          message: `Unexpected parse error: ${message}`,
        });
        warnings.push(`Row ${rowIdx + 1} parse error: ${message}`);
      }
    }

    if (clippings.length === 0) {
      if (errors.length > 0) {
        return importValidationError("Parsed 0 valid clippings", errors, warnings);
      }
      return importEmptyFile("No valid clippings found in CSV file", warnings);
    }

    logDebug("CSV Import completed", {
      operation: "import_csv",
      data: {
        clippingsFound: clippings.length,
        warningsCount: warnings.length,
      },
    });

    return this.success(clippings, warnings);
  }
}
