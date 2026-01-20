/**
 * Clipping types.
 *
 * Re-exports from schemas for internal use.
 * Public types are defined in schemas/clipping.schema.ts.
 *
 * @packageDocumentation
 */

// Re-export types from schema for internal files that import from this path
export type {
  Clipping,
  ClippingImport,
  ClippingLocation,
  ClippingSource,
  ClippingStrict,
  ClippingsExport,
  ClippingType,
  ImportedData,
  SuspiciousReason,
} from "#schemas/clipping.schema.js";

/**
 * Raw clipping before processing.
 * Internal type used between tokenizer and parser.
 */
export interface RawClipping {
  /** Raw title line including author */
  titleLine: string;

  /** Raw metadata line (type, page, location, date) */
  metadataLine: string;

  /** Raw content lines */
  contentLines: string[];

  /** Index of this block in the original file */
  blockIndex: number;
}
