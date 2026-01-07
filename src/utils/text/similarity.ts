/**
 * Similarity utilities for text comparison.
 *
 * @packageDocumentation
 */

/**
 * Calculate Jaccard similarity between two texts.
 *
 * Jaccard similarity is defined as:
 *   J(A, B) = |A ∩ B| / |A ∪ B|
 *
 * Where A and B are sets of words from each text.
 *
 * This is recommended for fuzzy duplicate detection because:
 * - Works well for short to medium texts
 * - Robust to word reordering
 * - No external dependencies needed
 * - Fast O(n) computation
 *
 * @param text1 - First text to compare
 * @param text2 - Second text to compare
 * @returns Similarity score between 0 and 1
 *
 * @example
 * ```typescript
 * jaccardSimilarity("hello world", "hello world") // 1.0
 * jaccardSimilarity("hello world", "hello there") // 0.333
 * jaccardSimilarity("completely different", "nothing alike") // 0.0
 * ```
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 1;

  // Normalize: lowercase, remove punctuation, split into words
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,;:!?"'„""''«»\-—–()[\]{}]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

  const words1 = normalize(text1);
  const words2 = normalize(text2);

  if (words1.length === 0 && words2.length === 0) return 0;
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  // Calculate intersection size
  let intersectionSize = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      intersectionSize++;
    }
  }

  // Calculate union size (|A| + |B| - |A ∩ B|)
  const unionSize = set1.size + set2.size - intersectionSize;

  return unionSize > 0 ? intersectionSize / unionSize : 0;
}
