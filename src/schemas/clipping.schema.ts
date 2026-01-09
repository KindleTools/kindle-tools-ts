/**
 * Zod validation schemas for Clipping types.
 *
 * These schemas provide runtime validation for imported data,
 * ensuring type safety when processing external files (JSON, CSV, etc.).
 *
 * @packageDocumentation
 */

import { z } from "zod";

/**
 * Valid clipping types.
 */
export const ClippingTypeSchema = z.enum(["highlight", "note", "bookmark", "clip", "article"]);

/**
 * Supported language codes (ISO 639-1).
 */
export const SupportedLanguageSchema = z.enum([
  "en",
  "es",
  "pt",
  "de",
  "fr",
  "it",
  "zh",
  "ja",
  "ko",
  "nl",
  "ru",
]);

/**
 * Clipping source (Amazon Kindle or sideloaded books).
 */
export const ClippingSourceSchema = z.enum(["kindle", "sideload"]);

/**
 * Suspicious highlight reason codes.
 */
export const SuspiciousReasonSchema = z.enum([
  "too_short",
  "fragment",
  "incomplete",
  "exact_duplicate",
  "overlapping",
]);

/**
 * Location schema supporting both string and object formats.
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
  raw: z.string(),
  start: z.number(),
  end: z.number().nullable(),
});

/**
 * Base clipping schema for import validation.
 *
 * This schema is intentionally lenient to accept various import formats.
 * Required fields are marked, optional ones use defaults or remain optional.
 */
export const ClippingImportSchema = z.object({
  // Identification (optional during import, can be generated)
  id: z.string().optional(),

  // Book and Author
  title: z.string().min(1, "Title is required").optional(),
  titleRaw: z.string().optional(),
  author: z.string().optional(),
  authorRaw: z.string().optional(),

  // Content
  content: z.string().optional(),
  contentRaw: z.string().optional(),

  // Type
  type: ClippingTypeSchema.optional(),

  // Location
  page: z.number().nullable().optional(),
  location: ClippingLocationSchema.optional(),

  // Date
  date: z
    .union([z.string(), z.date(), z.null()])
    .transform((val) => {
      if (val === null) return null;
      if (val instanceof Date) return val;
      const parsed = new Date(val);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })
    .optional(),
  dateRaw: z.string().optional(),

  // Flags
  isLimitReached: z.boolean().optional(),
  isEmpty: z.boolean().optional(),
  language: z.string().optional(),
  source: ClippingSourceSchema.optional(),

  // Statistics
  wordCount: z.number().optional(),
  charCount: z.number().optional(),

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
  similarityScore: z.number().min(0).max(1).optional(),
  possibleDuplicateOf: z.string().optional(),
  titleWasCleaned: z.boolean().optional(),
  contentWasCleaned: z.boolean().optional(),
});

/**
 * Inferred type from the import schema.
 */
export type ClippingImport = z.infer<typeof ClippingImportSchema>;

/**
 * Schema for validating JSON export format (array or object with clippings/books).
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
 */
export const ImportedDataSchema = z
  .object({
    clippings: z.array(ClippingImportSchema).optional(),
    books: z.record(z.string(), z.array(ClippingImportSchema)).optional(),
  })
  .refine((data) => data.clippings || data.books, {
    message: 'Must have "clippings" array or "books" object',
  });
