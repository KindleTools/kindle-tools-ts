/**
 * Type definitions for kindle-tools-ts
 *
 * @packageDocumentation
 */

// Exporter types
export type {
  ExportedFile,
  Exporter,
  ExporterOptions,
  ExportResult,
} from "#exporters/exporter.types.js";
// Importer types
export type { Importer, ImportResult } from "#importers/importer.types.js";
// Clipping types
export type {
  Clipping,
  ClippingLocation,
  ClippingType,
  RawClipping,
} from "./clipping.js";
// Configuration types
export type {
  ParseOptions,
  ParseResult,
  ParseWarning,
  ProcessOptions,
  TagCase,
} from "./config.js";
// Geo types
export type { GeoLocation } from "./geo.js";
// Language types
export type { LanguagePatterns, SupportedLanguage } from "./language.js";
// Statistics types
export type { BookStats, ClippingsStats } from "./stats.js";
