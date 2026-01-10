/**
 * Statistics utilities for clippings analysis.
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import type { BookStats, ClippingsStats } from "#app-types/stats.js";

/**
 * Calculate comprehensive statistics for clippings.
 *
 * @param clippings - Array of clippings to analyze
 * @returns Complete statistics
 */
export function calculateStats(clippings: Clipping[]): ClippingsStats {
  const bookMap = groupByBook(clippings);
  const booksList: BookStats[] = [];

  let totalWords = 0;
  let totalHighlights = 0;
  let totalNotes = 0;
  let totalBookmarks = 0;
  let totalClips = 0;
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  const uniqueAuthors = new Set<string>();

  for (const [, bookClippings] of bookMap) {
    const firstClipping = bookClippings[0];
    if (!firstClipping) continue;

    const bookStats: BookStats = {
      title: firstClipping.title,
      author: firstClipping.author,
      highlights: 0,
      notes: 0,
      bookmarks: 0,
      wordCount: 0,
      dateRange: { earliest: null, latest: null },
    };

    uniqueAuthors.add(firstClipping.author);

    for (const clipping of bookClippings) {
      // Count by type
      switch (clipping.type) {
        case "highlight":
          bookStats.highlights++;
          totalHighlights++;
          break;
        case "note":
          bookStats.notes++;
          totalNotes++;
          break;
        case "bookmark":
          bookStats.bookmarks++;
          totalBookmarks++;
          break;
        case "clip":
        case "article":
          totalClips++;
          break;
      }

      // Word count
      bookStats.wordCount += clipping.wordCount;
      totalWords += clipping.wordCount;

      // Date range
      if (clipping.date) {
        if (!bookStats.dateRange.earliest || clipping.date < bookStats.dateRange.earliest) {
          bookStats.dateRange.earliest = clipping.date;
        }
        if (!bookStats.dateRange.latest || clipping.date > bookStats.dateRange.latest) {
          bookStats.dateRange.latest = clipping.date;
        }
        if (!earliestDate || clipping.date < earliestDate) {
          earliestDate = clipping.date;
        }
        if (!latestDate || clipping.date > latestDate) {
          latestDate = clipping.date;
        }
      }
    }

    booksList.push(bookStats);
  }

  // Sort books by number of highlights (descending)
  booksList.sort((a, b) => b.highlights - a.highlights);

  return {
    total: clippings.length,
    totalHighlights,
    totalNotes,
    totalBookmarks,
    totalClips,
    totalBooks: bookMap.size,
    totalAuthors: uniqueAuthors.size,
    booksList,
    duplicatesRemoved: 0, // Set by processor
    mergedHighlights: 0, // Set by processor
    linkedNotes: 0, // Set by processor
    emptyRemoved: 0, // Set by processor
    drmLimitReached: clippings.filter((c) => c.isLimitReached).length,
    dateRange: { earliest: earliestDate, latest: latestDate },
    totalWords,
    avgWordsPerHighlight: totalHighlights > 0 ? Math.round(totalWords / totalHighlights) : 0,
    avgHighlightsPerBook: bookMap.size > 0 ? Math.round(totalHighlights / bookMap.size) : 0,
  };
}

/**
 * Group clippings by book title.
 *
 * @param clippings - Array of clippings
 * @returns Map of title to clippings array
 */
export function groupByBook(clippings: Clipping[]): Map<string, Clipping[]> {
  const map = new Map<string, Clipping[]>();

  for (const clipping of clippings) {
    const key = clipping.title.toLowerCase();
    const existing = map.get(key);

    if (existing) {
      existing.push(clipping);
    } else {
      map.set(key, [clipping]);
    }
  }

  return map;
}
