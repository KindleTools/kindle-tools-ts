/**
 * Type exports for Kindle clippings processing.
 *
 * This module re-exports types from Zod schemas (Single Source of Truth)
 * and maintains internal types that don't require runtime validation.
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-exports from Schemas (Single Source of Truth)
// =============================================================================

// Clipping types
export type {
  Clipping,
  ClippingImport,
  ClippingLocation,
  ClippingSource,
  ClippingStrict,
  ClippingsExport,
  ClippingType,
  ImportedData,
  SupportedLanguage,
  SuspiciousReason,
} from "#schemas/clipping.schema.js";

// Config types
export type {
  GeoLocation,
  ParseOptions,
  ParseOptionsInput,
  TagCase,
} from "#schemas/config.schema.js";
// Result types
export type {
  ParseMeta,
  ParseResult,
  ParseWarning,
  ParseWarningType,
} from "#schemas/result.schema.js";
// Stats types
export type { BookStats, ClippingsStats } from "#schemas/stats.schema.js";

// =============================================================================
// Error types (from errors module)
// =============================================================================

export type {
  AppError,
  AppResult,
  AppResultAsync,
  ExportError,
  ExportedFile,
  ExportResult,
  ExportResultAsync,
  ExportSuccess,
  ImportError,
  ImportResult,
  ImportResultAsync,
  ImportSuccess,
  ValidationIssue,
} from "#errors";

// =============================================================================
// Internal Types (no runtime validation needed)
// =============================================================================

export type { RawClipping } from "./clipping.js";
export type { ProcessOptions } from "./config.js";
export type { LanguagePatterns } from "./language.js";
