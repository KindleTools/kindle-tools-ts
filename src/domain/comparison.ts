/**
 * Domain-specific text comparison logic.
 *
 * @packageDocumentation
 */

import { jaccardSimilarity } from "#utils/text/similarity.js";

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
