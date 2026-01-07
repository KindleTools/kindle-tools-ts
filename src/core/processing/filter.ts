import type { Clipping } from "#app-types/clipping.js";
import type { ProcessOptions } from "#app-types/config.js";

/**
 * Filter clippings based on basic criteria (type, content length, book title).
 *
 * @param clippings - Clippings to filter
 * @param options - Filtering options
 * @returns Filtered clippings
 */
export function filterClippings(
  clippings: Clipping[],
  options: ProcessOptions,
): { clippings: Clipping[] } {
  const result = clippings.filter((clipping) => {
    // Filter by type
    if (options.excludeTypes?.includes(clipping.type)) {
      return false;
    }

    // Filter by content length
    if (
      options.minContentLength &&
      clipping.content.length < options.minContentLength &&
      clipping.type !== "bookmark"
    ) {
      return false;
    }

    // Filter excluded books
    if (
      options.excludeBooks?.some((book) =>
        clipping.title.toLowerCase().includes(book.toLowerCase()),
      )
    ) {
      return false;
    }

    // Filter only specific books
    if (options.onlyBooks && options.onlyBooks.length > 0) {
      const matchesAny = options.onlyBooks.some((book) =>
        clipping.title.toLowerCase().includes(book.toLowerCase()),
      );
      if (!matchesAny) {
        return false;
      }
    }

    return true;
  });

  return { clippings: result };
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
