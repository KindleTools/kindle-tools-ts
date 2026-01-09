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

/**
 * Tag case transformation.
 * Re-exported from shared for convenience.
 */
export const ExporterTagCaseSchema = CaseTransformSchema;

// =============================================================================
// Template Preset Schema
// =============================================================================

/**
 * Template preset options for Markdown-based exporters.
 *
 * - 'default': Standard template with balanced detail
 * - 'minimal': Compact output with minimal formatting
 * - 'obsidian': Optimized for Obsidian with YAML frontmatter
 * - 'notion': Formatted for Notion import
 * - 'academic': Citation-friendly format
 * - 'compact': Dense single-line format
 * - 'verbose': Full detail with all metadata
 * - 'joplin': Optimized for Joplin import
 *
 * @example
 * ```typescript
 * TemplatePresetSchema.parse("obsidian"); // ✓ OK
 * TemplatePresetSchema.parse("custom");   // ✗ Throws error
 * ```
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
 *
 * @example
 * ```typescript
 * CustomTemplatesSchema.parse({
 *   book: "# {{title}}\n{{#each clippings}}...",
 *   clipping: "> {{content}}"
 * });
 * ```
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
 *
 * Provides full configuration for export operations with sensible defaults.
 * All exporters accept these options, though not all options apply to all formats.
 *
 * @example
 * ```typescript
 * import { ExporterOptionsSchema } from 'kindle-tools-ts';
 *
 * // Minimal usage - gets all defaults
 * const defaults = ExporterOptionsSchema.parse({});
 * // {
 * //   groupByBook: true,
 * //   includeStats: false,
 * //   pretty: true,
 * //   folderStructure: "by-author",
 * //   authorCase: "uppercase",
 * //   ...
 * // }
 *
 * // Override specific options
 * const custom = ExporterOptionsSchema.parse({
 *   folderStructure: "by-author-book",
 *   authorCase: "lowercase",
 *   includeStats: true,
 *   title: "My Reading Notes"
 * });
 * ```
 */
export const ExporterOptionsSchema = z
  .object({
    // Output
    outputPath: z
      .string()
      .optional()
      .describe("Output file path or directory for multi-file exports"),

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

    // Metadata
    title: z.string().optional().describe("Title for the export (HTML page title, etc.)"),
    notebookName: z.string().optional().describe("Notebook name for Joplin exports"),
    creator: z.string().optional().describe("Creator/author attribution for the export"),
  })
  // Allow additional exporter-specific options to pass through
  // (e.g., folder, useCallouts, wikilinks for Obsidian; tags, geoLocation for Joplin; etc.)
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
 *
 * @example
 * ```typescript
 * try {
 *   const options = parseExporterOptions({
 *     folderStructure: "by-author-book"
 *   });
 *   console.log(options.authorCase); // "uppercase" (default)
 * } catch (error) {
 *   console.error("Invalid options:", error);
 * }
 * ```
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
 *
 * @example
 * ```typescript
 * const result = safeParseExporterOptions(userInput);
 * if (result.success) {
 *   runExport(data, result.data);
 * } else {
 *   showValidationErrors(result.error.format());
 * }
 * ```
 */
export function safeParseExporterOptions(input: unknown) {
  return ExporterOptionsSchema.safeParse(input);
}
