/**
 * Base exporter abstract class.
 *
 * Provides common functionality for all exporters:
 * - Standardized error handling
 * - Access to shared utility functions
 * - Template method pattern for export operations
 *
 * Exporters can extend this class to benefit from shared functionality,
 * or implement the Exporter interface directly for full control.
 *
 * @packageDocumentation
 */

import type { Clipping } from "../../types/clipping.js";
import type {
  AuthorCase,
  ExportedFile,
  Exporter,
  ExporterOptions,
  ExportResult,
} from "../../types/exporter.js";
import {
  applyCase as applyCaseUtil,
  createErrorResult,
  createSuccessResult,
  escapeCSV as escapeCSVUtil,
  escapeHtml as escapeHtmlUtil,
  escapeYaml as escapeYamlUtil,
  sanitizeFilename as sanitizeFilenameUtil,
} from "./exporter-utils.js";

/**
 * Abstract base class for exporters.
 *
 * Provides common functionality and utilities while allowing subclasses
 * to implement their specific export logic.
 *
 * @example
 * ```typescript
 * export class MyExporter extends BaseExporter {
 *   name = "my-format";
 *   extension = ".my";
 *
 *   protected async doExport(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult> {
 *     const content = this.generateContent(clippings);
 *     return this.success(content);
 *   }
 *
 *   private generateContent(clippings: Clipping[]): string {
 *     // Your custom logic here
 *   }
 * }
 * ```
 */
export abstract class BaseExporter implements Exporter {
  /** Name of the exporter */
  abstract readonly name: string;

  /** File extension for output */
  abstract readonly extension: string;

  /**
   * Export clippings to the target format.
   *
   * This method provides standardized error handling.
   * Subclasses should override `doExport` for their specific logic.
   *
   * @param clippings - Array of clippings to export
   * @param options - Export options
   * @returns Export result
   */
  async export(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult> {
    try {
      return await this.doExport(clippings, options);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * Implement this method with the actual export logic.
   *
   * @param clippings - Array of clippings to export
   * @param options - Export options
   * @returns Export result
   */
  protected abstract doExport(
    clippings: Clipping[],
    options?: ExporterOptions,
  ): Promise<ExportResult>;

  // ========================
  // Result Helpers
  // ========================

  /**
   * Create a successful export result.
   */
  protected success(output: string | Uint8Array, files?: ExportedFile[]): ExportResult {
    return createSuccessResult(output, files);
  }

  /**
   * Create an error export result.
   */
  protected error(err: unknown): ExportResult {
    return createErrorResult(err);
  }

  // ========================
  // String Utilities
  // ========================

  /**
   * Sanitize a string for use as a filename.
   */
  protected sanitizeFilename(name: string, maxLength = 100): string {
    return sanitizeFilenameUtil(name, maxLength);
  }

  /**
   * Apply case transformation to a string.
   */
  protected applyCase(str: string, authorCase: AuthorCase): string {
    return applyCaseUtil(str, authorCase);
  }

  /**
   * Escape special characters for YAML strings.
   */
  protected escapeYaml(str: string): string {
    return escapeYamlUtil(str);
  }

  /**
   * Escape HTML special characters.
   */
  protected escapeHtml(str: string): string {
    return escapeHtmlUtil(str);
  }

  /**
   * Escape a value for CSV format.
   */
  protected escapeCSV(value: string): string {
    return escapeCSVUtil(value);
  }
}
