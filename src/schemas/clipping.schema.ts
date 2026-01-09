/**
 * Zod validation schemas for Clipping types.
 *
 * These schemas provide runtime validation for imported data,
 * ensuring type safety when processing external files (JSON, CSV, etc.).
 *
 * @example
 * ```typescript
 * import { ClippingImportSchema, ClippingsExportSchema } from 'kindle-tools-ts';
 *
 * // Validate a single clipping
 * const result = ClippingImportSchema.safeParse(unknownData);
 * if (result.success) {
 *   console.log(result.data.title);
 * } else {
 *   console.error(result.error.format());
 * }
 *
 * // Validate an entire export file
 * const exportResult = ClippingsExportSchema.safeParse(jsonData);
 * ```
 *
 * @packageDocumentation
 */

import { z } from "zod";

// =============================================================================
// Enum Schemas with Custom Error Messages
// =============================================================================

/**
 * Valid clipping types from Kindle devices.
 *
 * @example
 * ```typescript
 * ClippingTypeSchema.parse("highlight"); // ✓ OK
 * ClippingTypeSchema.parse("unknown");   // ✗ Throws error
 * ```
 */
export const ClippingTypeSchema = z.enum(["highlight", "note", "bookmark", "clip", "article"], {
  message: "Invalid clipping type. Must be: highlight, note, bookmark, clip, or article",
});

/**
 * Inferred ClippingType from schema.
 */
export type ClippingType = z.infer<typeof ClippingTypeSchema>;

/**
 * Supported language codes (ISO 639-1) for Kindle clippings parsing.
 *
 * @example
 * ```typescript
 * SupportedLanguageSchema.parse("en"); // ✓ OK
 * SupportedLanguageSchema.parse("xx"); // ✗ Throws error
 * ```
 */
export const SupportedLanguageSchema = z.enum(
  ["en", "es", "pt", "de", "fr", "it", "zh", "ja", "ko", "nl", "ru"],
  { message: "Invalid language code. Supported: en, es, pt, de, fr, it, zh, ja, ko, nl, ru" },
);

/**
 * Inferred SupportedLanguage from schema.
 */
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

/**
 * Clipping source: Amazon Kindle or sideloaded books.
 */
export const ClippingSourceSchema = z.enum(["kindle", "sideload"], {
  message: "Invalid source. Must be: kindle or sideload",
});

/**
 * Inferred ClippingSource from schema.
 */
export type ClippingSource = z.infer<typeof ClippingSourceSchema>;

/**
 * Suspicious highlight reason codes for quality assessment.
 */
export const SuspiciousReasonSchema = z.enum(
  ["too_short", "fragment", "incomplete", "exact_duplicate", "overlapping"],
  { message: "Invalid suspicious reason code" },
);

/**
 * Inferred SuspiciousReason from schema.
 */
export type SuspiciousReason = z.infer<typeof SuspiciousReasonSchema>;

// =============================================================================
// Location Schemas
// =============================================================================

/**
 * Location schema supporting both string and object formats.
 * Accepts "100-105" or { raw: "100-105", start: 100, end: 105 }.
 */
export const ClippingLocationSchema = z.union([
  z.string(),
  z.object({
    raw: z.string().default(""),
    start: z.number().default(0),
    end: z.number().nullable().default(null),
  }),
]);

/**
 * Structured location object (validated/normalized).
 */
export const ClippingLocationObjectSchema = z.object({
  raw: z.string({ message: "Location raw string is required" }),
  start: z.number({ message: "Location start must be a number" }),
  end: z.number().nullable(),
});

/**
 * Inferred ClippingLocation from schema.
 */
export type ClippingLocation = z.infer<typeof ClippingLocationObjectSchema>;

// =============================================================================
// Clipping Import Schemas (Lenient vs Strict)
// =============================================================================

/**
 * Date transformation that handles string, Date, and null values.
 * Invalid date strings are transformed to null instead of throwing.
 */
const dateTransform = z
  .union([z.string(), z.date(), z.null()])
  .transform((val) => {
    if (val === null) return null;
    if (val instanceof Date) return val;
    const parsed = new Date(val);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })
  .optional();

/**
 * Lenient clipping schema for import validation.
 *
 * This schema is intentionally permissive to accept various import formats.
 * All fields are optional and invalid values are coerced to sensible defaults.
 * Use this when importing data from external sources.
 *
 * @example
 * ```typescript
 * import { ClippingImportSchema } from 'kindle-tools-ts';
 *
 * // Accepts minimal data
 * const result = ClippingImportSchema.parse({ content: "My highlight" });
 * // result.type === undefined (not validated, caller should default)
 *
 * // Accepts complete data
 * const full = ClippingImportSchema.parse({
 *   id: "abc123",
 *   title: "The Book",
 *   author: "Author Name",
 *   content: "Highlighted text",
 *   type: "highlight",
 *   page: 42,
 *   location: { raw: "100-105", start: 100, end: 105 },
 *   date: "2024-01-01T00:00:00Z",
 *   tags: ["important", "review"]
 * });
 * ```
 */
