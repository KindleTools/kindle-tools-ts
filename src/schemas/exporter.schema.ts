/**
 * Zod validation schemas for exporter types.
 *
 * These schemas provide runtime validation for export options.
 *
 * @packageDocumentation
 */

import { z } from "zod";

/**
 * Folder structure options for Markdown-based exporters.
 */
export const FolderStructureSchema = z.enum(["flat", "by-book", "by-author", "by-author-book"]);

/**
 * Case transformation for author/folder names.
 */
export const AuthorCaseSchema = z.enum(["original", "uppercase", "lowercase"]);

/**
 * Tag case transformation (re-exported for convenience).
 */
export const ExporterTagCaseSchema = z.enum(["original", "uppercase", "lowercase"]);

/**
 * Template preset options.
 */
export const TemplatePresetSchema = z.enum([
  "default",
  "minimal",
  "obsidian",
  "notion",
  "academic",
  "compact",
  "verbose",
  "joplin",
]);

/**
 * Schema for exporter options validation.
 */
export const ExporterOptionsSchema = z.object({
  // Output
  outputPath: z.string().optional(),

  // Grouping
  groupByBook: z.boolean().default(true),

  // Content options
  includeStats: z.boolean().default(false),
  includeRaw: z.boolean().default(false),
  includeClippingTags: z.boolean().default(true),

  // Templates
  templatePreset: TemplatePresetSchema.optional(),
  customTemplates: z
    .object({
      book: z.string().optional(),
      clipping: z.string().optional(),
    })
    .optional(),
  template: z.string().optional(), // deprecated

  // Formatting
  pretty: z.boolean().default(true),

  // Folder structure (for multi-file exports)
  folderStructure: FolderStructureSchema.default("by-author"),
  authorCase: AuthorCaseSchema.default("uppercase"),

  // Metadata
  title: z.string().optional(),
  notebookName: z.string().optional(),
  creator: z.string().optional(),
});

/**
 * Inferred type from ExporterOptionsSchema.
 */
export type ExporterOptionsInput = z.input<typeof ExporterOptionsSchema>;
export type ExporterOptionsParsed = z.output<typeof ExporterOptionsSchema>;

/**
 * Parse and validate exporter options with defaults.
 */
export function parseExporterOptions(input: unknown): ExporterOptionsParsed {
  return ExporterOptionsSchema.parse(input);
}

/**
 * Safely parse exporter options.
 */
export function safeParseExporterOptions(input: unknown) {
  return ExporterOptionsSchema.safeParse(input);
}
