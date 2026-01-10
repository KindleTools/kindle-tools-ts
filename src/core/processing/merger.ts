import type { Clipping } from "#app-types/clipping.js";
import { groupByBook } from "#domain/analytics/stats.js";

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
 * If merge is false, instead of merging, we FLAG the redundant highlighting
 * (the one that would have been absorbed) as 'overlapping'.
 *
 * @param clippings - Clippings to merge
 * @param merge - Whether to merge (true) or just flag (false)
 * @returns Merged (or flagged) clippings and count merged
 */
export function smartMergeHighlights(
  clippings: Clipping[],
  merge = true,
): {
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
        if (merge) {
          // Merge clipping into current
          current = mergeClippings(current, clipping);
          mergedCount++;
        } else {
          // Flagging Mode:
          // We identify which one would have been "absorbed" (the redundant one)
          // and mark it as suspicious.

          // Logic from mergeClippings: 'base' is the one we keep (longer content)
          // 'other' is the one we merge/discard.
          const isBase: boolean = current.content.length >= clipping.content.length;
          const redundant: Clipping = isBase ? clipping : current;
          const keeper: Clipping = isBase ? current : clipping;

          // Flag the redundant one
          const flaggedRedundant = {
            ...redundant,
            isSuspiciousHighlight: true,
            suspiciousReason: "overlapping" as const,
            possibleDuplicateOf: keeper.id,
          };

          // We add the redundant one to our list immediately (we don't merge it)
          merged.push(flaggedRedundant);

          // The keeper becomes the new 'current' for the next iteration comparison
          current = keeper;
        }
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
