import type { Clipping } from "#app-types/clipping.js";
import { extractTagsFromNote } from "#domain/parsing/tags.js";

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
