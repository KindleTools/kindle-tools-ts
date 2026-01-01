/**
 * Processor for Kindle clippings post-parse processing.
 *
 * This module provides:
 * - Deduplication (remove exact duplicates)
 * - Smart Merging (merge overlapping highlights)
 * - Note Linking (link notes to their parent highlights)
 * - Suspicious Highlight Detection (flag accidental/incomplete highlights)
 * - Fuzzy Duplicate Detection (flag near-duplicates using Jaccard similarity)
 *
 * @packageDocumentation
 */

import type { Clipping } from "../types/clipping.js";
import type { ProcessOptions } from "../types/config.js";
import { generateDuplicateHash } from "../utils/hashing.js";
import { jaccardSimilarity } from "../utils/similarity.js";
import { groupByBook } from "../utils/stats.js";
import { DEFAULT_SIMILARITY_THRESHOLD, SUSPICIOUS_HIGHLIGHT_THRESHOLDS } from "./constants.js";

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
}

/**
 * Process parsed clippings with deduplication, merging, linking, and quality flags.
 *
 * Processing order:
 * 1. Remove empty clippings (optional)
 * 2. Remove exact duplicates (optional)
 * 3. Smart merge overlapping highlights (optional)
 * 4. Link notes to highlights (optional)
 * 5. Flag suspicious highlights (always runs, just adds flags)
 * 6. Flag fuzzy duplicates (always runs, just adds flags)
 *
 * Note: Steps 5-6 never remove clippings, they only add flags.
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

  // Step 5: Flag suspicious highlights (always runs - just adds flags)
  const suspiciousResult = flagSuspiciousHighlights(result);
  result = suspiciousResult.clippings;
  suspiciousFlagged = suspiciousResult.flaggedCount;

  // Step 6: Flag fuzzy duplicates (always runs - just adds flags)
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
  };
}

/**
 * Remove exact duplicate clippings based on hash.
 *
 * A duplicate is determined by:
 * - Same title (case-insensitive)
 * - Same location
 * - Same content (case-insensitive)
 *
 * @param clippings - Clippings to deduplicate
 * @returns Deduplicated clippings and count removed
 */
export function removeDuplicates(clippings: Clipping[]): {
  clippings: Clipping[];
  removedCount: number;
} {
  const seen = new Set<string>();
  const unique: Clipping[] = [];

  for (const clipping of clippings) {
    const hash = generateDuplicateHash(clipping.title, clipping.location.raw, clipping.content);

    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(clipping);
    }
  }

  return {
    clippings: unique,
    removedCount: clippings.length - unique.length,
  };
}

/**
 * Smart merge overlapping highlights.
 *
 * When a user extends a highlight in Kindle, a NEW entry is created
 * instead of updating the old one. This creates "almost duplicate"
 * entries that should be merged.
 *
 * Strategy:
 * 1. Group highlights by book (title)
 * 2. Sort by location.start
 * 3. For each pair of consecutive highlights:
 *    - If locations overlap (A.end >= B.start - 1) AND
 *    - Content of A is substring of B (or vice versa)
 *    → Merge into single highlight keeping:
 *      - Longer content
 *      - Combined location range
 *      - More recent date
 *
 * @param clippings - Clippings to merge
 * @returns Merged clippings and count merged
 */
export function smartMergeHighlights(clippings: Clipping[]): {
  clippings: Clipping[];
  mergedCount: number;
} {
  const highlights = clippings.filter((c) => c.type === "highlight");
  const others = clippings.filter((c) => c.type !== "highlight");

  const bookGroups = groupByBook(highlights);
  const mergedHighlights: Clipping[] = [];
  let mergedCount = 0;

  for (const [, bookClippings] of bookGroups) {
    // Sort by location start
    const sorted = [...bookClippings].sort((a, b) => a.location.start - b.location.start);

    const merged: Clipping[] = [];
    let current: Clipping | null = null;

    for (const clipping of sorted) {
      if (!current) {
        current = clipping;
        continue;
      }

      // Check if clippings can be merged
      if (canMerge(current, clipping)) {
        // Merge clipping into current
        current = mergeClippings(current, clipping);
        mergedCount++;
      } else {
        // No overlap, push current and start new
        merged.push(current);
        current = clipping;
      }
    }

    // Don't forget the last one
    if (current) {
      merged.push(current);
    }

    mergedHighlights.push(...merged);
  }

  return {
    clippings: [...mergedHighlights, ...others],
    mergedCount,
  };
}

