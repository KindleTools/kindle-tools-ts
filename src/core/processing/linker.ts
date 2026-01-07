import type { Clipping } from "#app-types/clipping.js";
import { groupByBook } from "#domain/stats.js";

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
