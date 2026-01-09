/**
 * Zod validation schemas for CLI arguments.
 *
 * These schemas provide runtime validation for command-line arguments.
 * Uses shared schemas from shared.schema.ts for consistency.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import {
  CaseTransformSchema,
  FolderStructureBaseSchema,
  LanguageWithAutoSchema,
} from "./shared.schema.js";

// =============================================================================
// CLI-Specific Schemas
// =============================================================================

/**
 * Export format options for CLI.
 */
export const CliFormatSchema = z.enum(
  ["json", "csv", "md", "markdown", "obsidian", "joplin", "html"],
  { message: "Invalid format. Use: json, csv, md, markdown, obsidian, joplin, or html" },
);

/**
 * Inferred CliFormat type.
 */
export type CliFormat = z.infer<typeof CliFormatSchema>;

// Re-export shared schemas with CLI-friendly names for backwards compatibility
export {
  CaseTransformSchema as CliCaseSchema,
  FolderStructureBaseSchema as CliFolderStructureSchema,
  LanguageWithAutoSchema as CliLanguageSchema,
};

// =============================================================================
// CLI Arguments Schema
// =============================================================================

/**
 * Schema for CLI parsed arguments.
 *
 * This provides validation and coercion for command-line arguments
 * after initial parsing.
 *
 * @example
 * ```typescript
 * const args = validateCliArgs({
 *   file: "My Clippings.txt",
 *   format: "obsidian",
 *   lang: "es",
 *   groupByBook: true
 * });
 * ```
 */
export const CliArgsSchema = z.object({
  // File input
  file: z.string().optional().describe("Path to the clippings file"),

  // Export options
  format: CliFormatSchema.optional().describe("Export format"),
  output: z.string().optional().describe("Output file or directory path"),

  // Language
  lang: LanguageWithAutoSchema.optional().describe("Language code or 'auto' for detection"),

  // Processing flags
  noMerge: z.boolean().default(false).describe("Disable merging of adjacent clippings"),
  noDedup: z.boolean().default(false).describe("Disable duplicate detection"),
  extractTags: z.boolean().default(false).describe("Extract #tags from notes"),
  highlightsOnly: z.boolean().default(false).describe("Export only highlights"),

  // Output flags
  json: z.boolean().default(false).describe("Output raw JSON to stdout"),
  verbose: z.boolean().default(false).describe("Enable verbose logging"),
  pretty: z.boolean().default(false).describe("Pretty-print JSON output"),
  groupByBook: z.boolean().default(false).describe("Group clippings by book"),

  // Structure options
  folderStructure: FolderStructureBaseSchema.optional().describe("Folder organization style"),
  authorCase: CaseTransformSchema.optional().describe("Case transform for author names"),
  tagCase: CaseTransformSchema.optional().describe("Case transform for tags"),

  // Tag options
  includeTags: z.boolean().optional().describe("Include tags in export"),

  // Metadata
  title: z.string().optional().describe("Custom title for export"),
  creator: z.string().optional().describe("Creator name for metadata"),

  // Config file
  config: z.string().optional().describe("Path to config file"),
});

/**
 * Inferred type from CliArgsSchema.
 */
export type CliArgs = z.infer<typeof CliArgsSchema>;
export type CliArgsInput = z.input<typeof CliArgsSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate CLI arguments with helpful error messages.
 *
 * @param rawArgs - Raw parsed arguments object
 * @returns Validated and typed arguments
 * @throws Error with formatted message if validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const args = validateCliArgs(parsedArgs);
 *   console.log(args.format); // Type-safe access
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export function validateCliArgs(rawArgs: unknown): CliArgs {
  const result = CliArgsSchema.safeParse(rawArgs);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `  --${path}: ${issue.message}`;
    });
    throw new Error(`Invalid arguments:\n${errors.join("\n")}`);
  }

  return result.data;
}

/**
 * Validate a single format argument.
 */
export function validateFormat(format: string): boolean {
  return CliFormatSchema.safeParse(format).success;
}

/**
 * Validate a single language argument.
 */
export function validateLanguage(lang: string): boolean {
  return LanguageWithAutoSchema.safeParse(lang).success;
}

/**
 * Get available formats as array.
 */
export function getAvailableFormats(): string[] {
  return CliFormatSchema.options;
}

/**
 * Get available languages as array.
 */
export function getAvailableLanguages(): string[] {
  return [
    ...LanguageWithAutoSchema.options.flatMap((opt) => {
      if (typeof opt === "string") return [opt];
      if ("options" in opt) return opt.options;
      return [];
    }),
  ];
}
