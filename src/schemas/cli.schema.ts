/**
 * Zod validation schemas for CLI arguments.
 *
 * These schemas provide runtime validation for command-line arguments.
 *
 * @packageDocumentation
 */

import { z } from "zod";

/**
 * Supported language codes for CLI.
 */
export const CliLanguageSchema = z.enum([
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
  "auto",
]);

/**
 * Folder structure for CLI.
 */
export const CliFolderStructureSchema = z.enum(["flat", "by-book", "by-author", "by-author-book"]);

/**
 * Case transformation options.
 */
export const CliCaseSchema = z.enum(["original", "uppercase", "lowercase"]);

/**
 * Export format options.
 */
export const CliFormatSchema = z.enum([
  "json",
  "csv",
  "md",
  "markdown",
  "obsidian",
  "joplin",
  "html",
]);

/**
 * Schema for CLI parsed arguments.
 *
 * This provides validation and coercion for command-line arguments
 * after initial parsing.
 */
export const CliArgsSchema = z.object({
  // File input
  file: z.string().optional(),

  // Export options
  format: CliFormatSchema.optional(),
  output: z.string().optional(),

  // Language
  lang: CliLanguageSchema.optional(),

  // Processing flags
  noMerge: z.boolean().default(false),
  noDedup: z.boolean().default(false),
  extractTags: z.boolean().default(false),
  highlightsOnly: z.boolean().default(false),

  // Output flags
  json: z.boolean().default(false),
  verbose: z.boolean().default(false),
  pretty: z.boolean().default(false),
  groupByBook: z.boolean().default(false),

  // Structure options
  folderStructure: CliFolderStructureSchema.optional(),
  authorCase: CliCaseSchema.optional(),
  tagCase: CliCaseSchema.optional(),

  // Tag options
  includeTags: z.boolean().optional(),

  // Metadata
  title: z.string().optional(),
  creator: z.string().optional(),
});

/**
 * Inferred type from CliArgsSchema.
 */
export type CliArgs = z.infer<typeof CliArgsSchema>;
export type CliArgsInput = z.input<typeof CliArgsSchema>;

/**
 * Validate CLI arguments with helpful error messages.
 *
 * @param rawArgs - Raw parsed arguments object
 * @returns Validated and typed arguments
 * @throws Error with formatted message if validation fails
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
  return CliLanguageSchema.safeParse(lang).success;
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
  return CliLanguageSchema.options;
}
