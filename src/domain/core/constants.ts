/**
 * Core domain constants used across the application.
 *
 * These constants are agnostic of the input format (TXT, JSON, CSV)
 * and define business logic thresholds and common patterns.
 *
 * @packageDocumentation
 */

/**
 * Core domain constants used across the application.
 *
 * @packageDocumentation
 * @deprecated Use src/constants/analysis.ts instead
 */

export {
  COMMON_PATTERNS,
  DRM_LIMIT_MESSAGES,
  SUSPICIOUS_HIGHLIGHT_THRESHOLDS,
  TITLE_NOISE_PATTERNS,
} from "../rules.js";

// Re-export specific value for backward compatibility with existing tests/code
import { ANALYSIS_THRESHOLDS } from "../rules.js";
export const DEFAULT_SIMILARITY_THRESHOLD = ANALYSIS_THRESHOLDS.DEFAULT_SIMILARITY_THRESHOLD;

/**
 * Constants related to data processing, identity generation, and heuristics.
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
