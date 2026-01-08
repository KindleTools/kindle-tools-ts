/**
 * Types for importing clippings from various formats.
 *
 * @packageDocumentation
 */

/**
 * Result of importing clippings from a file.
 */
import type { ImportResultAsyncType, ImportResultType } from "#app-types/result.js";

// Re-export result types for consumers
export * from "#app-types/result.js";

/**
 * Result of importing clippings from a file.
 */
export type ImportResult = ImportResultType;
export type ImportResultAsync = ImportResultAsyncType;

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
  import(content: string): ImportResultAsync;
}
