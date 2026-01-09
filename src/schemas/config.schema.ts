/**
 * Zod validation schemas for configuration types.
 *
 * These schemas provide runtime validation for CLI options,
 * config files (.kindletoolsrc), and API inputs.
 *
 * @example
 * ```typescript
 * import { ParseOptionsSchema, parseParseOptions } from 'kindle-tools-ts';
 *
 * // Validate with defaults applied
 * const options = parseParseOptions({
 *   language: "es",
 *   extractTags: true
 * });
 * // options.removeDuplicates === true (default)
 * // options.language === "es"
 *
 * // Safe parse for user input
 * const result = ParseOptionsSchema.safeParse(userInput);
 * if (!result.success) {
 *   console.error(result.error.format());
 * }
 * ```
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { SupportedLanguageSchema } from "./clipping.schema.js";

// =============================================================================
// Tag and Case Schemas
// =============================================================================

/**
 * Tag case transformation options.
 * - 'original': Keep original case as typed in notes
 * - 'uppercase': Convert to UPPERCASE (default)
 * - 'lowercase': Convert to lowercase
 */
export const TagCaseSchema = z.enum(["original", "uppercase", "lowercase"], {
  message: "Tag case must be: original, uppercase, or lowercase",
});

/**
 * Inferred TagCase type.
 */
export type TagCase = z.infer<typeof TagCaseSchema>;

/**
 * Clipping type filter options for excluding specific types.
 */
export const ClippingTypeFilterSchema = z.enum(
  ["highlight", "note", "bookmark", "clip", "article"],
  { message: "Invalid clipping type filter" },
);

/**
 * Inferred ClippingTypeFilter type.
 */
export type ClippingTypeFilter = z.infer<typeof ClippingTypeFilterSchema>;

// =============================================================================
// Geographic Location Schema
// =============================================================================

/**
 * Geographic location schema for metadata enrichment.
 * Validates WGS84 coordinates with optional altitude and place name.
 *
 * @example
 * ```typescript
 * const location = GeoLocationSchema.parse({
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   placeName: "New York City"
 * });
 * ```
 */
export const GeoLocationSchema = z.object({
  latitude: z
    .number({ message: "Latitude must be a number" })
    .min(-90, { message: "Latitude must be between -90 and 90" })
    .max(90, { message: "Latitude must be between -90 and 90" }),
  longitude: z
    .number({ message: "Longitude must be a number" })
    .min(-180, { message: "Longitude must be between -180 and 180" })
    .max(180, { message: "Longitude must be between -180 and 180" }),
  altitude: z.number().optional(),
  placeName: z.string().optional(),
});

/**
 * Inferred GeoLocation type.
 */
export type GeoLocation = z.infer<typeof GeoLocationSchema>;

// =============================================================================
// Parse Options Schema
// =============================================================================

/**
 * Parse options schema for validating CLI and API inputs.
 * All options have sensible defaults.
 *
 * @example
 * ```typescript
 * import { ParseOptionsSchema } from 'kindle-tools-ts';
 *
 * // Minimal usage - gets all defaults
 * const defaults = ParseOptionsSchema.parse({});
 * // {
 * //   language: "auto",
 * //   removeDuplicates: true,
 * //   mergeNotes: true,
 * //   extractTags: false,
 * //   tagCase: "uppercase",
 * //   ...
 * // }
 *
 * // Override specific options
 * const custom = ParseOptionsSchema.parse({
 *   language: "es",
 *   extractTags: true,
 *   tagCase: "lowercase",
 *   excludeTypes: ["bookmark"]
 * });
 * ```
 */
export const ParseOptionsSchema = z.object({
  // Language
  language: z
    .union([SupportedLanguageSchema, z.literal("auto")])
    .default("auto")
    .describe("Language for parsing. Use 'auto' for automatic detection."),

  // Processing
  removeDuplicates: z.boolean().default(true).describe("Remove exact duplicate clippings"),
  mergeNotes: z.boolean().default(true).describe("Link notes to their associated highlights"),
  extractTags: z.boolean().default(false).describe("Extract tags from notes"),
  tagCase: TagCaseSchema.default("uppercase").describe("Case transformation for extracted tags"),
  mergeOverlapping: z.boolean().default(true).describe("Merge overlapping/extended highlights"),
  highlightsOnly: z.boolean().default(false).describe("Return only highlights with embedded notes"),

  // Normalization
  normalizeUnicode: z.boolean().default(true).describe("Apply Unicode NFC normalization"),
  cleanContent: z.boolean().default(true).describe("Clean content (trim, collapse spaces)"),
  cleanTitles: z.boolean().default(true).describe("Clean titles (remove extensions, suffixes)"),

  // Filtering
  excludeTypes: z
    .array(ClippingTypeFilterSchema)
    .optional()
    .describe("Types to exclude from results"),
  excludeBooks: z
    .array(z.string())
    .optional()
    .describe("Books to exclude by title (case-insensitive)"),
  onlyBooks: z.array(z.string()).optional().describe("Only include these books (case-insensitive)"),
  minContentLength: z
    .number()
    .min(0, { message: "Minimum content length must be non-negative" })
    .optional()
    .describe("Minimum content length to include"),

  // Dates
  dateLocale: z.string().optional().describe("Locale for date parsing (e.g., 'en-US', 'es-ES')"),

  // Location
  geoLocation: GeoLocationSchema.optional().describe("Geographic location for metadata"),

  // Mode
  strict: z
    .boolean()
    .default(false)
    .describe("Throw on parsing errors instead of collecting warnings"),
});

