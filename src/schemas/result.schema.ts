/**
 * Zod validation schemas for parse result types.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { ClippingStrictSchema, SupportedLanguageSchema } from "./clipping.schema.js";
import { ClippingsStatsSchema } from "./stats.schema.js";

// =============================================================================
// Parse Warning Schema
// =============================================================================

/**
 * Warning types that can occur during parsing.
 */
export const ParseWarningTypeSchema = z.enum(
  ["date_parse_failed", "unknown_format", "encoding_issue", "empty_content", "unknown_type"],
  { message: "Invalid warning type" },
);

/**
 * Inferred ParseWarningType.
 */
export type ParseWarningType = z.infer<typeof ParseWarningTypeSchema>;

/**
 * Warning generated during parsing.
 */
export const ParseWarningSchema = z.object({
  type: ParseWarningTypeSchema.describe("Type of warning"),
  message: z.string().describe("Human-readable warning message"),
  blockIndex: z.number().describe("Index of the block that caused the warning"),
  raw: z.string().optional().describe("Raw content that caused the warning"),
});

/**
 * Inferred ParseWarning type.
 */
export type ParseWarning = z.infer<typeof ParseWarningSchema>;

// =============================================================================
// Parse Meta Schema
// =============================================================================

/**
 * Metadata about the parse operation.
 */
export const ParseMetaSchema = z.object({
  fileSize: z.number().nonnegative().describe("Original file size in bytes"),
  parseTime: z.number().nonnegative().describe("Time taken to parse in milliseconds"),
  detectedLanguage: SupportedLanguageSchema.describe("Detected language of the file"),
  totalBlocks: z.number().nonnegative().describe("Number of raw blocks found"),
  parsedBlocks: z.number().nonnegative().describe("Number of blocks successfully parsed"),
});

/**
 * Inferred ParseMeta type.
 */
export type ParseMeta = z.infer<typeof ParseMetaSchema>;

// =============================================================================
// Parse Result Schema
// =============================================================================

/**
 * Result of parsing a Kindle clippings file.
 */
export const ParseResultSchema = z.object({
  clippings: z.array(ClippingStrictSchema).describe("Parsed and processed clippings"),
  stats: ClippingsStatsSchema.describe("Statistics about the parsed clippings"),
  warnings: z.array(ParseWarningSchema).describe("Warnings generated during parsing"),
  meta: ParseMetaSchema.describe("Metadata about the parse operation"),
});

/**
 * Inferred ParseResult type.
 */
export type ParseResult = z.infer<typeof ParseResultSchema>;
