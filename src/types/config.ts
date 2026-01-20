/**
 * Configuration types.
 *
 * Re-exports from schemas for internal use.
 * Public types are defined in schemas/config.schema.ts and result.schema.ts.
 *
 * @packageDocumentation
 */

import type { SupportedLanguage } from "#schemas/clipping.schema.js";
import type { ParseOptions } from "#schemas/config.schema.js";

export type { SupportedLanguage } from "#schemas/clipping.schema.js";
// Re-export types for internal files that import from this path
export type {
  GeoLocation,
  ParseOptions,
  ParseOptionsInput,
  TagCase,
} from "#schemas/config.schema.js";
export type {
  ParseMeta,
  ParseResult,
  ParseWarning,
  ParseWarningType,
} from "#schemas/result.schema.js";

/**
 * Options for processing clippings (post-parse).
 * Extends ParseOptions with the detected language.
 */
export interface ProcessOptions extends ParseOptions {
  /** The detected or specified language */
  detectedLanguage: SupportedLanguage;
}
