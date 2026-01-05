/**
 * Type of clipping from Kindle.
 */
export type ClippingType = "highlight" | "note" | "bookmark" | "clip" | "article";

/**
 * Structured location information.
 */
export interface ClippingLocation {
  /** Raw location string (e.g., "105-106" or "105") */
  raw: string;

  /** Start location as number */
  start: number;

  /** End location as number (null if single location) */
  end: number | null;
}

/**
 * Raw clipping before processing.
 * Contains data directly extracted from the file.
 */
export interface RawClipping {
  /** Raw title line including author */
  titleLine: string;

  /** Raw metadata line (type, page, location, date) */
  metadataLine: string;

  /** Raw content lines */
  contentLines: string[];

  /** Index of this block in the original file */
  blockIndex: number;
}

/**
 * Processed clipping with all extracted and normalized data.
 *
 * This is the main data structure representing a single highlight,
 * note, bookmark, or clip extracted from a Kindle device.
 */
export interface Clipping {
  // ===== Identification =====

  /** Unique deterministic ID (12 alphanumeric characters) */
  id: string;

  // ===== Book and Author =====

  /** Clean, normalized book title */
  title: string;

  /** Original title as it appears in the file */
  titleRaw: string;

  /** Extracted and normalized author name */
  author: string;

  /** Original author as it appears in the file */
  authorRaw: string;

  // ===== Content =====

  /** Clean, normalized content */
  content: string;

  /** Original content as it appears in the file */
  contentRaw: string;

  // ===== Type =====

  /** Type of clipping */
  type: ClippingType;

  // ===== Location =====

  /** Page number (null if not available) */
  page: number | null;

  /** Location in the book */
  location: ClippingLocation;

  // ===== Date =====

  /** Parsed date (null if parsing failed) */
  date: Date | null;

  /** Original date string from the file */
  dateRaw: string;

  // ===== Flags =====

  /** True if DRM clipping limit was reached */
  isLimitReached: boolean;

  /** True if content is empty */
  isEmpty: boolean;

  /** Detected language of this entry's metadata */
  language: import("./language.js").SupportedLanguage;

  /** Source of the book: Amazon or sideloaded */
  source: "kindle" | "sideload";

  // ===== Statistics =====

  /** Number of words in content */
  wordCount: number;

  /** Number of characters in content */
  charCount: number;

  // ===== Linking =====

  /** ID of associated note (if this is a highlight with a note) */
  linkedNoteId?: string;

  /** ID of associated highlight (if this is a note) */
  linkedHighlightId?: string;

  /** Content of linked note (if mergeNotes is enabled) */
  note?: string;

  /**
   * Tags extracted from the linked note.
   * Only present if extractTags option is enabled during processing.
   * Extracted from notes that contain comma/semicolon/newline separated words.
   */
  tags?: string[];

  // ===== Metadata =====

  /** Index of the original block in the file */
  blockIndex: number;

  // ===== Quality Assessment =====

  /**
   * True if this highlight is suspected to be accidental or incomplete.
   * The user should review these manually.
   */
  isSuspiciousHighlight?: boolean;

  /**
   * Reason why the highlight was flagged as suspicious.
   * - 'too_short': Content is less than 5 characters (likely accidental selection)
   * - 'fragment': Short content starting with lowercase (likely mid-sentence)
   * - 'incomplete': Short content without proper ending punctuation
   */
  suspiciousReason?: "too_short" | "fragment" | "incomplete" | "exact_duplicate" | "overlapping";

  /**
   * Similarity score with another clipping (0-1).
   * Only present if fuzzy duplicate detection found a match.
   */
  similarityScore?: number;

  /**
   * ID of a clipping this one is possibly a duplicate of.
   * Uses Jaccard similarity > 0.8 for detection.
   */
  possibleDuplicateOf?: string;

  /**
   * True if the title was cleaned (edition markers removed, etc).
   * Compare 'title' vs 'titleRaw' to see what changed.
   */
  titleWasCleaned?: boolean;

  /**
   * True if the content was cleaned (de-hyphenation, spacing fixes, etc).
   * Compare 'content' vs 'contentRaw' to see what changed.
   */
  contentWasCleaned?: boolean;
}
