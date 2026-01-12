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
} from "../../constants/analysis.js";

// Re-export specific value for backward compatibility with existing tests/code
import { ANALYSIS_THRESHOLDS } from "../../constants/analysis.js";
export const DEFAULT_SIMILARITY_THRESHOLD = ANALYSIS_THRESHOLDS.DEFAULT_SIMILARITY_THRESHOLD;
