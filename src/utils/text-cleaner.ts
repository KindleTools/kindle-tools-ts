/**
 * Advanced text cleaning utilities.
 *
 * These functions perform deeper text cleaning beyond basic normalization,
 * handling common issues from PDF extraction and Kindle quirks.
 *
 * @packageDocumentation
 */

/**
 * Result of text cleaning with metadata.
 */
export interface TextCleaningResult {
  /** Cleaned text */
  text: string;

  /** True if any cleaning was performed */
  wasCleaned: boolean;

  /** Which cleaning operations were applied */
  appliedOperations: CleaningOperation[];
}

/**
 * Types of cleaning operations that can be applied.
 */
export type CleaningOperation =
  | "dehyphenation"
  | "space_before_punctuation"
  | "multiple_spaces"
  | "invisible_chars"
  | "capitalize_first";

/**
 * Clean text with advanced operations.
 *
 * This function applies PDF-specific fixes like de-hyphenation,
 * removes spaces before punctuation, and other hygiene operations.
 *
 * The original text is preserved separately so users can always
 * compare and decide which version to use.
 *
 * @param text - Raw text to clean
 * @returns Cleaned text with metadata about what changed
 *
 * @example
 * ```typescript
 * const result = cleanText("some-\nthing went wrong .");
 * // result.text = "something went wrong."
 * // result.wasCleaned = true
 * // result.appliedOperations = ["dehyphenation", "space_before_punctuation"]
 * ```
 */
export function cleanText(text: string): TextCleaningResult {
  let result = text;
  const appliedOperations: CleaningOperation[] = [];

  // Track original to detect changes
  const original = text;

  // 1. De-hyphenation (PDF line breaks)
  // Pattern: letter-space?newline-space?letter
  // "word-\n suffix" → "wordsuffix"
  // Using Unicode letter class for international support
  const dehyphenated = result.replace(
    /([a-zA-ZáéíóúñüÁÉÍÓÚÑÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöÄËÏÖçÇ]+)-\s*\n\s*([a-zA-ZáéíóúñüÁÉÍÓÚÑÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöÄËÏÖçÇ]+)/g,
    "$1$2",
  );
  if (dehyphenated !== result) {
    result = dehyphenated;
    appliedOperations.push("dehyphenation");
  }

  // 2. Remove spaces before punctuation
  // "Hello ." → "Hello."
  // "Word ," → "Word,"
  const spacePunctFixed = result.replace(/\s+([.,;:!?])/g, "$1");
  if (spacePunctFixed !== result) {
    result = spacePunctFixed;
    appliedOperations.push("space_before_punctuation");
  }

  // 3. Collapse multiple spaces
  const spacesCollapsed = result.replace(/ {2,}/g, " ");
  if (spacesCollapsed !== result) {
    result = spacesCollapsed;
    appliedOperations.push("multiple_spaces");
  }

  // 4. Remove invisible characters inside text
  // (BOM and zero-width spaces that might appear mid-text)
  const invisibleRemoved = result
    .replace(/\ufeff/g, "")
    .replace(/\u200b/g, "")
    .replace(/\u200c/g, "")
    .replace(/\u200d/g, "");
  if (invisibleRemoved !== result) {
    result = invisibleRemoved;
    appliedOperations.push("invisible_chars");
  }

  // 5. Capitalize first letter if it's lowercase
  // (But not if it starts with "..." indicating continuation)
  if (result.length > 0 && !result.startsWith("...")) {
    const firstChar = result[0];
    if (
      firstChar &&
      /^[a-záéíóúñüàèìòùâêîôûäëïöç]/i.test(firstChar) &&
      firstChar === firstChar.toLowerCase()
    ) {
      result = firstChar.toUpperCase() + result.slice(1);
      appliedOperations.push("capitalize_first");
    }
  }

  // Final trim
  result = result.trim();

  return {
    text: result,
    wasCleaned: result !== original.trim(),
    appliedOperations,
  };
}

/**
 * Check if content needs cleaning.
 *
 * Quick check to avoid unnecessary processing.
 *
 * @param text - Text to check
 * @returns True if text likely needs cleaning
 */
export function needsCleaning(text: string): boolean {
  // Check for common issues
  return (
    // Has hyphen followed by newline (PDF artifact)
    /[a-zA-Z]-\s*\n/.test(text) ||
    // Has space before punctuation
    /\s+[.,;:!?]/.test(text) ||
    // Has multiple consecutive spaces
    / {2,}/.test(text) ||
    // Has invisible characters
    /[\ufeff\u200b\u200c\u200d]/.test(text)
  );
}
