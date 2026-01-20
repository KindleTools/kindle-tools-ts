/**
 * Internal clipping types.
 *
 * Public types are in schemas/clipping.schema.ts.
 * This file only contains internal types that don't need runtime validation.
 *
 * @packageDocumentation
 */

/**
 * Raw clipping before processing.
 * Contains data directly extracted from the file.
 *
 * This is an internal type used between the tokenizer and parser.
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
