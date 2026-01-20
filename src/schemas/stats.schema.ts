/**
 * Zod validation schemas for statistics types.
 *
 * @packageDocumentation
 */

import { z } from "zod";

// =============================================================================
// Book Statistics Schema
// =============================================================================

/**
 * Statistics for a single book.
 */
export const BookStatsSchema = z.object({
  title: z.string().describe("Book title"),
  author: z.string().describe("Author name"),
  highlights: z.number().nonnegative().describe("Number of highlights"),
  notes: z.number().nonnegative().describe("Number of notes"),
  bookmarks: z.number().nonnegative().describe("Number of bookmarks"),
  wordCount: z.number().nonnegative().describe("Total word count across all clippings"),
  dateRange: z
    .object({
      earliest: z.date().nullable().describe("Earliest clipping date"),
      latest: z.date().nullable().describe("Latest clipping date"),
    })
    .describe("Date range of clippings"),
});

/**
 * Inferred BookStats type.
 */
export type BookStats = z.infer<typeof BookStatsSchema>;

// =============================================================================
// Clippings Statistics Schema
// =============================================================================

/**
 * Aggregate statistics for all clippings.
 */
export const ClippingsStatsSchema = z.object({
  // Totals
  total: z.number().nonnegative().describe("Total number of clippings"),
  totalHighlights: z.number().nonnegative().describe("Total number of highlights"),
  totalNotes: z.number().nonnegative().describe("Total number of notes"),
  totalBookmarks: z.number().nonnegative().describe("Total number of bookmarks"),
  totalClips: z.number().nonnegative().describe("Total number of clips (web articles)"),

  // Books
  totalBooks: z.number().nonnegative().describe("Number of unique books"),
  totalAuthors: z.number().nonnegative().describe("Number of unique authors"),
  booksList: z.array(BookStatsSchema).describe("Statistics per book"),

  // Processing
  duplicatesRemoved: z.number().nonnegative().describe("Number of duplicates removed"),
  mergedHighlights: z.number().nonnegative().describe("Number of highlights merged"),
  linkedNotes: z.number().nonnegative().describe("Number of notes linked to highlights"),
  emptyRemoved: z.number().nonnegative().describe("Number of empty clippings removed"),
  drmLimitReached: z.number().nonnegative().describe("Number of clippings with DRM limit reached"),

  // Date Range
  dateRange: z
    .object({
      earliest: z.date().nullable().describe("Earliest clipping date overall"),
      latest: z.date().nullable().describe("Latest clipping date overall"),
    })
    .describe("Overall date range"),

  // Content
  totalWords: z.number().nonnegative().describe("Total words across all clippings"),
  avgWordsPerHighlight: z.number().nonnegative().describe("Average words per highlight"),
  avgHighlightsPerBook: z.number().nonnegative().describe("Average highlights per book"),
});

/**
 * Inferred ClippingsStats type.
 */
export type ClippingsStats = z.infer<typeof ClippingsStatsSchema>;
