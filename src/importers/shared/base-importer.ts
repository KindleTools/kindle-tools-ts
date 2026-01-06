/**
 * Base importer abstract class.
 *
 * Provides common functionality for all importers:
 * - Standardized error handling
 * - Result wrapping
 * - Template method pattern for import operations
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import type { Importer, ImportResult } from "../types.js";
import { createErrorImport, createSuccessImport } from "./importer-utils.js";

/**
 * Abstract base class for importers.
 *
 * Provides standardized error handling and result formatting.
 */
export abstract class BaseImporter implements Importer {
  /** Name of the importer */
  abstract readonly name: string;

  /** Supported file extensions */
  abstract readonly extensions: string[];

  /**
   * Import clippings from file content.
   *
   * This method provides standardized error handling.
   * Subclasses should override `doImport` for their specific parsing logic.
   *
   * @param content - File content as string
   * @returns Import result
   */
  async import(content: string): Promise<ImportResult> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error("File content is empty");
      }
      return await this.doImport(content);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * Implement this method with the actual parsing logic.
   *
   * @param content - File content as string
   * @returns Import result
   */
  protected abstract doImport(content: string): Promise<ImportResult>;

  // ========================
  // Result Helpers
  // ========================

  /**
   * Create a successful import result.
   */
  protected success(
    clippings: Clipping[],
    warnings: string[] = [],
    meta?: { [key: string]: unknown },
  ): ImportResult {
    return createSuccessImport(clippings, warnings, meta);
  }

  /**
   * Create an error import result.
   */
  protected error(err: unknown, warnings: string[] = []): ImportResult {
    return createErrorImport(err, warnings);
  }
}