/**
 * Check if two highlights can be merged.
 */
function canMerge(a: Clipping, b: Clipping): boolean {
  // Must be same book (already grouped, but double-check)
  if (a.title.toLowerCase() !== b.title.toLowerCase()) {
    return false;
  }

  // Locations must overlap or be adjacent
  const aEnd = a.location.end ?? a.location.start;
  const bStart = b.location.start;

  // Allow 5-character gap for tolerance
  if (bStart > aEnd + 5) {
    return false;
  }

  // Content must be related (one is subset of other, or significant overlap)
  const aContent = a.content.toLowerCase();
  const bContent = b.content.toLowerCase();

  // One contains the other
  if (aContent.includes(bContent) || bContent.includes(aContent)) {
    return true;
  }

  // Significant word overlap (at least 50% of shorter content)
  const aWords = new Set(aContent.split(/\s+/));
  const bWords = new Set(bContent.split(/\s+/));
  const intersection = [...aWords].filter((w) => bWords.has(w));
  const minSize = Math.min(aWords.size, bWords.size);

  if (minSize > 0 && intersection.length >= minSize * 0.5) {
    return true;
  }

  return false;
}

/**
 * Merge two clippings into one.
 */
function mergeClippings(a: Clipping, b: Clipping): Clipping {
  // Keep the one with longer content as base
  const base = a.content.length >= b.content.length ? a : b;

  // Merge location range
  const startLoc = Math.min(a.location.start, b.location.start);
  const endLoc = Math.max(a.location.end ?? a.location.start, b.location.end ?? b.location.start);

  // Keep more recent date
  const date = a.date && b.date ? (a.date > b.date ? a.date : b.date) : (a.date ?? b.date);

  return {
    ...base,
    location: {
      raw: `${startLoc}-${endLoc}`,
      start: startLoc,
      end: endLoc,
    },
    date,
    dateRaw: date === a.date ? a.dateRaw : b.dateRaw,
    // Keep earlier blockIndex (original position)
    blockIndex: Math.min(a.blockIndex, b.blockIndex),
  };
}

/**
 * Link notes to their associated highlights.
 *
 * Notes in Kindle are stored as separate entries with similar
 * location as their parent highlight.
 *
 * Strategy:
 * 1. Group all clippings by book
 * 2. For each note, find highlight with:
 *    - Same book
 *    - Same or nearby location
 *    - Type = 'highlight'
 * 3. Link via linkedNoteId / linkedHighlightId
 * 4. Optionally merge note content into highlight's note field
 *
 * @param clippings - Clippings to link
 * @returns Linked clippings and count linked
 */
export function linkNotesToHighlights(clippings: Clipping[]): {
  clippings: Clipping[];
  linkedCount: number;
} {
  const notes = clippings.filter((c) => c.type === "note");
  const highlights = clippings.filter((c) => c.type === "highlight");
  const others = clippings.filter((c) => c.type !== "note" && c.type !== "highlight");

  const bookGroups = groupByBook(highlights);
  let linkedCount = 0;

  // Create map of linked notes by ID for quick lookup
  const linkedNoteIds = new Set<string>();

  for (const note of notes) {
    const bookKey = note.title.toLowerCase();
    const bookHighlights = bookGroups.get(bookKey);

    if (!bookHighlights) {
      continue;
    }

    // Find the highlight with the closest location
    let bestMatch: Clipping | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const highlight of bookHighlights) {
      const distance = Math.abs(highlight.location.start - note.location.start);

      // Match if within 10 locations (notes may be slightly offset)
      if (distance < bestDistance && distance <= 10) {
        bestDistance = distance;
        bestMatch = highlight;
      }
    }

    if (bestMatch) {
      // Link the note to the highlight
      note.linkedHighlightId = bestMatch.id;
      bestMatch.linkedNoteId = note.id;
      bestMatch.note = note.content;
      linkedNoteIds.add(note.id);
      linkedCount++;
    }
  }

  // Return all clippings, with links established
  return {
    clippings: [...highlights, ...notes, ...others],
    linkedCount,
  };
}

/**
 * Flag highlights that appear to be accidental or incomplete.
 *
 * These highlights are NOT removed, only flagged for user review.
 * The user has full control to decide what to do with them.
 *
 * Flagging criteria:
 * - 'too_short': Less than 5 characters (likely accidental tap)
 * - 'fragment': Short + starts with lowercase (mid-sentence fragment)
 * - 'incomplete': Short + no proper ending punctuation
 *
 * @param clippings - Clippings to flag
 * @returns Clippings with flags and count flagged
 */
