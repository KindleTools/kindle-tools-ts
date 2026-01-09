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

import { errAsync, ResultAsync } from "neverthrow";
import type { Clipping } from "#app-types/clipping.js";
import {
  type ImportResult,
  type ImportResultAsync,
  importEmptyFile,
  importSuccess,
  importUnknownError,
} from "#errors";
import type { Importer } from "../core/types.js";

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
   * This method provides standardized error handling using ResultAsync.
   * Subclasses should override `doImport` for their specific parsing logic.
   *
   * @param content - File content as string
   * @returns Import result
   */
  import(content: string): ImportResultAsync {
    if (!content || content.trim().length === 0) {
      return errAsync({
        code: "IMPORT_EMPTY_FILE",
        message: "File content is empty",
      });
    }

    // Wrap the doImport promise safely
    return ResultAsync.fromPromise(this.doImport(content), (error) =>
      this.error(error)._unsafeUnwrapErr(),
    ).andThen((result) => {
      // doImport returns Promise<Result<...>> so we check the result
      return new ResultAsync(Promise.resolve(result));
    });
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
    return importSuccess(clippings, warnings, meta);
  }

  /**
   * Create an error import result.
   */
  protected error(errObj: unknown, warnings: string[] = []): ImportResult {
    return importUnknownError(errObj, warnings);
  }

  /**
   * Create an empty file error result.
   */
  protected emptyFileError(message = "File is empty", warnings?: string[]): ImportResult {
    return importEmptyFile(message, warnings);
  }
}
