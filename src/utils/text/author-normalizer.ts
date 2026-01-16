import { distance } from "fastest-levenshtein";

/**
 * Utility to normalize and compare author names.
 * Helps identifying if slightly different strings refer to the same author.
 * e.g. "J.K. Rowling" vs "Rowling, J.K." vs "J. K. Rowling"
 */
export class AuthorNormalizer {
  /**
   * Normalize an author name for comparison.
   * - Lowercase
   * - Remove most punctuation (keep apostrophes, hyphens)
   * - Remove extra whitespace
   * - Sort tokens alphabetically (heuristic for First Last vs Last, First)
   */
  static normalize(name: string): string {
    if (!name) return "";

    return (
      name
        .toLowerCase()
        // Remove periods, commas, etc but keep meaningful chars like hyphens
        // Note: we remove periods from initials (J.K -> jk)
        .replace(/[.,;()"[\]]/g, " ")
        .trim()
        .split(/\s+/)
        .sort()
        .join(" ")
    );
  }

  /**
   * Calculate similarity between two author names (0-1).
   * 1 means identical (fuzzy normalized).
   */
  static getSimilarity(nameA: string, nameB: string): number {
    const normA = AuthorNormalizer.normalize(nameA);
    const normB = AuthorNormalizer.normalize(nameB);

    if (!normA && !normB) return 1;
    if (!normA || !normB) return 0;

    if (normA === normB) return 1;

    // Use Levenshtein on the SORTED tokens
    // This allows "Bond, James" and "James Bond" to match very well
    const dist = distance(normA, normB);
    const maxLength = Math.max(normA.length, normB.length);

    return 1 - dist / maxLength;
  }

  /**
   * Determine if two names likely refer to the same author.
   * Threshold default is 0.85 (conservative but flexible)
   */
  static areSameAuthor(nameA: string, nameB: string, threshold = 0.85): boolean {
    return AuthorNormalizer.getSimilarity(nameA, nameB) >= threshold;
  }
}