export function flagSuspiciousHighlights(clippings: Clipping[]): {
  clippings: Clipping[];
  flaggedCount: number;
} {
  let flaggedCount = 0;

  const result = clippings.map((clipping) => {
    // Only check highlights (notes and bookmarks are intentional)
    if (clipping.type !== "highlight") {
      return clipping;
    }

    const text = clipping.content.trim();
    const length = text.length;

    // Check for garbage (very short)
    if (length < SUSPICIOUS_HIGHLIGHT_THRESHOLDS.GARBAGE_LENGTH) {
      flaggedCount++;
      return {
        ...clipping,
        isSuspiciousHighlight: true,
        suspiciousReason: "too_short" as const,
      };
    }

    // Skip further checks for longer content
    if (length >= SUSPICIOUS_HIGHLIGHT_THRESHOLDS.SHORT_LENGTH) {
      return clipping;
    }

    // Check for fragment (starts with lowercase)
    const firstChar = text[0];
    if (
      firstChar &&
      /^[a-záéíóúñüàèìòùâêîôûäëïöç]/i.test(firstChar) &&
      firstChar === firstChar.toLowerCase()
    ) {
      flaggedCount++;
      return {
        ...clipping,
        isSuspiciousHighlight: true,
        suspiciousReason: "fragment" as const,
      };
    }

    // Check for incomplete (no proper ending)
    if (!SUSPICIOUS_HIGHLIGHT_THRESHOLDS.VALID_ENDINGS.test(text)) {
      flaggedCount++;
      return {
        ...clipping,
        isSuspiciousHighlight: true,
        suspiciousReason: "incomplete" as const,
      };
    }

    return clipping;
  });

  return {
    clippings: result,
    flaggedCount,
  };
}

/**
 * Flag clippings that are possibly fuzzy duplicates of each other.
 *
 * Uses Jaccard similarity to detect near-duplicates - content that is
 * similar but not exactly identical (e.g., minor edits, typos, or
 * Kindle changing the exact selection).
 *
 * These clippings are NOT removed, only flagged with:
 * - `similarityScore`: The Jaccard similarity (0-1)
 * - `possibleDuplicateOf`: ID of the similar clipping
 *
 * @param clippings - Clippings to check
 * @param threshold - Similarity threshold (default: 0.8)
 * @returns Clippings with flags and count flagged
 */
export function flagFuzzyDuplicates(
  clippings: Clipping[],
  threshold = DEFAULT_SIMILARITY_THRESHOLD,
): {
  clippings: Clipping[];
  flaggedCount: number;
} {
  let flaggedCount = 0;

  // Group by book for efficiency (only compare within same book)
  const bookGroups = groupByBook(clippings.filter((c) => c.type === "highlight"));
  const flaggedIds = new Set<string>();
  const flagMap = new Map<string, { score: number; duplicateOf: string }>();

  for (const [, bookClippings] of bookGroups) {
    // Sort by location for consistent comparison
    const sorted = [...bookClippings].sort((a, b) => a.location.start - b.location.start);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (!current) continue;

      // Skip if already flagged as a duplicate
      if (flaggedIds.has(current.id)) continue;

      for (let j = i + 1; j < sorted.length; j++) {
        const other = sorted[j];
        if (!other) continue;

        // Skip if already flagged
        if (flaggedIds.has(other.id)) continue;

        // Only check clippings with nearby locations (performance optimization)
        if (other.location.start - (current.location.end ?? current.location.start) > 50) {
          break; // Locations too far apart, stop checking
        }

        const similarity = jaccardSimilarity(current.content, other.content);

        if (similarity >= threshold && similarity < 1.0) {
          // It's a fuzzy duplicate (not exact, but very similar)
          flaggedIds.add(other.id);
          flagMap.set(other.id, {
            score: similarity,
            duplicateOf: current.id,
          });
          flaggedCount++;
        }
      }
    }
  }

  // Apply flags to clippings
  const result = clippings.map((clipping) => {
    const flagInfo = flagMap.get(clipping.id);
    if (flagInfo) {
      return {
        ...clipping,
        similarityScore: flagInfo.score,
        possibleDuplicateOf: flagInfo.duplicateOf,
      };
    }
    return clipping;
  });

  return {
    clippings: result,
    flaggedCount,
  };
}
