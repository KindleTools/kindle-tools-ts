/**
 * Text counting utilities.
 *
 * @packageDocumentation
 */

/**
 * Count words in a text.
 *
 * @param text - Text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Split by whitespace and filter empty strings
  return text.trim().split(/\s+/).filter(Boolean).length;
}
