/**
 * Shared Zod schemas used across multiple modules.
 *
 * This file contains base schema definitions that are reused in
 * CLI, Config, and Exporter schemas to ensure consistency and
 * avoid duplication.
 *
 * @packageDocumentation
 */

import { z } from "zod";

// =============================================================================
// Case Transformation Schemas
// =============================================================================

/**
 * Case transformation options for text (tags, author names, etc.).
 *
 * - 'original': Keep original case as-is
 * - 'uppercase': Convert to UPPERCASE
 * - 'lowercase': Convert to lowercase
 *
 * @example
 * ```typescript
 * CaseTransformSchema.parse("uppercase"); // ✓ OK
 * CaseTransformSchema.parse("UPPER");     // ✗ Throws error
 * ```
 */
export const CaseTransformSchema = z.enum(["original", "uppercase", "lowercase"], {
  message: "Case must be: original, uppercase, or lowercase",
});

/**
 * Inferred CaseTransform type.
 */
export type CaseTransform = z.infer<typeof CaseTransformSchema>;

// =============================================================================
// Folder Structure Schema
// =============================================================================

/**
 * Folder structure options for multi-file exports.
 *
 * - 'flat': All files in the same directory
 * - 'by-book': Group by book title
 * - 'by-author': Group by author name (Root > Author)
 * - 'by-author-book': Group by author then book (Root > Author > Book)
 *
 * @example
 * ```typescript
 * FolderStructureBaseSchema.parse("by-author"); // ✓ OK
 * FolderStructureBaseSchema.parse("nested");    // ✗ Throws error
 * ```
 */
export const FolderStructureBaseSchema = z.enum(
  ["flat", "by-book", "by-author", "by-author-book"],
  {
    message: "Folder structure must be: flat, by-book, by-author, or by-author-book",
  },
);

/**
 * Inferred FolderStructureBase type.
 */
export type FolderStructureBase = z.infer<typeof FolderStructureBaseSchema>;

// =============================================================================
// Language Schema
// =============================================================================

/**
 * Supported language codes (ISO 639-1) for Kindle clippings parsing.
 *
 * @example
 * ```typescript
 * LanguageCodeSchema.parse("en"); // ✓ OK
 * LanguageCodeSchema.parse("xx"); // ✗ Throws error
 * ```
 */
export const LanguageCodeSchema = z.enum(
  ["en", "es", "pt", "de", "fr", "it", "zh", "ja", "ko", "nl", "ru"],
  { message: "Invalid language code. Supported: en, es, pt, de, fr, it, zh, ja, ko, nl, ru" },
);

/**
 * Language with auto-detection option.
 */
export const LanguageWithAutoSchema = z.union([LanguageCodeSchema, z.literal("auto")]);

/**
 * Inferred LanguageCode type.
 */
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

/**
 * Inferred LanguageWithAuto type.
 */
export type LanguageWithAuto = z.infer<typeof LanguageWithAutoSchema>;
