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

import type { Clipping } from "../types/clipping.js";
import type { ProcessOptions } from "../types/config.js";
import { generateDuplicateHash } from "../utils/hashing.js";
import { jaccardSimilarity } from "../utils/similarity.js";
import { groupByBook } from "../utils/stats.js";
import { extractTagsFromNote } from "../utils/tag-extractor.js";
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

/**
 * Merge tags from source clipping into target clipping.
 *
 * @param target - Clipping to merge tags into
 * @param source - Clipping to merge tags from
 * @returns Target clipping with merged tags
 */
function mergeTags(target: Clipping, source: Clipping): Clipping {
  if (!source.tags?.length) {
    return target;
  }

  const existingTags = new Set(target.tags || []);
  const newTags = source.tags.filter((tag) => !existingTags.has(tag));

  if (newTags.length === 0) {
    return target;
  }

  return {
    ...target,
    tags: [...(target.tags || []), ...newTags],
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
 * When a duplicate is found, tags from the duplicate are merged
 * into the surviving clipping to preserve user categorization.
 *
 * @param clippings - Clippings to deduplicate
 * @returns Deduplicated clippings and count removed
 */
export function removeDuplicates(clippings: Clipping[]): {
  clippings: Clipping[];
  removedCount: number;
} {
  const seen = new Map<string, Clipping>();

  for (const clipping of clippings) {
    const hash = generateDuplicateHash(clipping.title, clipping.location.raw, clipping.content);
    const existing = seen.get(hash);

    if (existing) {
      // Merge tags from duplicate into survivor
      seen.set(hash, mergeTags(existing, clipping));
    } else {
      seen.set(hash, clipping);
    }
  }

  return {
    clippings: Array.from(seen.values()),
    removedCount: clippings.length - seen.size,
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
 *
 * Preserves:
 * - Longer content
 * - Combined location range
 * - More recent date
 * - Combined tags from both clippings
 * - Earlier block index
 */
function mergeClippings(a: Clipping, b: Clipping): Clipping {
  // Keep the one with longer content as base
  const base = a.content.length >= b.content.length ? a : b;
  const other = a.content.length >= b.content.length ? b : a;

  // Merge location range
  const startLoc = Math.min(a.location.start, b.location.start);
  const endLoc = Math.max(a.location.end ?? a.location.start, b.location.end ?? b.location.start);

  // Keep more recent date
  const date = a.date && b.date ? (a.date > b.date ? a.date : b.date) : (a.date ?? b.date);

  // Merge tags from both clippings
  const combinedTags =
    a.tags || b.tags ? [...new Set([...(a.tags || []), ...(b.tags || [])])] : undefined;

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
    // Preserve tags from both clippings
    ...(combinedTags && { tags: combinedTags }),
    // Preserve note if either has one
    ...(base.note || other.note ? { note: base.note || other.note } : {}),
  };
}

/**
 * Check if a note's location falls within a highlight's range.
 *
 * This is the primary matching strategy: a note at location X
 * belongs to a highlight if X is within [highlight.start, highlight.end].
 *
 * @param highlight - The highlight to check
 * @param noteLocation - The note's location start
 * @returns True if note is within highlight's range
 */
function isNoteWithinHighlightRange(highlight: Clipping, noteLocation: number): boolean {
  const start = highlight.location.start;
  const end = highlight.location.end ?? highlight.location.start;
  return start <= noteLocation && noteLocation <= end;
}

/**
 * Link notes to their associated highlights.
 *
 * Notes in Kindle are stored as separate entries. This function
 * links them to their parent highlights using a two-phase strategy:
 *
 * **Phase 1 - Range Coverage (Primary)**:
 * A note belongs to a highlight if the note's location falls within
 * the highlight's location range [start, end]. This is more accurate
 * for notes made at the end of long highlights.
 *
 * **Phase 2 - Proximity (Fallback)**:
 * If no range match is found, fall back to finding the highlight
 * with the closest location (within 10 positions).
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

    if (!bookHighlights || !note.location.start) {
      continue;
    }

    const noteLocation = note.location.start;
    let bestMatch: Clipping | null = null;

    // Phase 1: Try range coverage first (more accurate)
    // Find highlight whose range contains the note's location
    for (const highlight of bookHighlights) {
      if (isNoteWithinHighlightRange(highlight, noteLocation)) {
        // If multiple highlights contain this location, prefer the one
        // with the closest start (most specific match)
        if (
          !bestMatch ||
          Math.abs(highlight.location.start - noteLocation) <
            Math.abs(bestMatch.location.start - noteLocation)
        ) {
          bestMatch = highlight;
        }
      }
    }

    // Phase 2: Fall back to proximity if no range match
    if (!bestMatch) {
      let bestDistance = Number.POSITIVE_INFINITY;
      const MAX_DISTANCE = 10;

      for (const highlight of bookHighlights) {
        const distance = Math.abs(highlight.location.start - noteLocation);

        if (distance < bestDistance && distance <= MAX_DISTANCE) {
          bestDistance = distance;
          bestMatch = highlight;
        }
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

/**
 * Extract tags from linked notes and assign them to highlights.
 *
 * This function looks for highlights that have a linked note (`note` field),
 * parses the note content for tags (comma/semicolon/newline separated),
 * and assigns them to the highlight's `tags` field.
 *
 * This is useful for users who use their Kindle notes as a tagging system:
 * - Make a highlight
 * - Add a note with tags: "productivity, psychology, habits"
 *
 * @param clippings - Clippings to process
 * @returns Clippings with tags and extraction count
 */
export function extractTagsFromLinkedNotes(
  clippings: Clipping[],
  tagCase?: "original" | "uppercase" | "lowercase",
): {
  clippings: Clipping[];
  extractedCount: number;
} {
  let extractedCount = 0;

  const result = clippings.map((clipping) => {
    // Only process highlights with linked notes
    if (clipping.type !== "highlight" || !clipping.note) {
      return clipping;
    }

    // Extract tags from the note content
    const extraction = extractTagsFromNote(clipping.note, tagCase ? { tagCase } : {});

    if (extraction.hasTags) {
      extractedCount++;
      return {
        ...clipping,
        tags: extraction.tags,
      };
    }

    return clipping;
  });

  return {
    clippings: result,
    extractedCount,
  };
}

/**
 * Filter clippings to return only highlights with embedded notes.
 *
 * When `highlightsOnly` mode is enabled, the output focuses on what the user
 * highlighted and their associated thoughts, rather than raw clipping data:
 * - Notes linked to highlights are already embedded via the `note` field
 * - Standalone notes (linked or not) are removed from output
 * - Bookmarks are removed from output
 * - Only highlights remain, with their notes and tags embedded
 *
 * This is useful for users who want a clean, processed view:
 * "What did I highlight, and what were my thoughts?"
 *
 * @param clippings - Clippings to filter
 * @returns Filtered clippings (highlights only) and count filtered
 */
export function filterToHighlightsOnly(clippings: Clipping[]): {
  clippings: Clipping[];
  filteredCount: number;
} {
  const highlights = clippings.filter((c) => c.type === "highlight");
  const filteredCount = clippings.length - highlights.length;

  return {
    clippings: highlights,
    filteredCount,
  };
}
