/**
 * JSON Importer for Kindle clippings.
 *
 * Imports clippings from JSON files exported by this tool.
 *
 * @packageDocumentation
 */

import { closest } from "fastest-levenshtein";
import type { Clipping, ClippingLocation, ClippingType } from "#app-types/clipping.js";
import type { SupportedLanguage } from "#app-types/language.js";
import { type ImportResult, importParseError, logDebug } from "#errors";
import {
  type ClippingImport,
  ClippingImportSchema,
  ClippingTypeSchema,
} from "../../schemas/clipping.schema.js";
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
    logDebug("JSON Import started", {
      operation: "import_json",
      data: { contentLength: content.length },
    });

    const warnings: string[] = [];
    const clippings: Clipping[] = [];

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(content);
    } catch (e) {
      logDebug("JSON Import failed: invalid syntax", {
        operation: "import_json",
        data: { error: String(e) },
      });
      return importParseError(`Invalid JSON syntax: ${e}`);
    }

    // Determine the array of items to process
    let itemsToProcess: unknown[] = [];

    // Helper to add warning respecting limit
    const addWarning = (msg: string) => {
      if (warnings.length < MAX_VALIDATION_ERRORS) {
        warnings.push(msg);
      } else if (warnings.length === MAX_VALIDATION_ERRORS) {
        warnings.push(`Stopped after ${MAX_VALIDATION_ERRORS} warnings. File may be corrupted.`);
      }
    };

    if (Array.isArray(rawJson)) {
      itemsToProcess = rawJson;
    } else if (typeof rawJson === "object" && rawJson !== null) {
      // Loose check for object format
      const obj = rawJson as Record<string, unknown>;
      if (Array.isArray(obj["clippings"])) {
        itemsToProcess = obj["clippings"];
      } else if (typeof obj["books"] === "object" && obj["books"] !== null) {
        // Flatten books object
        const books = obj["books"] as Record<string, unknown>;
        for (const [bookTitle, bookClippings] of Object.entries(books)) {
          if (Array.isArray(bookClippings)) {
            // Enrich with book title if missing
            const enriched = bookClippings.map((c) => {
              if (typeof c === "object" && c !== null) {
                const clippingObj = c as Record<string, unknown>;
                return { ...clippingObj, title: clippingObj["title"] ?? bookTitle };
              }
              return c;
            });
            itemsToProcess.push(...enriched);
          }
        }
      }
    }

    if (itemsToProcess.length === 0) {
      logDebug("JSON Import parsed 0 items to process", { operation: "import_json" });
      // If we couldn't find any items, checks if it was just empty or invalid format
      const hasClippings = typeof rawJson === 'object' && rawJson !== null && "clippings" in rawJson;
      const hasBooks = typeof rawJson === 'object' && rawJson !== null && "books" in rawJson;

      if (!Array.isArray(rawJson) && !hasClippings && !hasBooks) {
        return importParseError(
          "Invalid JSON structure. Expected array or object with 'clippings'/'books'.",
        );
      }
    }

    let validCount = 0;

    for (const [i, item] of itemsToProcess.entries()) {
      // Check limit before processing
      if (warnings.length > MAX_VALIDATION_ERRORS) {
        break; // Stop processing entirely if we crossed the threshold
      }

      const result = ClippingImportSchema.safeParse(item);

      if (result.success) {
        try {
          clippings.push(jsonToClipping(result.data, validCount++));
        } catch (e) {
          addWarning(`Failed to convert clipping at index ${i}: ${e}`);
        }
      } else {
        // Validation failed
        const issues = result.error.issues;
        for (const issue of issues) {
          let message = `Item ${i}: ${issue.path.join(".")} - ${issue.message}`;

          // Add fuzzy suggestion for invalid type
          if (issue.path.includes("type") && typeof item === "object" && item !== null && "type" in item) {
            const invalidType = (item as Record<string, unknown>)["type"];
            if (typeof invalidType === "string") {
              const validTypes = ClippingTypeSchema.options;
              const suggestion = closest(invalidType, [...validTypes]);
              message += `. Did you mean "${suggestion}"?`;
            }
          }

          addWarning(message);
        }
      }
    }

    if (clippings.length === 0 && warnings.length > 0) {
      return importParseError("No valid clippings found in JSON file", { warnings });
    }

    if (clippings.length === 0) {
      addWarning("No clippings found in JSON file");
      return importParseError("No clippings found in JSON file", { warnings });
    }

    logDebug("JSON Import completed", {
      operation: "import_json",
      data: {
        clippingsFound: clippings.length,
        warningsCount: warnings.length,
      },
    });

    return this.success(clippings, warnings);
  }
}
