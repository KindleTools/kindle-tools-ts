/**
 * Types for importing clippings from various formats.
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";

/**
 * Result of importing clippings from a file.
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;

  /** Parsed clippings */
  clippings: Clipping[];

  /** Warnings generated during import */
  warnings: string[];

  /** Error if import failed */
  error?: Error;

  /** Additional metadata from the import process */
  meta?: {
    detectedLanguage?: string;
    [key: string]: unknown;
  };
}

/**
 * Interface for clipping importers.
 */
export interface Importer {
  /** Name of the importer */
  name: string;

  /** Supported file extensions */
  extensions: string[];

  /**
   * Import clippings from file content.
   *
   * @param content - File content as string
   * @returns Import result with clippings
   */
  import(content: string): Promise<ImportResult>;
}
