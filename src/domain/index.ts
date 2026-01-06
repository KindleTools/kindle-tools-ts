/**
 * Domain module - Pure business logic and rules.
 *
 * This module contains domain-specific logic that is independent of
 * infrastructure concerns (importers, exporters, I/O).
 *
 * @packageDocumentation
 */

// Geographic location utilities
export {
  distanceBetween,
  formatGeoLocation,
  isValidGeoLocation,
  parseGeoLocation,
  toGoogleMapsUrl,
  toOpenStreetMapUrl,
} from "./geo-location.js";

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
} from "./page-utils.js";

// Sanitization utilities
export {
  extractAuthor,
  isSideloaded,
  type SanitizedContent,
  sanitizeContent,
  sanitizeTitle,
  type TitleAuthorResult,
  type TitleSanitizeResult,
} from "./sanitizers.js";

// Statistics utilities
export { calculateStats, countWords, groupByBook } from "./stats.js";

// Tag extraction utilities
export {
  extractTagsFromNote,
  looksLikeTagNote,
  type TagCase,
  type TagExtractionOptions,
  type TagExtractionResult,
} from "./tag-extractor.js";
