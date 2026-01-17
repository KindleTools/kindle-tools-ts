import type { Clipping } from "#app-types/clipping.js";
import { groupByBook } from "#domain/analytics/stats.js";
import { ANALYSIS_THRESHOLDS, SUSPICIOUS_HIGHLIGHT_THRESHOLDS } from "#domain/rules.js";
import { jaccardSimilarity } from "#utils/text/similarity.js";

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
      /^[a-z\u00E1\u00E9\u00ED\u00F3\u00FA\u00F1\u00FC\u00E0\u00E8\u00EC\u00F2\u00F9\u00E2\u00EA\u00EE\u00F4\u00FB\u00E4\u00EB\u00EF\u00F6\u00E7]/i.test(
        firstChar,
      ) &&
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
  threshold: number = ANALYSIS_THRESHOLDS.DEFAULT_SIMILARITY_THRESHOLD,
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
