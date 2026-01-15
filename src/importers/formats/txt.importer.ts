/**
 * TXT Importer for Kindle clippings.
 *
 * Imports clippings from standard "My Clippings.txt" files.
 * This wraps the core parser to conform to the Importer interface.
 *
 * @packageDocumentation
 */

import { ClippingImportSchema } from "#schemas/clipping.schema.js";
import type { ImportResult } from "../core/types.js";
import { BaseImporter } from "../shared/base-importer.js";
import { parseString } from "./txt/parser.js";

/**
 * Import clippings from standard "My Clippings.txt" format.
 *
 * This importer parses Kindle's native clipping format and validates
 * each clipping against the Zod schema for consistent data quality.
 */
export class TxtImporter extends BaseImporter {
  readonly name = "txt";
  readonly extensions = [".txt"];

  /**
   * Import clippings from TXT content.
   *
   * Each parsed clipping is validated against ClippingImportSchema to ensure
   * data consistency. Invalid clippings generate warnings but don't stop processing.
   */
  protected async doImport(content: string): Promise<ImportResult> {
    // Parse without options to get raw clippings (no filtering/processing)
    // The unified pipeline in the main application will handle filtering and processing.
    const parseResult = await parseString(content);

    if (parseResult.clippings.length === 0 && parseResult.warnings.length > 0) {
      // If no clippings but we have warnings, treat it as a potential error,
      // but still return success=false with warnings
      return this.error(
        new Error("No valid clippings found in TXT file"),
        parseResult.warnings.map((w) => w.message),
      );
    }

    // Validate each clipping against the schema (optional post-parse validation)
    const warnings = parseResult.warnings.map((w) => w.message);
    const validatedClippings = [];

    for (let i = 0; i < parseResult.clippings.length; i++) {
      const clipping = parseResult.clippings[i];
      if (!clipping) continue;

      const validationResult = ClippingImportSchema.safeParse(clipping);

      if (!validationResult.success) {
        // Log warning but still include the clipping (lenient mode)
        const issues = validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        warnings.push(`Clipping ${i + 1} validation warning: ${issues}`);
        // Still add the original clipping - the parser already produces valid structure
        validatedClippings.push(clipping);
      } else {
        validatedClippings.push(clipping);
      }
    }

    const meta = {
      detectedLanguage: parseResult.meta.detectedLanguage,
      fileSize: parseResult.meta.fileSize,
      parseTime: parseResult.meta.parseTime,
      totalBlocks: parseResult.meta.totalBlocks,
      parsedBlocks: parseResult.meta.parsedBlocks,
    };

    return this.success(validatedClippings, warnings, meta);
  }
}
