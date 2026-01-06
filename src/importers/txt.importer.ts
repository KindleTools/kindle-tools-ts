/**
 * TXT Importer for Kindle clippings.
 *
 * Imports clippings from standard "My Clippings.txt" files.
 * This wraps the core parser to conform to the Importer interface.
 *
 * @packageDocumentation
 */

import { parseString } from "../core/parser.js";
import { createErrorImport, createSuccessImport } from "./shared/importer-utils.js";
import type { Importer, ImportResult } from "./types.js";

/**
 * Import clippings from standard "My Clippings.txt" format.
 */
export class TxtImporter implements Importer {
  name = "txt";
  extensions = [".txt"];

  /**
   * Import clippings from TXT content.
   *
   * @param content - TXT file content
   * @returns Import result with clippings
   */
  async import(content: string): Promise<ImportResult> {
    try {
      // Parse without options to get raw clippings (no filtering/processing)
      // The unified pipeline in the main application will handle filtering and processing.
      const parseResult = parseString(content);

      if (parseResult.clippings.length === 0 && parseResult.warnings.length > 0) {
        // If no clippings but we have warnings, treat it as a potential error,
        // but still return success=false with warnings
        return createErrorImport(
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

      return createSuccessImport(
        parseResult.clippings,
        parseResult.warnings.map((w) => w.message),
        meta,
      );
    } catch (error) {
      return createErrorImport(error);
    }
  }
}
