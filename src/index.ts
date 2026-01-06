/**
 * kindle-tools-ts
 *
 * A robust TypeScript library to parse and process Amazon Kindle 'My Clippings.txt' files.
 *
 * Features:
 * - Multi-language support (EN, ES, PT, DE, FR, IT, ZH, JA, KO, NL, RU)
 * - Automatic language detection
 * - Smart merging of overlapping highlights
 * - Deduplication with deterministic IDs
 * - Note-to-highlight linking
 * - Multiple export formats (JSON, CSV, Markdown, Obsidian, Joplin, HTML)
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Exports
// =============================================================================

export { detectLanguage } from "./core/language-detector.js";
// Parser and Processor
export { parse, parseFile, parseString } from "./core/parser.js";
export { process } from "./core/processor.js";
export { tokenize } from "./core/tokenizer.js";

// =============================================================================
// Exporter Exports
// =============================================================================

export {
  applyCase,
  BaseExporter,
  CsvExporter,
  createErrorResult,
  createSuccessResult,
  escapeCSV,
  escapeHtml,
  escapeYaml,
  HtmlExporter,
  JoplinExporter,
  JsonExporter,
  MarkdownExporter,
  ObsidianExporter,
  sanitizeFilename,
  withExportErrorHandling,
} from "./exporters/index.js";

// =============================================================================
// Importer Exports
// =============================================================================

export { CsvImporter, JsonImporter, TxtImporter } from "./importers/index.js";

// Importer utilities for custom importer creation
export {
  createErrorImport,
  createSuccessImport,
  generateImportId,
  parseLocationString,
} from "./importers/shared/importer-utils.js";

// =============================================================================
// Utility Exports
// =============================================================================

export {
  BOOK_ACADEMIC,
  // Book templates
  BOOK_DEFAULT,
  BOOK_MINIMAL,
  BOOK_NOTION,
  BOOK_OBSIDIAN,
  CLIPPING_ACADEMIC,
  CLIPPING_COMPACT,
  // Clipping templates
  CLIPPING_DEFAULT,
  CLIPPING_MINIMAL,
  CLIPPING_VERBOSE,
  createHandlebarsInstance,
  // Export templates
  EXPORT_DEFAULT,
  EXPORT_INDEX,
  EXPORT_SUMMARY,
  getTemplatePreset,
  TemplateEngine,
} from "./templates/index.js";
export { parseKindleDate, parseKindleDateAuto } from "./utils/dates.js";
export { getErrorMessage, toError } from "./utils/errors.js";
export {
  distanceBetween,
  formatGeoLocation,
  isValidGeoLocation,
  parseGeoLocation,
  toGoogleMapsUrl,
  toOpenStreetMapUrl,
} from "./utils/geo-location.js";
export { generateClippingId, generateDuplicateHash, sha256Sync } from "./utils/hashing.js";
export {
  normalizeText,
  normalizeUnicode,
  removeBOM,
} from "./utils/normalizers.js";
export {
  estimatePageFromLocation,
  formatPage,
  formatPageOrPlaceholder,
  getEffectivePage,
  getPageInfo,
  LOCATIONS_PER_PAGE,
  PAGE_PADDING_LENGTH,
} from "./utils/page-utils.js";
export {
  extractAuthor,
  sanitizeContent,
  sanitizeTitle,
} from "./utils/sanitizers.js";
export { compareTexts, isSubset, jaccardSimilarity } from "./utils/similarity.js";
export { calculateStats, countWords, groupByBook } from "./utils/stats.js";
export { extractTagsFromNote, looksLikeTagNote } from "./utils/tag-extractor.js";
export {
  createJexArchive,
  createTarArchive,
  type TarEntry,
} from "./utils/tar.js";
export { cleanText, needsCleaning } from "./utils/text-cleaner.js";
export { createZipArchive, type ZipEntry } from "./utils/zip.js";

// =============================================================================
// Processor Exports (advanced processing functions)
// =============================================================================

export {
  extractTagsFromLinkedNotes,
  flagFuzzyDuplicates,
  flagSuspiciousHighlights,
  linkNotesToHighlights,
  removeDuplicates,
  smartMergeHighlights,
} from "./core/processor.js";

// =============================================================================
// Type Exports
// =============================================================================

export type { ProcessResult } from "./core/processor.js";
export type {
  AuthorCase,
  ExportedFile,
  Exporter,
  ExporterOptions,
  ExportResult,
  FolderStructure,
  TagCase,
} from "./exporters/index.js";
export type { Importer, ImportResult } from "./importers/types.js";
export type {
  BookContext,
  ClippingContext,
  CustomTemplates,
  ExportContext,
  TemplateCollection,
  TemplatePreset,
  TemplateType,
} from "./templates/index.js";
export type {
  Clipping,
  ClippingLocation,
  ClippingType,
  RawClipping,
} from "./types/clipping.js";
export type {
  ParseOptions,
  ParseResult,
  ParseWarning,
  ProcessOptions,
} from "./types/config.js";
export type { LanguagePatterns, SupportedLanguage } from "./types/language.js";
export type { BookStats, ClippingsStats } from "./types/stats.js";
export type { GeoLocation } from "./utils/geo-location.js";
export type { PageInfo } from "./utils/page-utils.js";
export type { TitleSanitizeResult } from "./utils/sanitizers.js";
export type { SimilarityResult } from "./utils/similarity.js";
export type { TagExtractionOptions, TagExtractionResult } from "./utils/tag-extractor.js";
export type { CleaningOperation, TextCleaningResult } from "./utils/text-cleaner.js";

// =============================================================================
// Constants Exports
// =============================================================================

export {
  DEFAULT_SIMILARITY_THRESHOLD,
  DRM_LIMIT_MESSAGES,
  LANGUAGE_MAP,
  PATTERNS,
  SUPPORTED_LANGUAGES,
  SUSPICIOUS_HIGHLIGHT_THRESHOLDS,
  TITLE_NOISE_PATTERNS,
} from "./core/constants.js";
