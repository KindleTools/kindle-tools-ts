/**
 * Statistics for a single book.
 */
export interface BookStats {
  /** Book title */
  title: string;

  /** Author name */
  author: string;

  /** Number of highlights */
  highlights: number;

  /** Number of notes */
  notes: number;

  /** Number of bookmarks */
  bookmarks: number;

  /** Total word count across all clippings */
  wordCount: number;

  /** Date range of clippings */
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

/**
 * Aggregate statistics for all clippings.
 */
export interface ClippingsStats {
  // ===== Totals =====

  /** Total number of clippings */
  total: number;

  /** Total number of highlights */
  totalHighlights: number;

  /** Total number of notes */
  totalNotes: number;

  /** Total number of bookmarks */
  totalBookmarks: number;

  /** Total number of clips (web articles) */
  totalClips: number;

  // ===== Books =====

  /** Number of unique books */
  totalBooks: number;

  /** Number of unique authors */
  totalAuthors: number;

  /** Statistics per book */
  booksList: BookStats[];

  // ===== Processing =====

  /** Number of duplicates removed */
  duplicatesRemoved: number;

  /** Number of highlights merged */
  mergedHighlights: number;

  /** Number of notes linked to highlights */
  linkedNotes: number;

  /** Number of empty clippings removed */
  emptyRemoved: number;

  /** Number of clippings with DRM limit reached */
  drmLimitReached: number;

  // ===== Date Range =====

  /** Overall date range */
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };

  // ===== Content =====

  /** Total words across all clippings */
  totalWords: number;

  /** Average words per highlight */
  avgWordsPerHighlight: number;

  /** Average highlights per book */
  avgHighlightsPerBook: number;
}
