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

export { CsvExporter } from "./exporters/csv.exporter.js";
export { JsonExporter } from "./exporters/json.exporter.js";
export { MarkdownExporter } from "./exporters/markdown.exporter.js";

// export { ObsidianExporter } from './exporters/obsidian.exporter.js';
// export { JoplinExporter } from './exporters/joplin.exporter.js';
// export { HtmlExporter } from './exporters/html.exporter.js';

// =============================================================================
// Utility Exports
// =============================================================================

export { parseKindleDate, parseKindleDateAuto } from "./utils/dates.js";
export { generateClippingId, generateDuplicateHash } from "./utils/hashing.js";
export {
  normalizeText,
  normalizeUnicode,
  removeBOM,
} from "./utils/normalizers.js";
export {
  extractAuthor,
  sanitizeContent,
  sanitizeTitle,
} from "./utils/sanitizers.js";
export { calculateStats, countWords, groupByBook } from "./utils/stats.js";

// =============================================================================
// Type Exports
// =============================================================================

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
export type {
  ExportedFile,
  Exporter,
  ExporterOptions,
  ExportResult,
} from "./types/exporter.js";

export type { LanguagePatterns, SupportedLanguage } from "./types/language.js";
export type { BookStats, ClippingsStats } from "./types/stats.js";

// =============================================================================
// Constants Exports
// =============================================================================

export {
  DRM_LIMIT_MESSAGES,
  LANGUAGE_MAP,
  PATTERNS,
  SUPPORTED_LANGUAGES,
} from "./core/constants.js";
