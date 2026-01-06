/**
 * Importer factory for creating importers based on file extensions.
 *
 * @packageDocumentation
 */

import { CsvImporter } from "./csv.importer.js";
import { JsonImporter } from "./json.importer.js";
import { TxtImporter } from "./txt/index.js";
import type { Importer } from "./types.js";

/**
 * Factory for creating importers.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Factory pattern preference
export class ImporterFactory {
  /**
   * Get an importer instance for the given file path.
   *
   * @param filePath - Path to the file to import
   * @returns Importer instance (defaults to TxtImporter)
   *
   * @example
   * ```typescript
   * const importer = ImporterFactory.getImporter("clippings.json");
   * const result = await importer.import(content);
   * ```
   */
  static getImporter(filePath: string): Importer {
    const lowerPath = filePath.toLowerCase();

    if (lowerPath.endsWith(".json")) {
      return new JsonImporter();
    }

    if (lowerPath.endsWith(".csv")) {
      return new CsvImporter();
    }

    // Default to TXT importer for standard "My Clippings.txt" or unknown extensions
    // that might be raw text
    return new TxtImporter();
  }
}
