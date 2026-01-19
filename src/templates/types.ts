/**
 * Template-related type definitions.
 *
 * @packageDocumentation
 */

/**
 * Available template presets.
 */
export type TemplatePreset =
  | "default"
  | "minimal"
  | "obsidian"
  | "notion"
  | "academic"
  | "compact"
  | "verbose"
  | "joplin";

/**
 * Template preset collections.
 */
export interface TemplateCollection {
  clipping: string;
  book: string;
  export: string;
}

/**
 * User-provided custom templates.
 */
export interface CustomTemplates {
  /** Template for a single clipping */
  clipping?: string;
  /** Template for a book (collection of clippings) */
  book?: string;
  /** Template for full export */
  export?: string;
  /** Template for clipping note title (default: "[{{page}}] {{snippet}}") */
  clippingTitle?: string;
  /** Template for book note title (default: "{{title}}") */
  bookTitle?: string;
}

/**
 * Available template types.
 */
export type TemplateType = "clipping" | "book" | "export" | "clippingTitle" | "bookTitle";

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context for rendering a single clipping.
 */
export interface ClippingContext {
  /** Book title */
  title: string;
  /** Author name */
  author: string;
  /** Clipping content text */
  content: string;
  /** Clipping type: highlight, note, bookmark */
  type: string;
  /** Page number (or "?" if unknown) */
  page: string;
  /** Location raw string (e.g., "105-106") */
  location: string;
  /** Location start number */
  locationStart: number;
  /** Location end number (same as start if single) */
  locationEnd: number;
  /** Formatted date string */
  date: string;
  /** ISO date string */
  dateIso: string;
  /** Linked note content (if any) */
  note: string;
  /** Tags array */
  tags: string[];
  /** Tags as comma-separated string */
  tagsString: string;
  /** Tags as hashtags (e.g., "#tag1 #tag2") */
  tagsHashtags: string;
  /** Word count */
  wordCount: number;
  /** Character count */
  charCount: number;
  /** Book source: kindle or sideload */
  source: string;
  /** True if DRM limit was reached */
  isLimitReached: boolean;
  /** True if content is empty */
  isEmpty: boolean;
  /** True if has a linked note */
  hasNote: boolean;
  /** True if has tags */
  hasTags: boolean;
}

/**
 * Template rendering options.
 * Used by the `opt` helper: {{#if (opt "wikilinks")}}
 */
export interface TemplateOptions {
  /** Use Obsidian-style wiki links for authors: [[Author Name]] */
  wikilinks?: boolean;
  /** Use Obsidian callout syntax for quotes */
  useCallouts?: boolean;
  /** Include page numbers in output */
  includePageNumbers?: boolean;
  /** Include location in output */
  includeLocation?: boolean;
  /** Include date in output */
  includeDate?: boolean;
  /** Custom options for user templates */
  [key: string]: boolean | string | number | undefined;
}

/**
 * Context for rendering a book (group of clippings).
 */
export interface BookContext {
  /** Book title */
  title: string;
  /** Author name */
  author: string;
  /** All clippings for this book */
  clippings: ClippingContext[];
  /** Only highlights */
  highlights: ClippingContext[];
  /** Only notes */
  notes: ClippingContext[];
  /** Only bookmarks */
  bookmarks: ClippingContext[];
  /** Total clipping count */
  totalClippings: number;
  /** Highlight count */
  highlightCount: number;
  /** Note count */
  noteCount: number;
  /** Bookmark count */
  bookmarkCount: number;
  /** Current date (formatted) */
  exportDate: string;
  /** Current date (ISO) */
  exportDateIso: string;
  /** All unique tags from clippings */
  tags: string[];
  /** True if book has any tags */
  hasTags: boolean;
  /** Template rendering options (for opt helper) */
  options?: TemplateOptions;
}

/**
 * Context for rendering a full export (all books).
 */
export interface ExportContext {
  /** All books */
  books: BookContext[];
  /** Total book count */
  bookCount: number;
  /** Total clipping count */
  totalClippings: number;
  /** Total highlight count */
  totalHighlights: number;
  /** Total note count */
  totalNotes: number;
  /** Total bookmark count */
  totalBookmarks: number;
  /** Export date (formatted) */
  exportDate: string;
  /** Export date (ISO) */
  exportDateIso: string;
  /** Custom title provided by user */
  title?: string;
  /** Template rendering options (for opt helper) */
  options?: TemplateOptions;
}
