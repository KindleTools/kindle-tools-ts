/**
 * Types for exporting clippings to various formats.
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import type { TagCase } from "#app-types/config.js";
import type { CustomTemplates, TemplatePreset } from "#templates/types.js";

// Re-export from centralized errors
export type {
  ExportError,
  ExportedFile,
  ExportResult,
  ExportResultAsync,
  ExportSuccess,
} from "#errors";

export {
  exportInvalidOptions,
  exportNoClippings,
  exportSuccess,
  exportTemplateError,
  exportUnknownError,
  exportUnknownFormat,
  exportWriteFailed,
} from "#errors";

/**
 * Folder structure options for Markdown-based exporters.
 * - 'flat': All files in the same folder
 * - 'by-book': One folder per book
 * - 'by-author': One folder per author (files named by book)
 * - 'by-author-book': Author folder > Book folder
 */
export type FolderStructure = "flat" | "by-book" | "by-author" | "by-author-book";

/**
 * Case transformation for folder/author names.
 * - 'original': Keep original case
 * - 'uppercase': Convert to UPPERCASE
 * - 'lowercase': Convert to lowercase
 */
export type AuthorCase = "original" | "uppercase" | "lowercase";

export type { TagCase };

/**
 * Options for exporters.
 */
export interface ExporterOptions {
  /** Output file or directory path */
  outputPath?: string;

  /** Archive format to wrap output in */
  archive?: "zip" | "tar";

  /** Group clippings by book */
  groupByBook?: boolean;

  /** Include statistics in output */
  includeStats?: boolean;

  /**
   * Template preset to use (for Markdown exporters).
   * Available: 'default', 'minimal', 'obsidian', 'notion', 'academic', 'compact', 'verbose'
   */
  templatePreset?: TemplatePreset;

  /**
   * Custom templates for Markdown output.
   * Takes precedence over templatePreset if both are specified.
   * See template-engine.ts for available variables and helpers.
   */
  customTemplates?: CustomTemplates;

  /**
   * @deprecated Use templatePreset or customTemplates instead.
   * Legacy custom template string (for Markdown exporters).
   */
  template?: string;

  /** Include raw fields in output */
  includeRaw?: boolean;

  /** Pretty print output (for JSON) */
  pretty?: boolean;

  /**
   * Folder structure for multi-file exports (Obsidian, Joplin).
   * Default: 'flat' for Obsidian, 'by-author-book' for Joplin
   */
  folderStructure?: FolderStructure;

  /**
   * Case transformation for author folder names.
   * Default: 'original'
   */
  authorCase?: AuthorCase;

  /**
   * Include clipping tags in the export.
   * For Markdown: adds tags to frontmatter
   * For JSON/CSV: ensures tags field is always present
   * Default: true
   */
  includeClippingTags?: boolean;

  /**
   * Title for the export (e.g., HTML page title, Joplin root notebook).
   */
  title?: string;

  /**
   * Alias for title (specific to Joplin).
   */
  notebookName?: string;

  /**
   * Creator/Author attribution for the export.
   */
  creator?: string;

  /**
   * Allow additional exporter-specific options.
   * Each exporter may define its own additional options (e.g., folder, useCallouts, tags).
   */
  [key: string]: unknown;
}

/**
 * Interface for all exporters.
 *
 * Exporters now return neverthrow Result types for type-safe error handling.
 */
export interface Exporter {
  /** Name of the exporter */
  name: string;

  /** File extension for output */
  extension: string;

  /**
   * Export clippings to the target format.
   *
   * @param clippings - Array of clippings to export
   * @param options - Export options
   * @returns Export result wrapped in Result type
   */
  export(clippings: Clipping[], options?: ExporterOptions): Promise<import("#errors").ExportResult>;
}

// =============================================================================
// Legacy types for gradual migration
// =============================================================================

/**
 * @deprecated Use ExportResult from #errors instead.
 * Legacy result type for backwards compatibility during migration.
 */
export interface LegacyExportResult {
  success: boolean;
  output: string | Uint8Array;
  files?: import("#errors").ExportedFile[];
  error?: Error;
}
