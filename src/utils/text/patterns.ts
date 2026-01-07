/**
 * Common regex patterns for text processing.
 *
 * @packageDocumentation
 */

/**
 * Byte Order Mark (BOM) at start of file
 */
export const BOM = /^\uFEFF/;

/**
 * Multiple consecutive spaces
 */
export const MULTIPLE_SPACES = /\s{2,}/g;

/**
 * Control characters to remove (U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F)
 */
export const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Non-breaking space
 */
export const NBSP = /\u00A0/g;

/**
 * Zero-width characters (ZWS, ZWNJ, ZWJ, BOM)
 */
export const ZERO_WIDTH = /(?:\u200B|\u200C|\u200D|\uFEFF)/g;
