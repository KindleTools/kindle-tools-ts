import type { Clipping } from "#app-types/clipping.js";
import { generateDuplicateHash } from "#domain/identity.js";

/**
 * Merge tags from source clipping into target clipping.
 *
 * @param target - Clipping to merge tags into
 * @param source - Clipping to merge tags from
 * @returns Target clipping with merged tags
 */
export function mergeTags(target: Clipping, source: Clipping): Clipping {
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
 * Strategy: "Last Wins"
 * When a duplicate is found, we assume the later entry is a correction
 * or refinement by the user. Therefore, we keep the NEW entry and
 * discard the OLD one (merging tags from old to new).
 *
 * If removeDuplicates option is false. duplicates are NOT removed but
 * flagged as 'exact_duplicate'.
 *
 * @param clippings - Clippings to deduplicate
 * @param remove - Whether to remove duplicates (true) or just flag them (false)
 * @returns Deduplicated (or flagged) clippings and count affected
 */
export function removeDuplicates(
  clippings: Clipping[],
  remove = true,
): {
  clippings: Clipping[];
  removedCount: number;
} {
  const seen = new Map<string, Clipping>();
  const flaggedClippings: Clipping[] = [];

  for (const clipping of clippings) {
    const hash = generateDuplicateHash(clipping.title, clipping.location.raw, clipping.content);
    const existing = seen.get(hash);

    if (existing) {
      if (remove) {
        // "Last Wins" Strategy:
        // The current 'clipping' is later in the file, so it's the "newer" version.
        // We replace the 'existing' (older) one with this new one.
        // But first, rescue any tags from the old one.
        const merged = mergeTags(clipping, existing);
        seen.set(hash, merged);
      } else {
        // Flagging Mode:
        // We keep BOTH. The 'existing' one is the older duplicate, so we flag it.
        // The 'clipping' (newer) remains clean (until it potentially becomes a duplicate of an even later one).

        // 1. Mark the OLD one as a duplicate
        const flaggedExisting = {
          ...existing,
          isSuspiciousHighlight: true,
          suspiciousReason: "exact_duplicate" as const,
          possibleDuplicateOf: clipping.id, // Point to the newer version
        };

        // 2. Move the flagged old one to our "done" list (it won't be in 'seen' anymore to avoid double counting)
        flaggedClippings.push(flaggedExisting);

        // 3. Put the NEW one in 'seen' as the current "clean" version (candidate for future duplication)
        seen.set(hash, clipping);
      }
    } else {
      // First time seeing this content
      seen.set(hash, clipping);
    }
  }

  // Combine the "clean" unique/latest versions with the flagged duplicates (if any)
  // We sort by blockIndex to restore original file order loosely
  const result = [...Array.from(seen.values()), ...flaggedClippings].sort(
    (a, b) => a.blockIndex - b.blockIndex,
  );

  return {
    clippings: result,
    removedCount: clippings.length - seen.size,
  };
}