export const ClippingImportSchema = z.object({
  // Identification (optional during import, can be generated)
  id: z.string().optional(),

  // Book and Author
  title: z.string().optional(),
  titleRaw: z.string().optional(),
  author: z.string().optional(),
  authorRaw: z.string().optional(),

  // Content
  content: z.string().optional(),
  contentRaw: z.string().optional(),

  // Type (lenient - accepts any valid type or undefined)
  type: ClippingTypeSchema.optional(),

  // Location
  page: z.number().nullable().optional(),
  location: ClippingLocationSchema.optional(),

  // Date (with transformation)
  date: dateTransform,
  dateRaw: z.string().optional(),

  // Flags
  isLimitReached: z.boolean().optional(),
  isEmpty: z.boolean().optional(),
  language: z.string().optional(),
  source: ClippingSourceSchema.optional(),

  // Statistics
  wordCount: z.number().nonnegative({ message: "Word count must be non-negative" }).optional(),
  charCount: z.number().nonnegative({ message: "Char count must be non-negative" }).optional(),

  // Linking
  linkedNoteId: z.string().optional(),
  linkedHighlightId: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),

  // Metadata
  blockIndex: z.number().optional(),

  // Quality
  isSuspiciousHighlight: z.boolean().optional(),
  suspiciousReason: SuspiciousReasonSchema.optional(),
  similarityScore: z
    .number()
    .min(0, { message: "Similarity score must be between 0 and 1" })
    .max(1, { message: "Similarity score must be between 0 and 1" })
    .optional(),
  possibleDuplicateOf: z.string().optional(),
  titleWasCleaned: z.boolean().optional(),
  contentWasCleaned: z.boolean().optional(),
});

/**
 * Inferred type from the lenient import schema.
 */
export type ClippingImport = z.infer<typeof ClippingImportSchema>;

/**
 * Strict clipping schema for internal validation.
 *
 * This schema requires all essential fields and validates types strictly.
 * Use this when validating data generated by the application itself.
 *
 * @example
 * ```typescript
 * import { ClippingStrictSchema } from 'kindle-tools-ts';
 *
 * // Requires essential fields
 * const result = ClippingStrictSchema.parse({
 *   id: "abc123",
 *   title: "The Book",
 *   author: "Author",
 *   content: "Highlighted text",
 *   type: "highlight",
 *   location: { raw: "100", start: 100, end: null }
 * });
 * ```
 */
export const ClippingStrictSchema = z.object({
  // Required identification
  id: z.string().min(1, { message: "ID is required" }),

  // Required book info
  title: z.string().min(1, { message: "Title is required" }),
  titleRaw: z.string(),
  author: z.string().min(1, { message: "Author is required" }),
  authorRaw: z.string(),

  // Required content
  content: z.string(),
  contentRaw: z.string(),

  // Required type
  type: ClippingTypeSchema,

  // Location (structured)
  page: z.number().nullable(),
  location: ClippingLocationObjectSchema,

  // Date
  date: z.date().nullable(),
  dateRaw: z.string(),

  // Flags
  isLimitReached: z.boolean(),
  isEmpty: z.boolean(),
  language: SupportedLanguageSchema,
  source: ClippingSourceSchema,

  // Statistics
  wordCount: z.number().nonnegative(),
  charCount: z.number().nonnegative(),
  blockIndex: z.number(),

  // Optional linking
  linkedNoteId: z.string().optional(),
  linkedHighlightId: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),

  // Optional quality
  isSuspiciousHighlight: z.boolean().optional(),
  suspiciousReason: SuspiciousReasonSchema.optional(),
  similarityScore: z.number().min(0).max(1).optional(),
  possibleDuplicateOf: z.string().optional(),
  titleWasCleaned: z.boolean().optional(),
  contentWasCleaned: z.boolean().optional(),
});

/**
 * Inferred type from the strict schema.
 */
export type ClippingStrict = z.infer<typeof ClippingStrictSchema>;

// =============================================================================
// Export Format Schemas
// =============================================================================

/**
 * Schema for validating JSON export format.
 * Accepts either an array of clippings or an object with clippings/books.
 *
 * @example
 * ```typescript
 * import { ClippingsExportSchema } from 'kindle-tools-ts';
 *
 * // Array format
 * ClippingsExportSchema.parse([{ content: "Quote 1" }, { content: "Quote 2" }]);
 *
 * // Object format with metadata
 * ClippingsExportSchema.parse({
 *   clippings: [{ content: "Quote" }],
 *   meta: { total: 1, exportDate: "2024-01-01" }
 * });
 *
 * // Grouped by book
 * ClippingsExportSchema.parse({
 *   books: {
 *     "Book Title": [{ content: "Quote from book" }]
 *   }
 * });
 * ```
 */
export const ClippingsExportSchema = z.union([
  // Array format (simple list of clippings)
  z.array(ClippingImportSchema),

  // Object format (with optional metadata)
  z.object({
    clippings: z.array(ClippingImportSchema).optional(),
    books: z.record(z.string(), z.array(ClippingImportSchema)).optional(),
    meta: z
      .object({
        total: z.number().optional(),
        totalBooks: z.number().optional(),
        totalClippings: z.number().optional(),
        exportDate: z.string().optional(),
        version: z.string().optional(),
      })
      .optional(),
  }),
]);

/**
 * Inferred type from the export schema.
 */
export type ClippingsExport = z.infer<typeof ClippingsExportSchema>;

/**
 * Schema to validate that imported data has at least some clippings.
 * Useful for validating user-provided JSON files.
 */
export const ImportedDataSchema = z
  .object({
    clippings: z.array(ClippingImportSchema).optional(),
    books: z.record(z.string(), z.array(ClippingImportSchema)).optional(),
  })
  .refine((data) => data.clippings || data.books, {
    message: 'Data must have either a "clippings" array or a "books" object',
  });

/**
 * Inferred type from ImportedDataSchema.
 */
export type ImportedData = z.infer<typeof ImportedDataSchema>;
