/**
 * Domain module - Pure business logic and rules.
 *
 * This module contains domain-specific logic that is independent of
 * infrastructure concerns (importers, exporters, I/O).
 *
 * @packageDocumentation
 */

// Statistics utilities
export { calculateStats, groupByBook } from "./analytics/stats.js";
// Page number utilities
export {
  estimatePageFromLocation,
  formatPage,
  formatPageOrPlaceholder,
  getEffectivePage,
  getPageInfo,
  LOCATIONS_PER_PAGE,
  PAGE_PADDING_LENGTH,
  type PageInfo,
} from "./core/locations.js";
// Sanitization utilities
export {
  extractAuthor,
  isSideloaded,
  type SanitizedContent,
  sanitizeContent,
  sanitizeTitle,
  type TitleAuthorResult,
  type TitleSanitizeResult,
} from "./parsing/sanitizers.js";

// Tag extraction utilities
export {
  extractTagsFromNote,
  looksLikeTagNote,
  type TagCase,
  type TagExtractionOptions,
  type TagExtractionResult,
} from "./parsing/tags.js";
