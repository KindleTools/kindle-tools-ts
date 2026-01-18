/**
 * Base exporter abstract class.
 *
 * Provides common functionality for all exporters:
 * - Standardized error handling with neverthrow Result
 * - Options validation with Zod
 * - Access to shared utility functions
 * - Template method pattern for export operations
 *
 * Exporters can extend this class to benefit from shared functionality,
 * or implement the Exporter interface directly for full control.
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import { groupByBook } from "#domain/analytics/stats.js";
import {
  type ExportedFile,
  type ExportResult,
  exportInvalidOptions,
  exportSuccess,
  exportUnknownError,
  zodIssuesToValidationIssues,
} from "#errors";
import type {
  AuthorCase,
  Exporter,
  ExporterOptions,
  FolderStructure,
} from "#exporters/core/types.js";
import { type ExporterOptionsParsed, ExporterOptionsSchema } from "#schemas/exporter.schema.js";
import { createArchiver } from "#utils/archive/factory.js";
import { formatZodError } from "#utils/system/errors.js";
import {
  applyCase as applyCaseUtil,
  collectAllTags as collectAllTagsUtil,
  DEFAULT_EXPORT_TITLE,
  DEFAULT_UNKNOWN_AUTHOR,
  escapeCSV as escapeCSVUtil,
  escapeHtml as escapeHtmlUtil,
  escapeYaml as escapeYamlUtil,
  generateFilePath as generateFilePathUtil,
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
 *   protected async doExport(clippings: Clipping[], options: ExporterOptionsParsed): Promise<ExportResult> {
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
   * This method provides standardized error handling and options validation.
   * Subclasses should override `doExport` for their specific logic.
   *
   * @param clippings - Array of clippings to export
   * @param options - Export options (will be validated and defaults applied)
   * @returns Export result wrapped in Result type
   */
  async export(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult> {
    try {
      // Validate and parse options with Zod
      const parseResult = ExporterOptionsSchema.safeParse(options ?? {});

      if (!parseResult.success) {
        const errorMessage = `Invalid exporter options:\n${formatZodError(parseResult.error)}`;
        return exportInvalidOptions(
          errorMessage,
          zodIssuesToValidationIssues(parseResult.error.issues),
        );
      }

      const validatedOptions = parseResult.data;

      const result = await this.doExport(clippings, validatedOptions);

      // Handle archiving if requested
      if (result.isOk() && validatedOptions.archive) {
        const format = validatedOptions.archive;
        const archiverResult = createArchiver(format);

        if (archiverResult.isErr()) {
          return this.error(archiverResult.error);
        }

        const archiver = archiverResult.value;
        const exportTitle = validatedOptions.title || this.DEFAULT_EXPORT_TITLE;
        const archiveName = `${this.sanitizeFilename(exportTitle)}.${format}`;

        if (result.value.files) {
          // Multiple files
          for (const file of result.value.files) {
            archiver.addFile(file.path, file.content);
          }
        } else {
          // Single file
          // Since result.value.files is undefined, we need a filename for the single content.
          // We can construct one based on the exporter name or title.
          const filename = `${this.sanitizeFilename(this.name)}-export${this.extension}`;
          archiver.addFile(filename, result.value.output);
        }

        const archiveContent = await archiver.finalize();

        return this.success(archiveContent, [
          {
            path: archiveName,
            content: archiveContent,
          },
        ]);
      }

      return result;
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * Implement this method with the actual export logic.
   *
   * @param clippings - Array of clippings to export
   * @param options - Validated export options with defaults applied
   * @returns Export result
   */
  protected abstract doExport(
    clippings: Clipping[],
    options: ExporterOptionsParsed,
  ): Promise<ExportResult>;

  // ========================
  // Result Helpers
  // ========================

  /**
   * Create a successful export result.
   */
  protected success(output: string | Uint8Array, files?: ExportedFile[]): ExportResult {
    return exportSuccess(output, files);
  }

  /**
   * Create an error export result.
   */
  protected error(err: unknown): ExportResult {
    return exportUnknownError(err);
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

  /**
   * Generate file path based on folder structure.
   */
  protected generateFilePath(
    baseFolder: string,
    author: string,
    title: string,
    structure: FolderStructure,
    extension?: string,
  ): string {
    return generateFilePathUtil(baseFolder, author, title, structure, extension || this.extension);
  }

  /**
   * Collect all unique tags from clippings and default tags.
   */
  protected collectAllTags(
    clippings: Clipping[],
    defaultTags: string[] = [],
    includeClippingTags: boolean = true,
  ): Set<string> {
    return collectAllTagsUtil(clippings, defaultTags, includeClippingTags);
  }

  // ========================
  // Grouping Helpers
  // ========================

  /**
   * Helper to generate separate files for each book.
   *
   * @param clippings - All clippings to export
   * @param fileExtension - File extension (including dot, e.g., ".html")
   * @param renderFn - Function to render content for a single book
   */
  protected generateGroupedFiles(
    clippings: Clipping[],
    fileExtension: string,
    renderFn: (bookTitle: string, bookClippings: Clipping[]) => string,
  ): ExportedFile[] {
    const grouped = groupByBook(clippings);
    const files: ExportedFile[] = [];

    for (const [bookTitle, bookClippings] of grouped) {
      const content = renderFn(bookTitle, bookClippings);
      const safeTitle = this.sanitizeFilename(bookTitle);

      files.push({
        path: `${safeTitle}${fileExtension}`,
        content,
      });
    }

    return files;
  }

  // ========================
  // Constants
  // ========================

  protected readonly DEFAULT_UNKNOWN_AUTHOR: string = DEFAULT_UNKNOWN_AUTHOR;
  protected readonly DEFAULT_EXPORT_TITLE: string = DEFAULT_EXPORT_TITLE;
}
