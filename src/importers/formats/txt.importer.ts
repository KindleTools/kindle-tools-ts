/**
 * TXT Importer for Kindle clippings.
 *
 * Imports clippings from standard "My Clippings.txt" files.
 * This wraps the core parser to conform to the Importer interface.
 *
 * @packageDocumentation
 */

import type { ImportResult } from "../core/types.js";
import { BaseImporter } from "../shared/base-importer.js";
import { parseString } from "./txt/parser.js";

/**
 * Import clippings from standard "My Clippings.txt" format.
 */
export class TxtImporter extends BaseImporter {
  readonly name = "txt";
  readonly extensions = [".txt"];

  /**
   * Import clippings from TXT content.
   */
  protected async doImport(content: string): Promise<ImportResult> {
    // Parse without options to get raw clippings (no filtering/processing)
    // The unified pipeline in the main application will handle filtering and processing.
    const parseResult = parseString(content);

    if (parseResult.clippings.length === 0 && parseResult.warnings.length > 0) {
      // If no clippings but we have warnings, treat it as a potential error,
      // but still return success=false with warnings
      return this.error(
        new Error("No valid clippings found in TXT file"),
        parseResult.warnings.map((w) => w.message),
      );
    }

    const meta = {
      detectedLanguage: parseResult.meta.detectedLanguage,
      fileSize: parseResult.meta.fileSize,
      parseTime: parseResult.meta.parseTime,
      totalBlocks: parseResult.meta.totalBlocks,
      parsedBlocks: parseResult.meta.parsedBlocks,
    };

    return this.success(
      parseResult.clippings,
      parseResult.warnings.map((w) => w.message),
      meta,
    );
  }
}
