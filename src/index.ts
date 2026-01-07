/**
 * kindle-tools-ts
 *
 * A robust TypeScript library to parse and process Amazon Kindle 'My Clippings.txt' files.
 *
 * Features:
 * - Multi-language support (EN, ES, PT, DE, FR, IT, ZH, JA, KO, NL, RU)
 * - Automatic language detection
 * - Robust parsing for TXT, JSON, and CSV formats
 * - Smart merging of overlapping highlights and deduplication
 * - Multiple export formats (JSON, CSV, Markdown, Obsidian, Joplin, HTML)
 *
 * @packageDocumentation
 */

// =============================================================================
// Main API Exports
// =============================================================================

export type { ProcessResult } from "./core/processor.js";
export { process } from "./core/processor.js";
export type {
  AuthorCase,
  ExportedFile,
  Exporter,
  ExporterOptions,
  ExportResult,
  FolderStructure,
  TagCase,
} from "./exporters/index.js";

// Exporters
export {
  BaseExporter,
  CsvExporter,
  HtmlExporter,
  JoplinExporter,
  JsonExporter,
  MarkdownExporter,
  ObsidianExporter,
} from "./exporters/index.js";
export type { Importer, ImportResult } from "./importers/index.js";
// Importers & Factory
export {
  CsvImporter,
  ImporterFactory,
  JsonImporter,
  TxtImporter,
} from "./importers/index.js";
// Core Parsing & Processing
export { parseFile } from "./importers/txt/core/file-parser.js";
export { parse, parseString } from "./importers/txt/core/parser.js";
// Types
export type {
  Clipping,
  ClippingLocation,
  ClippingType,
} from "./types/clipping.js";
export type { ParseOptions, ParseResult, ProcessOptions } from "./types/config.js";
export type { SupportedLanguage } from "./types/language.js";
export type { TarEntry } from "./utils/fs/tar.js";
export type { ZipEntry } from "./utils/fs/zip.js";

// =============================================================================
// Utilities Namespace (Optional usage)
// =============================================================================

import * as GeoUtils from "./domain/geo-location.js";
import * as StatUtils from "./domain/stats.js";
import * as TarUtils from "./utils/fs/tar.js";
import * as ZipUtils from "./utils/fs/zip.js";
import * as DateUtils from "./utils/system/dates.js";
import * as TextUtils from "./utils/text/normalizers.js";

export const Utils = {
  ...DateUtils,
  ...GeoUtils,
  ...TextUtils,
  ...StatUtils,
  ...TarUtils,
  ...ZipUtils,
};

// Re-exporting specific core utilities that might be useful for advanced integration
export { detectLanguage } from "./importers/txt/core/language-detector.js";
export { getErrorMessage, toError } from "./utils/system/errors.js";