/**
 * Inferred input type (before defaults are applied).
 */
export type ParseOptionsInput = z.input<typeof ParseOptionsSchema>;

/**
 * Inferred output type (after defaults are applied).
 */
export type ParseOptions = z.output<typeof ParseOptionsSchema>;

// =============================================================================
// Config File Schema (.kindletoolsrc)
// =============================================================================

/**
 * Folder structure options for config file.
 */
export const ConfigFolderStructureSchema = z.enum(
  ["flat", "by-author", "by-book", "by-author-book"],
  {
    message: "Folder structure must be: flat, by-author, by-book, or by-author-book",
  },
);

/**
 * Config file schema for .kindletoolsrc files.
 * Combines parsing options with export-specific settings.
 *
 * @example
 * ```json
 * // .kindletoolsrc
 * {
 *   "format": "obsidian",
 *   "output": "./exports",
 *   "folderStructure": "by-author",
 *   "authorCase": "uppercase",
 *   "groupByBook": true,
 *   "extractTags": true,
 *   "tagCase": "lowercase",
 *   "parse": {
 *     "removeDuplicates": true,
 *     "mergeOverlapping": true
 *   }
 * }
 * ```
 */
export const ConfigFileSchema = z.object({
  // Export format
  format: z
    .string()
    .optional()
    .describe("Default export format: json, csv, md, obsidian, joplin, html"),

  // Output path
  output: z.string().optional().describe("Default output file or directory path"),

  // Folder structure for multi-file exports
  folderStructure: ConfigFolderStructureSchema.optional().describe(
    "Folder structure for multi-file exports",
  ),

  // Case transformations
  authorCase: TagCaseSchema.optional().describe(
    "Case transformation for author folder names: original, uppercase, lowercase",
  ),

  // Grouping
  groupByBook: z.boolean().optional().describe("Group clippings by book in output"),

  // Tags
  includeTags: z.boolean().optional().describe("Include tags in export"),

  // Pretty printing
  pretty: z.boolean().optional().describe("Pretty-print JSON output"),

  // Metadata
  title: z.string().optional().describe("Custom title for exports"),
  creator: z.string().optional().describe("Creator name for metadata"),

  // Nested parse options (allows grouping parse-specific settings)
  parse: z
    .object({
      removeDuplicates: z.boolean().optional(),
      mergeNotes: z.boolean().optional(),
      mergeOverlapping: z.boolean().optional(),
      extractTags: z.boolean().optional(),
      tagCase: TagCaseSchema.optional(),
      highlightsOnly: z.boolean().optional(),
      normalizeUnicode: z.boolean().optional(),
      cleanContent: z.boolean().optional(),
      cleanTitles: z.boolean().optional(),
      excludeTypes: z.array(ClippingTypeFilterSchema).optional(),
      excludeBooks: z.array(z.string()).optional(),
      onlyBooks: z.array(z.string()).optional(),
      minContentLength: z.number().min(0).optional(),
      dateLocale: z.string().optional(),
      geoLocation: GeoLocationSchema.optional(),
      strict: z.boolean().optional(),
    })
    .optional()
    .describe("Parsing options override"),

  // Include all ParseOptions fields at root level for backwards compatibility
  ...ParseOptionsSchema.shape,
});

/**
 * Inferred input type for config file.
 */
export type ConfigFileInput = z.input<typeof ConfigFileSchema>;

/**
 * Inferred output type for config file.
 */
export type ConfigFile = z.output<typeof ConfigFileSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate and parse options with defaults applied.
 * Throws on invalid input.
 *
 * @example
 * ```typescript
 * try {
 *   const options = parseParseOptions({ language: "es" });
 *   console.log(options.removeDuplicates); // true (default)
 * } catch (error) {
 *   console.error("Invalid options:", error);
 * }
 * ```
 */
export function parseParseOptions(input: unknown): ParseOptions {
  return ParseOptionsSchema.parse(input);
}

/**
 * Safely validate options, returning a result object.
 * Never throws - use for user input validation.
 *
 * @example
 * ```typescript
 * const result = safeParseParseOptions(userInput);
 * if (result.success) {
 *   processClippings(data, result.data);
 * } else {
 *   showValidationErrors(result.error.format());
 * }
 * ```
 */
export function safeParseParseOptions(input: unknown) {
  return ParseOptionsSchema.safeParse(input);
}

/**
 * Validate and parse config file content.
 * Throws on invalid input.
 */
export function parseConfigFile(input: unknown): ConfigFile {
  return ConfigFileSchema.parse(input);
}

/**
 * Safely validate config file content.
 * Never throws.
 */
export function safeParseConfigFile(input: unknown) {
  return ConfigFileSchema.safeParse(input);
}
