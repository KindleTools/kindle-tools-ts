/**
 * JSON Importer for Kindle clippings.
 *
 * Imports clippings from JSON files exported by this tool.
 *
 * @packageDocumentation
 */

import type { Clipping, ClippingLocation, ClippingType } from "../types/clipping.js";
import type { SupportedLanguage } from "../types/language.js";
import type { Importer, ImportResult } from "./types.js";

/**
 * Shape of a clipping in the JSON export format.
 * All fields are optional since we try to be lenient during import.
 */
interface JsonClipping {
  id?: string;
  title?: string;
  titleRaw?: string;
  author?: string;
  authorRaw?: string;
  content?: string;
  contentRaw?: string;
  type?: ClippingType;
  page?: number | null;
  location?: ClippingLocation | string;
  date?: string | null;
  dateRaw?: string;
  isLimitReached?: boolean;
  isEmpty?: boolean;
  language?: SupportedLanguage;
  source?: "kindle" | "sideload";
  wordCount?: number;
  charCount?: number;
  linkedNoteId?: string;
  linkedHighlightId?: string;
  note?: string;
  tags?: string[];
  blockIndex?: number;
  isSuspiciousHighlight?: boolean;
  suspiciousReason?: "too_short" | "fragment" | "incomplete";
  similarityScore?: number;
  possibleDuplicateOf?: string;
  titleWasCleaned?: boolean;
  contentWasCleaned?: boolean;
}

/**
 * Shape of the JSON export format.
 */
interface JsonExport {
  clippings?: JsonClipping[];
  books?: Record<string, JsonClipping[]>;
  meta?: {
    total?: number;
    totalBooks?: number;
    totalClippings?: number;
  };
}

/**
 * Generate a simple ID for clippings that don't have one.
 */
function generateId(index: number): string {
  return `imp_${Date.now().toString(36)}_${index.toString(36)}`;
}

/**
 * Parse a location value that could be a string or object.
 */
function parseLocation(loc: ClippingLocation | string | undefined): ClippingLocation {
  if (!loc) {
    return { raw: "", start: 0, end: null };
  }

  if (typeof loc === "string") {
    const parts = loc.split("-");
    const start = Number.parseInt(parts[0] ?? "0", 10) || 0;
    const end = parts[1] ? Number.parseInt(parts[1], 10) : null;
    return { raw: loc, start, end };
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
    id: json.id ?? generateId(index),
    title,
    titleRaw: json.titleRaw ?? title,
    author,
    authorRaw: json.authorRaw ?? author,
    content,
    contentRaw: json.contentRaw ?? content,
    type: json.type ?? "highlight",
    page: json.page ?? null,
    location: parseLocation(json.location),
    date: json.date ? new Date(json.date) : null,
    dateRaw: json.dateRaw ?? "",
    isLimitReached: json.isLimitReached ?? false,
    isEmpty: json.isEmpty ?? content.trim().length === 0,
    language: json.language ?? "en",
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
 * Import clippings from JSON format.
 */
export class JsonImporter implements Importer {
  name = "json";
  extensions = [".json"];

  /**
   * Import clippings from JSON content.
   *
   * Supports two formats:
   * - Flat: { clippings: [...] }
   * - Grouped by book: { books: { "Book Title": [...] } }
   *
   * @param content - JSON file content
   * @returns Import result with clippings
   */
  async import(content: string): Promise<ImportResult> {
    const warnings: string[] = [];

    try {
      const data = JSON.parse(content) as JsonExport;
      const clippings: Clipping[] = [];

      // Handle flat format
      if (data.clippings && Array.isArray(data.clippings)) {
        for (let i = 0; i < data.clippings.length; i++) {
          const jsonClipping = data.clippings[i];
          if (jsonClipping) {
            try {
              clippings.push(jsonToClipping(jsonClipping, i));
            } catch (e) {
              warnings.push(`Failed to parse clipping at index ${i}: ${e}`);
            }
          }
        }
      }

      // Handle grouped by book format
      if (data.books && typeof data.books === "object") {
        let globalIndex = clippings.length;
        for (const [bookTitle, bookClippings] of Object.entries(data.books)) {
          if (Array.isArray(bookClippings)) {
            for (const jsonClipping of bookClippings) {
              try {
                // Use book title from the key if not present in clipping
                const enriched = { ...jsonClipping };
                if (!enriched.title) {
                  enriched.title = bookTitle;
                }
                clippings.push(jsonToClipping(enriched, globalIndex++));
              } catch (e) {
                warnings.push(`Failed to parse clipping from book "${bookTitle}": ${e}`);
              }
            }
          }
        }
      }

      if (clippings.length === 0) {
        return {
          success: false,
          clippings: [],
          warnings,
          error: new Error("No clippings found in JSON file"),
        };
      }

      return {
        success: true,
        clippings,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        clippings: [],
        warnings,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
