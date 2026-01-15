/**
 * JSON Importer for Kindle clippings.
 *
 * Imports clippings from JSON files exported by this tool.
 *
 * @packageDocumentation
 */

import type { Clipping, ClippingLocation, ClippingType } from "#app-types/clipping.js";
import type { SupportedLanguage } from "#app-types/language.js";
import { type ImportResult, importInvalidFormat, importParseError } from "#errors";
import { type ClippingImport, ClippingsExportSchema } from "../../schemas/clipping.schema.js";
import { BaseImporter } from "../shared/base-importer.js";
import { generateImportId, MAX_VALIDATION_ERRORS, parseLocationString } from "../shared/index.js";

/**
 * Parse a location value that could be a string or object.
 */
function parseLocation(
  loc:
    | ClippingLocation
    | string
    | { raw?: string | undefined; start?: number | undefined; end?: number | null | undefined }
    | undefined,
): ClippingLocation {
  if (!loc) {
    return { raw: "", start: 0, end: null };
  }

  if (typeof loc === "string") {
    return parseLocationString(loc);
  }

  return {
    raw: loc.raw ?? "",
    start: loc.start ?? 0,
    end: loc.end ?? null,
  };
}

/**
 * Convert a JSON clipping to a full Clipping object.
 */
function jsonToClipping(json: ClippingImport, index: number): Clipping {
  const content = json.content ?? json.contentRaw ?? "";
  const title = json.title ?? json.titleRaw ?? "Unknown";
  const author = json.author ?? json.authorRaw ?? "Unknown";

  // Build base clipping with required fields
  const clipping: Clipping = {
    id: json.id ?? generateImportId(index),
    title,
    titleRaw: json.titleRaw ?? title,
    author,
    authorRaw: json.authorRaw ?? author,
    content,
    contentRaw: json.contentRaw ?? content,
    type: (json.type as ClippingType) ?? "highlight",
    page: json.page ?? null,
    location: parseLocation(
      json.location as string | { raw?: string; start?: number; end?: number | null } | undefined,
    ),
    date: json.date instanceof Date ? json.date : null,
    dateRaw: json.dateRaw ?? "",
    isLimitReached: json.isLimitReached ?? false,
    isEmpty: json.isEmpty ?? content.trim().length === 0,
    language: (json.language as SupportedLanguage) ?? "en",
    source: json.source ?? "kindle",
    wordCount: json.wordCount ?? content.split(/\s+/).filter(Boolean).length,
    charCount: json.charCount ?? content.length,
    blockIndex: json.blockIndex ?? index,
  };

  // Add optional fields only if they have values
  if (json.linkedNoteId !== undefined) {
    clipping.linkedNoteId = json.linkedNoteId;
  }
  if (json.linkedHighlightId !== undefined) {
    clipping.linkedHighlightId = json.linkedHighlightId;
  }
  if (json.note !== undefined) {
    clipping.note = json.note;
  }
  if (json.tags !== undefined) {
    clipping.tags = json.tags;
  }
  if (json.isSuspiciousHighlight !== undefined) {
    clipping.isSuspiciousHighlight = json.isSuspiciousHighlight;
  }
  if (json.suspiciousReason !== undefined) {
    clipping.suspiciousReason = json.suspiciousReason;
  }
  if (json.similarityScore !== undefined) {
    clipping.similarityScore = json.similarityScore;
  }
  if (json.possibleDuplicateOf !== undefined) {
    clipping.possibleDuplicateOf = json.possibleDuplicateOf;
  }
  if (json.titleWasCleaned !== undefined) {
    clipping.titleWasCleaned = json.titleWasCleaned;
  }
  if (json.contentWasCleaned !== undefined) {
    clipping.contentWasCleaned = json.contentWasCleaned;
  }

  return clipping;
}

/**
 * Import clippings from JSON format using Zod validation.
 */
export class JsonImporter extends BaseImporter {
  readonly name = "json";
  readonly extensions: string[] = [".json"];

  /**
   * Import clippings from JSON content.
   */
  protected async doImport(content: string): Promise<ImportResult> {
    const warnings: string[] = [];
    const clippings: Clipping[] = [];

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(content);
    } catch (e) {
      return importParseError(`Invalid JSON syntax: ${e}`);
    }

    const parsedData = ClippingsExportSchema.safeParse(rawJson);

    if (!parsedData.success) {
      // Map Zod errors to readable warnings
      const issues = parsedData.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

      const details = parsedData.error.issues.map((i) => ({
        path: i.path.filter((p): p is string | number => typeof p !== "symbol"),
        message: i.message,
        code: String(i.code),
      }));

      return importInvalidFormat("JSON content does not match expected schema", {
        issues: details,
        warnings: issues,
      });
    }

    const data = parsedData.data;

    // Handle array format (Legacy/Alternative)
    if (Array.isArray(data)) {
      for (const [i, jsonClipping] of data.entries()) {
        if (warnings.length >= MAX_VALIDATION_ERRORS) {
          warnings.push(`Stopped after ${MAX_VALIDATION_ERRORS} warnings. File may be corrupted.`);
          break;
        }
        try {
          clippings.push(jsonToClipping(jsonClipping, i));
        } catch (e) {
          warnings.push(`Failed to process clipping at index ${i}: ${e}`);
        }
      }
    } else {
      // Handle Object format

      // 1. Flat clippings
      if (data.clippings) {
        for (const [i, jsonClipping] of data.clippings.entries()) {
          if (warnings.length >= MAX_VALIDATION_ERRORS) {
            warnings.push(
              `Stopped after ${MAX_VALIDATION_ERRORS} warnings. File may be corrupted.`,
            );
            break;
          }
          try {
            clippings.push(jsonToClipping(jsonClipping, i));
          } catch (e) {
            warnings.push(`Failed to process clipping at index ${i}: ${e}`);
          }
        }
      }

      // 2. Grouped by book
      if (data.books) {
        let globalIndex = clippings.length;
        for (const [bookTitle, bookClippings] of Object.entries(data.books)) {
          if (Array.isArray(bookClippings)) {
            for (const jsonClipping of bookClippings) {
              if (warnings.length >= MAX_VALIDATION_ERRORS) {
                warnings.push(
                  `Stopped after ${MAX_VALIDATION_ERRORS} warnings. File may be corrupted.`,
                );
                break;
              }
              try {
                const enriched = { ...jsonClipping };
                if (!enriched.title) {
                  enriched.title = bookTitle;
                }
                clippings.push(jsonToClipping(enriched, globalIndex++));
              } catch (e) {
                warnings.push(`Failed to process clipping from book "${bookTitle}": ${e}`);
              }
            }
          }
        }
      }
    }

    if (clippings.length === 0) {
      warnings.push("No clippings found in JSON file");
      return importParseError("No clippings found in JSON file", { warnings });
    }

    return this.success(clippings, warnings);
  }
}
