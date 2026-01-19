/**
 * Configuration and options types for Kindle clippings processing.
 *
 * @packageDocumentation
 */

import type { Clipping, ClippingType } from "./clipping.js";
import type { GeoLocation } from "./geo.js";
import type { SupportedLanguage } from "./language.js";
import type { ClippingsStats } from "./stats.js";

// Re-export TagCase from schema for consistency
export type { TagCase } from "#schemas/config.schema.js";

/**
 * Options for parsing Kindle clippings.
 */
export interface ParseOptions {
  // ===== Language =====

  /** Language to use for parsing. 'auto' will detect automatically. Default: 'auto' */
  language?: SupportedLanguage | "auto";

  // ===== Processing =====

  /** Remove exact duplicate clippings. Default: true */
  removeDuplicates?: boolean;

  /** Link notes to their associated highlights. Default: true */
  mergeNotes?: boolean;

  /**
   * Extract tags from notes.
   * When enabled, notes that look like tag lists (comma/semicolon/newline separated)
   * will be parsed and the tags assigned to the linked highlight.
   * Default: false
   */
  extractTags?: boolean;

  /**
   * Case transformation for extracted tags.
   * - 'original': Keep original case as typed in notes
   * - 'uppercase': Convert to UPPERCASE (default)
   * - 'lowercase': Convert to lowercase
   * Only applies when extractTags is enabled.
   * Default: 'uppercase'
   */
  tagCase?: "original" | "uppercase" | "lowercase";

  /**
   * Custom separators for splitting tags.
   * Can be a string (each character is a separator) or a RegExp.
   * Only applies when extractTags is enabled.
   * Default: /[,;.\n\r]+/ (comma, semicolon, period, newline)
   *
   * @example
   * // Use only commas
   * { tagSeparators: "," }
   *
   * @example
   * // Use slash as separator
   * { tagSeparators: "/" }
   */
  tagSeparators?: string | RegExp;

  /** Merge overlapping/extended highlights. Default: true */
  mergeOverlapping?: boolean;

  /**
   * Return only highlights with embedded notes and tags.
   * When enabled:
   * - Notes linked to highlights become embedded (via `note` field)
   * - Linked notes are removed as separate entries
   * - Unlinked notes are excluded from output
   * - Bookmarks are excluded from output
   * This is useful when you want processed output focused on what you
   * highlighted and your thoughts, not raw clipping data.
   * Default: false
   */
  highlightsOnly?: boolean;

  /**
   * Remove notes that have been linked to highlights from output.
   * When enabled, linked notes are "consumed" - their content remains
   * embedded in the highlight's `note` field, but they don't appear
   * as separate entries. Unlinked notes are preserved by default.
   * This is less aggressive than `highlightsOnly` which removes ALL
   * non-highlights.
   * Default: false
   */
  mergedOutput?: boolean;

  /**
   * Also remove notes that are not linked to any highlight.
   * Only has effect when `mergedOutput` is enabled.
   * Use this when you want to completely eliminate notes from output,
   * keeping only highlights with their embedded notes.
   * Default: false
   */
  removeUnlinkedNotes?: boolean;

  // ===== Normalization =====

  /** Apply Unicode NFC normalization. Default: true */
  normalizeUnicode?: boolean;

  /** Clean content (trim, collapse spaces). Default: true */
  cleanContent?: boolean;

  /** Clean titles (remove extensions, suffixes). Default: true */
  cleanTitles?: boolean;

  // ===== Filtering =====

  /** Types to exclude from results */
  excludeTypes?: ClippingType[];

  /** Books to exclude by title (case-insensitive) */
  excludeBooks?: string[];

  /** Only include these books (case-insensitive) */
  onlyBooks?: string[];

  /** Minimum content length to include */
  minContentLength?: number;

  // ===== Dates =====

  /** Locale for date parsing (e.g., 'en-US', 'es-ES') */
  dateLocale?: string;

  // ===== Location =====

  /**
   * Geographic location where the reading took place.
   * If provided, this will be included in exports for personal tracking.
   * Useful for Notion/Roam/Obsidian users who want location metadata.
   */
  geoLocation?: GeoLocation;

  // ===== Mode =====

  /** If true, throw on parsing errors. If false, collect warnings. Default: false */
  strict?: boolean;
}

/**
 * Options for processing clippings (post-parse).
 */
export interface ProcessOptions extends ParseOptions {
  /** The detected or specified language */
  detectedLanguage: SupportedLanguage;
}

// =============================================================================
// Parse Warnings
// =============================================================================

/**
 * Warning generated during parsing.
 */
export interface ParseWarning {
  /** Type of warning */
  type:
    | "date_parse_failed"
    | "unknown_format"
    | "encoding_issue"
    | "empty_content"
    | "unknown_type";

  /** Human-readable warning message */
  message: string;

  /** Index of the block that caused the warning */
  blockIndex: number;

  /** Raw content that caused the warning (if applicable) */
  raw?: string;
}

// =============================================================================
// Parse Result
// =============================================================================

/**
 * Result of parsing a Kindle clippings file.
 */
export interface ParseResult {
  /** Parsed and processed clippings */
  clippings: Clipping[];

  /** Statistics about the parsed clippings */
  stats: ClippingsStats;

  /** Warnings generated during parsing */
  warnings: ParseWarning[];

  /** Metadata about the parse operation */
  meta: {
    /** Original file size in bytes */
    fileSize: number;

    /** Time taken to parse in milliseconds */
    parseTime: number;

    /** Detected language of the file */
    detectedLanguage: SupportedLanguage;

    /** Number of raw blocks found */
    totalBlocks: number;

    /** Number of blocks successfully parsed */
    parsedBlocks: number;
  };
}
