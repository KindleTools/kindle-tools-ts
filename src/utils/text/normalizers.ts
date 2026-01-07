/**
 * Text normalization utilities.
 *
 * @packageDocumentation
 */

import * as Patterns from "./patterns.js";

/**
 * Apply Unicode NFC normalization to text.
 *
 * This is CRITICAL for avoiding phantom duplicates where visually
 * identical characters have different binary representations.
 *
 * @example
 * "café" can be written as:
 * - "café" (é as single character U+00E9)
 * - "café" (e + combining acute accent U+0301)
 *
 * NFC unifies them to the composed form.
 *
 * @param text - Text to normalize
 * @returns NFC normalized text
 */
export function normalizeUnicode(text: string): string {
  return text.normalize("NFC");
}

/**
 * Remove BOM (Byte Order Mark) from the start of text.
 *
 * The BOM is an invisible character (U+FEFF) that some editors add.
 *
 * @param text - Text that may contain BOM
 * @returns Text without BOM
 */
export function removeBOM(text: string): string {
  return text.replace(Patterns.BOM, "");
}

/**
 * Normalize line endings to Unix style (\n).
 *
 * Kindle may use \r\n (Windows) or \n (Unix).
 *
 * @param text - Text with mixed line endings
 * @returns Text with Unix line endings
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Normalize whitespace: trim, collapse multiple spaces,
 * convert non-breaking spaces to regular spaces.
 *
 * @param text - Text with irregular whitespace
 * @returns Text with normalized whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(Patterns.NBSP, " ") // Non-breaking space to regular space
    .replace(Patterns.MULTIPLE_SPACES, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Remove invisible control characters that can cause issues.
 *
 * @param text - Text with potential control characters
 * @returns Clean text
 */
export function removeControlCharacters(text: string): string {
  return text.replace(Patterns.CONTROL_CHARS, "").replace(Patterns.ZERO_WIDTH, "");
}

/**
 * Full text normalization pipeline.
 *
 * Applies all normalizations in the correct order:
 * 1. Remove BOM
 * 2. Normalize line endings
 * 3. Apply Unicode NFC
 * 4. Remove control characters
 * 5. Normalize whitespace
 *
 * @param text - Raw text
 * @returns Fully normalized text
 */
export function normalizeText(text: string): string {
  let result = text;

  result = removeBOM(result);
  result = normalizeLineEndings(result);
  result = normalizeUnicode(result);
  result = removeControlCharacters(result);
  result = normalizeWhitespace(result);

  return result;
}
