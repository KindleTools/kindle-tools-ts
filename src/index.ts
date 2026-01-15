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

// Config helpers and constants
export { DEFAULTS, defineConfig, LOCATION_CONSTANTS } from "./config/index.js";
export type { ProcessResult } from "./core/processor.js";
export { processClippings } from "./core/processor.js";
export type {
  AuthorCase,
  ExportedFile,
  Exporter,
  ExporterOptions,
  ExportResult,
  FolderStructure,
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
// New Zod-inferred types (for users who prefer Zod validation)
export type {
  ClippingImport,
  ClippingSource,
  ClippingStrict,
  ClippingsExport,
  ImportedData,
  SuspiciousReason,
} from "./schemas/clipping.schema.js";
// Zod Schemas (for external validation)
export {
  ClippingImportSchema,
  ClippingLocationObjectSchema,
  ClippingLocationSchema,
  ClippingSourceSchema,
  ClippingStrictSchema,
  ClippingsExportSchema,
  ClippingTypeSchema,
  ImportedDataSchema,
  SupportedLanguageSchema,
  SuspiciousReasonSchema,
} from "./schemas/clipping.schema.js";
// New Zod-inferred types from config schemas
export type {
  ClippingTypeFilter,
  ConfigFile,
  ConfigFileInput,
  GeoLocation,
  ParseOptionsInput,
} from "./schemas/config.schema.js";
export {
  ConfigFileSchema,
  ConfigFolderStructureSchema,
  GeoLocationSchema,
  ParseOptionsSchema,
  parseConfigFile,
  parseParseOptions,
  safeParseConfigFile,
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

// Legacy Types (from ./types/ for backward compatibility)
export type {
  Clipping,
  ClippingLocation,
  ClippingType,
} from "./types/clipping.js";
export type { ParseOptions, ParseResult, ProcessOptions, TagCase } from "./types/config.js";
export type { SupportedLanguage } from "./types/language.js";

// Removed internal file system types from public API

// =============================================================================
// Utilities Namespace (Optional usage)
// =============================================================================

import * as StatUtils from "./domain/analytics/stats.js";
import * as GeoUtils from "./utils/geo/index.js";
import * as DateUtils from "./utils/system/dates.js";
import * as TextUtils from "./utils/text/normalizers.js";

export const Utils = {
  ...DateUtils,
  ...GeoUtils,
  ...TextUtils,
  ...StatUtils,
};

// Re-exporting specific core utilities that might be useful for advanced integration

export {
  formatZodError,
  formatZodErrorSummary,
  getErrorMessage,
  toError,
} from "./utils/system/errors.js";

// =============================================================================
// Logger API (Dependency Injection)
// =============================================================================

export type {
  ErrorLogContext,
  ErrorLogEntry,
  Logger,
} from "./errors/logger.js";
export {
  getLogger,
  logError,
  logWarning,
  nullLogger,
  resetLogger,
  setLogger,
} from "./errors/logger.js";

// =============================================================================
// FileSystem API (Dependency Injection)
// =============================================================================

export { MemoryFileSystem } from "./ports/adapters/memory-filesystem.js";
export type { FileSystem } from "./ports/filesystem.js";
export {
  getFileSystem,
  nullFileSystem,
  resetFileSystem,
  setFileSystem,
} from "./ports/filesystem.js";

// =============================================================================
// Template Engine API
// =============================================================================

export { TemplateEngine } from "./templates/engine.js";
export {
  getAvailablePresets,
  getTemplatePreset,
} from "./templates/presets.js";
export type {
  BookContext,
  ClippingContext,
  CustomTemplates,
  ExportContext,
  TemplateOptions,
  TemplatePreset,
  TemplateType,
} from "./templates/types.js";
