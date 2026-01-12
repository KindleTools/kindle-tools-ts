/**
 * Constants related to data processing, identity generation, and heuristics.
 *
 * These values control how data is parsed, identified, and validated.
 */
export const PROCESSING_THRESHOLDS = {
  /**
   * Number of characters from content to include in the identity hash generation.
   * Limits the input size for hashing while maintaining uniqueness.
   */
  IDENTITY_CONTENT_PREFIX_LENGTH: 50,

  /**
   * Length of the generated alphanumeric ID for clippings.
   */
  IDENTITY_ID_LENGTH: 12,

  /**
   * Maximum length for a single tag.
   * Tags longer than this are likely false positives.
   */
  TAG_MAX_LENGTH: 50,

  /**
   * Minimum length for a single tag.
   * Tags shorter than this (e.g. 1 char) are likely noise.
   */
  TAG_MIN_LENGTH: 2,

  /**
   * Maximum length for a note to be considered a "tag-only" note.
   * Notes longer than this are likely actual user notes, not just tags.
   */
  TAG_NOTE_MAX_LENGTH: 200,

  /**
   * Simpler heuristic: notes shorter than this without spaces are likely tags.
   */
  TAG_NOTE_SHORT_LENGTH: 50,

  /**
   * Length of content preview used in titles or summaries.
   */
  PREVIEW_CONTENT_LENGTH: 50,
} as const;
