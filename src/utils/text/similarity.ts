/**
 * Similarity utilities for fuzzy duplicate detection.
 *
 * Uses Jaccard similarity coefficient for text comparison,
 * which is well-suited for detecting near-duplicate content.
 *
 * @packageDocumentation
 */

/**
 * Result of similarity comparison.
 */
export interface SimilarityResult {
  /** Jaccard similarity score (0 = completely different, 1 = identical) */
  score: number;

  /** True if similarity exceeds threshold (default 0.8) */
  isPossibleDuplicate: boolean;
}

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

/**
 * Compare two clipping texts for possible duplication.
 *
 * @param text1 - First text
 * @param text2 - Second text
 * @param threshold - Similarity threshold (default: 0.8)
 * @returns Comparison result with score and duplicate flag
 *
 * @example
 * ```typescript
 * const result = compareTexts(
 *   "The quick brown fox jumps over the lazy dog",
 *   "The quick brown fox jumped over a lazy dog"
 * );
 * // result.score ≈ 0.85
 * // result.isPossibleDuplicate = true
 * ```
 */
export function compareTexts(text1: string, text2: string, threshold = 0.8): SimilarityResult {
  const score = jaccardSimilarity(text1, text2);
  return {
    score,
    isPossibleDuplicate: score >= threshold,
  };
}

/**
 * Check if one text is contained within another.
 *
 * This is a stricter check than Jaccard for detecting
 * when a highlight was extended (the original is a subset).
 *
 * @param shorter - The potentially contained text
 * @param longer - The potentially containing text
 * @returns True if shorter is roughly a subset of longer
 */
export function isSubset(shorter: string, longer: string): boolean {
  // Empty shorter is subset of anything (including non-empty longer)
  if (!shorter) return !!longer;
  if (!longer) return false;

  const shortNorm = shorter.toLowerCase().trim();
  const longNorm = longer.toLowerCase().trim();

  // Direct substring check
  if (longNorm.includes(shortNorm)) return true;

  // Word-based subset check (at least 90% of shorter's words in longer)
  const shortWords = shortNorm.split(/\s+/).filter((w) => w.length > 2);
  const longWords = new Set(longNorm.split(/\s+/));

  if (shortWords.length === 0) return true;

  const matchCount = shortWords.filter((w) => longWords.has(w)).length;
  return matchCount >= shortWords.length * 0.9;
}
