/**
 * Types for importing clippings from various formats.
 *
 * @packageDocumentation
 */

// Re-export all error types and result factories from centralized errors module
export type {
  ImportError,
  ImportResult,
  ImportResultAsync,
  ImportSuccess,
  ValidationIssue,
} from "#errors";

export {
  err,
  importEmptyFile,
  importInvalidFormat,
  importParseError,
  importSuccess,
  importUnknownError,
  ok,
} from "#errors";

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
  import(content: string): import("#errors").ImportResultAsync;
}
