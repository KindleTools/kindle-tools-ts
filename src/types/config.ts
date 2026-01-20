/**
 * Internal configuration types.
 *
 * Public types are in schemas/config.schema.ts.
 * This file only contains internal types that extend schema types.
 *
 * @packageDocumentation
 */

import type { SupportedLanguage } from "#schemas/clipping.schema.js";
import type { ParseOptions } from "#schemas/config.schema.js";

/**
 * Options for processing clippings (post-parse).
 *
 * Extends ParseOptions with the detected language.
 */
export interface ProcessOptions extends ParseOptions {
  /** The detected or specified language */
  detectedLanguage: SupportedLanguage;
}
