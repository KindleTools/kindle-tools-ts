import type { Clipping } from "#app-types/clipping.js";

/**
 * Options for removing linked notes.
 */
export interface RemoveLinkedNotesOptions {
  /**
   * Also remove notes that are not linked to any highlight.
   * Default: false (keep unlinked notes)
   */
  removeUnlinked?: boolean;
}

/**
 * Remove notes that have been linked to highlights from output.
 *
 * After linking (via `linkNotesToHighlights`), notes have their content
 * embedded in the highlight's `note` field. This function removes those
 * linked notes from the output array to create a cleaner result without
 * duplicate information.
 *
 * By default, unlinked notes (those without `linkedHighlightId`) are preserved,
 * as they may contain important standalone thoughts that didn't match
 * any highlight. Use `removeUnlinked: true` to also remove these.
 *
 * This is less aggressive than `highlightsOnly` which removes ALL
 * non-highlights (notes, bookmarks, clips).
 *
 * @param clippings - Clippings to process (should be run after linking)
 * @param options - Options for note removal
 * @returns Clippings with linked notes removed and count consumed
 *
 * @example
 * ```typescript
 * // After linking notes to highlights
 * const { clippings, consumedCount } = removeLinkedNotes(linkedClippings);
 * console.log(`Consumed ${consumedCount} notes into highlights`);
 *
 * // Also remove unlinked notes
 * const result = removeLinkedNotes(linkedClippings, { removeUnlinked: true });
 * ```
 */
export function removeLinkedNotes(
  clippings: Clipping[],
  options: RemoveLinkedNotesOptions = {},
): {
  clippings: Clipping[];
  consumedCount: number;
} {
  const { removeUnlinked = false } = options;
  let consumedCount = 0;

  const result = clippings.filter((clipping) => {
    // Keep all non-note types (highlights, bookmarks, clips, articles)
    if (clipping.type !== "note") {
      return true;
    }

    // Handle unlinked notes based on option
    if (!clipping.linkedHighlightId) {
      if (removeUnlinked) {
        consumedCount++;
        return false;
      }
      return true;
    }

    // Remove linked notes - their content is already embedded in highlights
    consumedCount++;
    return false;
  });

  return {
    clippings: result,
    consumedCount,
  };
}
