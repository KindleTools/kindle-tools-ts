/**
 * Processor for Kindle clippings post-parse processing.
 *
 * This module provides:
 * - Deduplication (remove exact duplicates)
 * - Smart Merging (merge overlapping highlights)
 * - Note Linking (link notes to their parent highlights)
 * - Tag Extraction (extract tags from notes)
 * - Suspicious Highlight Detection (flag accidental/incomplete highlights)
 * - Fuzzy Duplicate Detection (flag near-duplicates using Jaccard similarity)
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import type { ProcessOptions } from "#app-types/config.js";
import { removeDuplicates } from "./processing/deduplicator.js";
import { filterClippings, filterToHighlightsOnly } from "./processing/filter.js";
import { linkNotesToHighlights } from "./processing/linker.js";
import { smartMergeHighlights } from "./processing/merger.js";
import { flagFuzzyDuplicates, flagSuspiciousHighlights } from "./processing/quality.js";
import { extractTagsFromLinkedNotes } from "./processing/tag-processor.js";

export { mergeTags, removeDuplicates } from "./processing/deduplicator.js";
export { filterClippings, filterToHighlightsOnly } from "./processing/filter.js";
export { linkNotesToHighlights } from "./processing/linker.js";
export { smartMergeHighlights } from "./processing/merger.js";
// Re-export specific processing steps for granular use
export { flagFuzzyDuplicates, flagSuspiciousHighlights } from "./processing/quality.js";
export { extractTagsFromLinkedNotes } from "./processing/tag-processor.js";

/**
 * Result of the processing operation.
 */
export interface ProcessResult {
  /** Processed clippings */
  clippings: Clipping[];

  /** Number of duplicates removed */
  duplicatesRemoved: number;

  /** Number of highlights merged */
  mergedHighlights: number;

  /** Number of notes linked to highlights */
  linkedNotes: number;

  /** Number of empty clippings removed */
  emptyRemoved: number;

  /** Number of highlights flagged as suspicious */
  suspiciousFlagged: number;

  /** Number of clippings flagged as possible fuzzy duplicates */
  fuzzyDuplicatesFlagged: number;

  /** Number of highlights with tags extracted from notes */
  tagsExtracted: number;

  /** Number of notes/bookmarks filtered when highlightsOnly is enabled */
  filteredForHighlightsOnly: number;
}

/**
 * Process parsed clippings with deduplication, merging, linking, and quality flags.
 *
 * Processing order:
 * 1. Remove empty clippings (optional)
 * 2. Remove exact duplicates (optional)
 * 3. Smart merge overlapping highlights (optional)
 * 4. Link notes to highlights (optional)
 * 5. Extract tags from notes (optional)
 * 6. Filter to highlights only (optional) - removes notes and bookmarks
 * 7. Flag suspicious highlights (always runs, just adds flags)
 * 8. Flag fuzzy duplicates (always runs, just adds flags)
 *
 * Note: Steps 7-8 never remove clippings, they only add flags.
 * The user has full control to filter based on these flags.
 *
 * @param clippings - Raw parsed clippings
 * @param options - Processing options
 * @returns Processed clippings with metadata
 *
 * @example
 * ```typescript
 * const result = process(clippings, { detectedLanguage: "en" });
 * console.log(`Removed ${result.duplicatesRemoved} duplicates`);
 * console.log(`Flagged ${result.suspiciousFlagged} suspicious highlights`);
 * ```
 */
export function process(clippings: Clipping[], options?: ProcessOptions): ProcessResult {
  let result = [...clippings];
  let emptyRemoved = 0;
  let duplicatesRemoved = 0;
  let mergedHighlights = 0;
  let linkedNotes = 0;
  let suspiciousFlagged = 0;
  let fuzzyDuplicatesFlagged = 0;
  let tagsExtracted = 0;
  let filteredForHighlightsOnly = 0;

  // Step 0: Apply basic filtering (type, length, books)
  if (options) {
    const filterResult = filterClippings(result, options);
    result = filterResult.clippings;
    // We don't track excluded counts explicitly in the result stats yet,
    // but this ensures consistency across all importers.
  }

  // Step 1: Remove empty clippings
  const originalCount = result.length;
  result = result.filter((c) => !c.isEmpty || c.type === "bookmark");
  emptyRemoved = originalCount - result.length;

  // Step 2: Remove duplicates (default: true)
  if (options?.removeDuplicates !== false) {
    const dedupeResult = removeDuplicates(result);
    result = dedupeResult.clippings;
    duplicatesRemoved = dedupeResult.removedCount;
  }

  // Step 3: Smart merge overlapping highlights (default: true)
  if (options?.mergeOverlapping !== false) {
    const mergeResult = smartMergeHighlights(result);
    result = mergeResult.clippings;
    mergedHighlights = mergeResult.mergedCount;
  }

  // Step 4: Link notes to highlights (default: true)
  if (options?.mergeNotes !== false) {
    const linkResult = linkNotesToHighlights(result);
    result = linkResult.clippings;
    linkedNotes = linkResult.linkedCount;
  }

  // Step 5: Extract tags from notes (optional, default: false)
  if (options?.extractTags) {
    const tagResult = extractTagsFromLinkedNotes(result, options.tagCase);
    result = tagResult.clippings;
    tagsExtracted = tagResult.extractedCount;
  }

  // Step 6: Filter to highlights only (optional, default: false)
  // When enabled, returns only highlights with embedded notes (removes notes/bookmarks)
  if (options?.highlightsOnly) {
    const filterResult = filterToHighlightsOnly(result);
    result = filterResult.clippings;
    filteredForHighlightsOnly = filterResult.filteredCount;
  }

  // Step 7: Flag suspicious highlights (always runs - just adds flags)
  const suspiciousResult = flagSuspiciousHighlights(result);
  result = suspiciousResult.clippings;
  suspiciousFlagged = suspiciousResult.flaggedCount;

  // Step 8: Flag fuzzy duplicates (always runs - just adds flags)
  const fuzzyResult = flagFuzzyDuplicates(result);
  result = fuzzyResult.clippings;
  fuzzyDuplicatesFlagged = fuzzyResult.flaggedCount;

  return {
    clippings: result,
    duplicatesRemoved,
    mergedHighlights,
    linkedNotes,
    emptyRemoved,
    suspiciousFlagged,
    fuzzyDuplicatesFlagged,
    tagsExtracted,
    filteredForHighlightsOnly,
  };
}
