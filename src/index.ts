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
// Txt Importer Core (Direct access)
// Txt Importer Core (Direct access)
// Language
export { detectLanguage } from "./importers/formats/txt/language-detector.js";
export { parse, parseString } from "./importers/formats/txt/parser.js";
export type { Importer, ImportResult } from "./importers/index.js";
// Importers & Factory
export {
  CsvImporter,
  ImporterFactory,
  JsonImporter,
  TxtImporter,
} from "./importers/index.js";
// Zod Schemas (for external validation)
export {
  ClippingImportSchema,
  ClippingLocationObjectSchema,
  ClippingLocationSchema,
  ClippingSourceSchema,
  ClippingsExportSchema,
  ClippingTypeSchema,
  ImportedDataSchema,
  SupportedLanguageSchema,
  SuspiciousReasonSchema,
} from "./schemas/clipping.schema.js";
export {
  ConfigFileSchema,
  GeoLocationSchema,
  ParseOptionsSchema,
  parseParseOptions,
  safeParseParseOptions,
  TagCaseSchema,
} from "./schemas/config.schema.js";
export {
  AuthorCaseSchema,
  ExporterOptionsSchema,
  FolderStructureSchema,
  parseExporterOptions,
  safeParseExporterOptions,
  TemplatePresetSchema,
} from "./schemas/exporter.schema.js";
// Types
export type {
  Clipping,
  ClippingLocation,
  ClippingType,
} from "./types/clipping.js";
export type { ParseOptions, ParseResult, ProcessOptions } from "./types/config.js";
export type { SupportedLanguage } from "./types/language.js";

// Removed internal file system types from public API

// =============================================================================
// Utilities Namespace (Optional usage)
// =============================================================================

import * as GeoUtils from "./domain/geography.js";
import * as StatUtils from "./domain/stats.js";
import * as DateUtils from "./utils/system/dates.js";
import * as TextUtils from "./utils/text/normalizers.js";

export const Utils = {
  ...DateUtils,
  ...GeoUtils,
  ...TextUtils,
  ...StatUtils,
};

// Re-exporting specific core utilities that might be useful for advanced integration

export { getErrorMessage, toError } from "./utils/system/errors.js";
