/**
 * Constants for Kindle clipping block structure.
 *
 * A Kindle clipping block has the following structure:
 * - Line 0: Title (Author)
 * - Line 1: - Your Highlight on page X | Location Y | Added on Date
 * - Line 2+: Content (may be empty for bookmarks)
 *
 * These constants make the structure explicit and easy to update
 * if Amazon changes the format.
 *
 * @packageDocumentation
 */

export const BLOCK_STRUCTURE = {
  /** Minimum lines required for a valid block (title + metadata) */
  MIN_BLOCK_LINES: 2,
  /** Line index where content starts (after title[0] and metadata[1]) */
  CONTENT_START_INDEX: 2,
  /** Index of title line */
  TITLE_LINE_INDEX: 0,
  /** Index of metadata line */
  METADATA_LINE_INDEX: 1,
} as const;
