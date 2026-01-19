/**
 * Zod validation schemas for exporter types.
 *
 * These schemas provide runtime validation for export options,
 * ensuring type safety when configuring exporters.
 *
 * @example
 * ```typescript
 * import { ExporterOptionsSchema, parseExporterOptions } from 'kindle-tools-ts';
 *
 * // Validate with defaults applied
 * const options = parseExporterOptions({
 *   folderStructure: "by-author",
 *   pretty: true
 * });
 *
 * // Safe parse for user input
 * const result = ExporterOptionsSchema.safeParse(userInput);
 * if (!result.success) {
 *   console.error(result.error.format());
 * }
 * ```
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { CaseTransformSchema, FolderStructureBaseSchema } from "./shared.schema.js";

// =============================================================================
// Re-exports from shared (for convenience and backward compatibility)
// =============================================================================

/**
 * Folder structure options for Markdown-based exporters.
 * Re-exported from shared for convenience.
 */
export const FolderStructureSchema = FolderStructureBaseSchema;

/**
 * Case transformation for author/folder names.
 * Re-exported from shared for convenience.
 */
export const AuthorCaseSchema = CaseTransformSchema;

// =============================================================================
// Template Preset Schema
// // =============================================================================

/**
 * Template preset options for Markdown-based exporters.
 */
export const TemplatePresetSchema = z.enum(
  ["default", "minimal", "obsidian", "notion", "academic", "compact", "verbose", "joplin"],
  {
    message:
      "Invalid template preset. Must be: default, minimal, obsidian, notion, academic, compact, verbose, or joplin",
  },
);

/**
 * Inferred TemplatePreset type.
 */
export type TemplatePreset = z.infer<typeof TemplatePresetSchema>;

// =============================================================================
// Custom Templates Schema
// =============================================================================

/**
 * Custom Handlebars templates for book and clipping rendering.
 */
export const CustomTemplatesSchema = z.object({
  /** Custom template for book header */
  book: z.string().optional().describe("Handlebars template for book sections"),
  /** Custom template for individual clippings */
  clipping: z.string().optional().describe("Handlebars template for clipping entries"),
});

// =============================================================================
// Exporter Options Schema
// =============================================================================

/**
 * Schema for exporter options validation.
 */
export const ExporterOptionsSchema = z
  .object({
    // Output
    outputPath: z
      .string()
      .optional()
      .describe("Output file path or directory for multi-file exports"),
    archive: z.enum(["zip", "tar"]).optional().describe("Archive format (zip or tar)"),

    // Grouping
    groupByBook: z.boolean().default(false).describe("Group clippings by book in output"),

    // Content options
    includeStats: z.boolean().default(false).describe("Include statistics section in output"),
    includeRaw: z
      .boolean()
      .default(false)
      .describe("Include raw/original content alongside cleaned content"),
    includeClippingTags: z
      .boolean()
      .default(true)
      .describe("Include extracted tags in clipping output"),

    // Templates
    templatePreset: TemplatePresetSchema.optional().describe("Predefined template style"),
    customTemplates: CustomTemplatesSchema.optional().describe("Custom Handlebars templates"),
    /** @deprecated Use templatePreset or customTemplates instead */
    template: z.string().optional().describe("Deprecated: Use templatePreset or customTemplates"),

    // Formatting
    pretty: z.boolean().default(true).describe("Pretty-print output (indentation, spacing)"),

    // Folder structure (for multi-file exports)
    folderStructure: FolderStructureSchema.default("by-author").describe(
      "Folder hierarchy for multi-file exports: flat, by-book, by-author, by-author-book",
    ),
    authorCase: AuthorCaseSchema.default("uppercase").describe(
      "Case transformation for author folder names",
    ),

    // Note granularity (for multi-file exports like Joplin/Obsidian)
    // No default - each exporter defines its own (Joplin: per-clipping, Obsidian: per-book)
    noteGranularity: z
      .enum(["per-clipping", "per-book"])
      .optional()
      .describe("Export granularity: one file/note per clipping or per book"),

    // Metadata
    title: z.string().optional().describe("Title for the export (HTML page title, etc.)"),
    notebookName: z.string().optional().describe("Notebook name for Joplin exports"),
    creator: z.string().optional().describe("Creator/author attribution for the export"),
  })
  // Allow additional exporter-specific options to pass through
  .passthrough();

/**
 * Inferred input type from ExporterOptionsSchema (before defaults).
 */
export type ExporterOptionsInput = z.input<typeof ExporterOptionsSchema>;

/**
 * Inferred output type from ExporterOptionsSchema (after defaults).
 */
export type ExporterOptionsParsed = z.output<typeof ExporterOptionsSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse and validate exporter options with defaults applied.
 * Throws on invalid input.
 *
 * @param input - Raw options object to validate
 * @returns Validated options with defaults applied
 * @throws ZodError if validation fails
 */
export function parseExporterOptions(input: unknown): ExporterOptionsParsed {
  return ExporterOptionsSchema.parse(input);
}

/**
 * Safely parse exporter options, returning a result object.
 * Never throws - use for user input validation.
 *
 * @param input - Raw options object to validate
 * @returns SafeParseResult with success/error information
 */
export function safeParseExporterOptions(input: unknown) {
  return ExporterOptionsSchema.safeParse(input);
}
