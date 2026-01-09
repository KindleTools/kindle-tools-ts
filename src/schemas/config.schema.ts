/**
 * Zod validation schemas for configuration types.
 *
 * These schemas provide runtime validation for CLI options,
 * config files, and API inputs.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { SupportedLanguageSchema } from "./clipping.schema.js";

/**
 * Tag case transformation options.
 */
export const TagCaseSchema = z.enum(["original", "uppercase", "lowercase"]);

/**
 * Clipping type filter options.
 */
export const ClippingTypeFilterSchema = z.enum([
  "highlight",
  "note",
  "bookmark",
  "clip",
  "article",
]);

/**
 * Geographic location schema.
 */
export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  placeName: z.string().optional(),
});

/**
 * Parse options schema for validating CLI and API inputs.
 */
export const ParseOptionsSchema = z.object({
  // Language
  language: z.union([SupportedLanguageSchema, z.literal("auto")]).default("auto"),

  // Processing
  removeDuplicates: z.boolean().default(true),
  mergeNotes: z.boolean().default(true),
  extractTags: z.boolean().default(false),
  tagCase: TagCaseSchema.default("uppercase"),
  mergeOverlapping: z.boolean().default(true),
  highlightsOnly: z.boolean().default(false),

  // Normalization
  normalizeUnicode: z.boolean().default(true),
  cleanContent: z.boolean().default(true),
  cleanTitles: z.boolean().default(true),

  // Filtering
  excludeTypes: z.array(ClippingTypeFilterSchema).optional(),
  excludeBooks: z.array(z.string()).optional(),
  onlyBooks: z.array(z.string()).optional(),
  minContentLength: z.number().min(0).optional(),

  // Dates
  dateLocale: z.string().optional(),

  // Location
  geoLocation: GeoLocationSchema.optional(),

  // Mode
  strict: z.boolean().default(false),
});

/**
 * Inferred type from ParseOptionsSchema.
 */
export type ParseOptionsInput = z.input<typeof ParseOptionsSchema>;

/**
 * Config file schema (for .kindletoolsrc).
 */
export const ConfigFileSchema = z.object({
  // Export format
  format: z.string().optional(),
  folderStructure: z.enum(["flat", "by-author", "by-book"]).optional(),

  // Processing options (same as ParseOptions)
  ...ParseOptionsSchema.shape,
});

/**
 * Inferred type from ConfigFileSchema.
 */
export type ConfigFileInput = z.input<typeof ConfigFileSchema>;

/**
 * Validate and parse options with defaults applied.
 */
export function parseParseOptions(input: unknown): z.infer<typeof ParseOptionsSchema> {
  return ParseOptionsSchema.parse(input);
}

/**
 * Safely validate options, returning result with success/error.
 */
export function safeParseParseOptions(input: unknown) {
  return ParseOptionsSchema.safeParse(input);
}
