import type { Clipping } from "./clipping.js";

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

  /** Custom template (for Markdown exporters) */
  template?: string;

  /** Include raw fields in output */
  includeRaw?: boolean;

  /** Pretty print output (for JSON) */
  pretty?: boolean;
}

/**
 * A single exported file.
 */
export interface ExportedFile {
  /** Relative path of the file */
  path: string;

  /** File content */
  content: string | Buffer;
}

/**
 * Result of an export operation.
 */
export interface ExportResult {
  /** Whether the export was successful */
  success: boolean;

  /** Generated content (for single-file exports) */
  output: string | Buffer;

  /** Generated files (for multi-file exports) */
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
