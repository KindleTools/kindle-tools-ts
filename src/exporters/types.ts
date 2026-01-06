import type { Clipping } from "@app-types/clipping.js";
import type { CustomTemplates, TemplatePreset } from "@templates/types.js";

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

/**
 * Case transformation for extracted tags.
 * - 'original': Keep original case as typed in notes
 * - 'uppercase': Convert to UPPERCASE
 * - 'lowercase': Convert to lowercase (default behavior)
 */
export type TagCase = "original" | "uppercase" | "lowercase";

/**
 * Options for exporters.
 */
export interface ExporterOptions {
  /** Output file or directory path */
  outputPath?: string;

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
}

/**
 * A single exported file.
 */
export interface ExportedFile {
  /** Relative path of the file */
  path: string;

  /** File content */
  content: string | Uint8Array;
}

/**
 * Result of an export operation.
 */
export interface ExportResult {
  /** Whether the export was successful */
  success: boolean;

  /** Generated content (for single-file exports) */
  output: string | Uint8Array;

  /**
   * Generated files (for multi-file exports).
   *
   * This is always populated for Obsidian and Joplin exporters,
   * providing access to the raw files before any optional compression/archiving.
   */
  files?: ExportedFile[];

  /** Error if export failed */
  error?: Error;
}

/**
 * Interface for all exporters.
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
   * @returns Export result
   */
  export(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult>;
}
