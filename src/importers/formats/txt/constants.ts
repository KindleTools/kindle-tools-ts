/**
 * Language patterns and constants for Kindle clippings parsing.
 *
 * @packageDocumentation
 */

/**
 * Regular expression patterns for parsing.
 */
export const PATTERNS = {
  /** Separator between clippings (10 or more equals signs) */
  SEPARATOR: /={10,}/,

  /** Separator with surrounding newlines */
  SEPARATOR_WITH_NEWLINES: /\r?\n={10,}\r?\n/,

  /** Extract title and author: "Title (Author)" */
  TITLE_AUTHOR: /^(.+?)\s*\(([^)]+)\)\s*$/,

  /** Location range (e.g., "123-456") */
  LOCATION_RANGE: /(\d+)-(\d+)/,

  /** Single location (e.g., "123") */
  LOCATION_SINGLE: /(\d+)/,

  /** Page number */
  PAGE_NUMBER: /\d+/,
} as const;
