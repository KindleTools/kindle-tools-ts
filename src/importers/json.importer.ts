/**
 * JSON Importer for Kindle clippings.
 *
 * Imports clippings from JSON files exported by this tool.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import type { Clipping, ClippingLocation, ClippingType } from "../types/clipping.js";
import type { SupportedLanguage } from "../types/language.js";
import { BaseImporter } from "./shared/base-importer.js";
import { generateImportId, parseLocationString } from "./shared/index.js";
import type { ImportResult } from "./types.js";

// Validation Schemas

const ClippingTypeSchema = z.enum(["highlight", "note", "bookmark", "clip"]).optional();

const ClippingLocationSchema = z
  .union([
    z.string(),
    z.object({
      raw: z.string().optional(),
      start: z.number().optional(),
      end: z.number().nullable().optional(),
    }),
  ])
  .optional();

const SupportedLanguageSchema = z.string().optional(); // Loosely typed to allow string import, validated later if needed

const JsonClippingSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  titleRaw: z.string().optional(),
  author: z.string().optional(),
  authorRaw: z.string().optional(),
  content: z.string().optional(),
  contentRaw: z.string().optional(),
  type: ClippingTypeSchema,
  page: z.number().nullable().optional(),
  location: ClippingLocationSchema,
  date: z.string().nullable().optional(),
  dateRaw: z.string().optional(),
  isLimitReached: z.boolean().optional(),
  isEmpty: z.boolean().optional(),
  language: SupportedLanguageSchema,
  source: z.enum(["kindle", "sideload"]).optional(),
  wordCount: z.number().optional(),
  charCount: z.number().optional(),
  linkedNoteId: z.string().optional(),
  linkedHighlightId: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  blockIndex: z.number().optional(),
  isSuspiciousHighlight: z.boolean().optional(),
  suspiciousReason: z.enum(["too_short", "fragment", "incomplete"]).optional(),
  similarityScore: z.number().optional(),
  possibleDuplicateOf: z.string().optional(),
  titleWasCleaned: z.boolean().optional(),
  contentWasCleaned: z.boolean().optional(),
});

type JsonClipping = z.infer<typeof JsonClippingSchema>;

const JsonExportSchema = z.union([
  // Array format
  z.array(JsonClippingSchema),
  // Object format
  z.object({
    clippings: z.array(JsonClippingSchema).optional(),
    books: z.record(z.string(), z.array(JsonClippingSchema)).optional(),
    meta: z
      .object({
        total: z.number().optional(),
        totalBooks: z.number().optional(),
        totalClippings: z.number().optional(),
      })
      .optional(),
  }),
]);

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
function jsonToClipping(json: JsonClipping, index: number): Clipping {
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
    location: parseLocation(json.location),
    date: json.date ? new Date(json.date) : null,
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
  readonly extensions = [".json"];

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
      throw new Error(`Invalid JSON syntax: ${e}`);
    }

    const parsedData = JsonExportSchema.safeParse(rawJson);

    if (!parsedData.success) {
      // Map Zod errors to readable warnings
      const issues = parsedData.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return this.error(new Error("JSON content does not match expected schema"), issues);
    }

    const data = parsedData.data;

    // Handle array format (Legacy/Alternative)
    if (Array.isArray(data)) {
      data.forEach((jsonClipping, i) => {
        try {
          clippings.push(jsonToClipping(jsonClipping, i));
        } catch (e) {
          warnings.push(`Failed to process clipping at index ${i}: ${e}`);
        }
      });
    } else {
      // Handle Object format

      // 1. Flat clippings
      if (data.clippings) {
        data.clippings.forEach((jsonClipping, i) => {
          try {
            clippings.push(jsonToClipping(jsonClipping, i));
          } catch (e) {
            warnings.push(`Failed to process clipping at index ${i}: ${e}`);
          }
        });
      }

      // 2. Grouped by book
      if (data.books) {
        let globalIndex = clippings.length;
        for (const [bookTitle, bookClippings] of Object.entries(data.books)) {
          if (Array.isArray(bookClippings)) {
            for (const jsonClipping of bookClippings) {
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
      return this.success([], warnings);
    }

    return this.success(clippings, warnings);
  }
}
