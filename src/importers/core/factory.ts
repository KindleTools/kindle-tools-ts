/**
 * Importer factory for creating importers based on file extensions.
 *
 * @packageDocumentation
 */

import { CsvImporter } from "#importers/formats/csv.importer.js";
import { JsonImporter } from "#importers/formats/json.importer.js";
import { TxtImporter } from "#importers/formats/txt.importer.js";
import type { Importer } from "./types.js";

/**
 * Factory for creating importers.
 *
 * Implements the Registry pattern to allow dynamic registration of new importer types based on file extensions.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Factory pattern preference
export class ImporterFactory {
  // Registry map to store importer constructors by file extension

  private static registry = new Map<string, new () => Importer>();

  // Default importer if no extension matches

  private static defaultImporter: new () => Importer = TxtImporter;

  // Initialize default importers
  static {
    ImporterFactory.register(".json", JsonImporter);
    ImporterFactory.register(".csv", CsvImporter);
    ImporterFactory.register(".txt", TxtImporter);
  }

  /**
   * Register a new importer for a file extension.
   *
   * @param extension - File extension (e.g., ".xml") or array of extensions
   * @param importerClass - Constructor for the importer class
   */

  static register(extension: string | string[], importerClass: new () => Importer): void {
    const exts = Array.isArray(extension) ? extension : [extension];
    for (const ext of exts) {
      const normalized = ext.toLowerCase().startsWith(".")
        ? ext.toLowerCase()
        : `.${ext.toLowerCase()}`;
      ImporterFactory.registry.set(normalized, importerClass);
    }
  }

  /**
   * Set the default importer to use when no extension matches.
   */

  static setDefaultImporter(importerClass: new () => Importer): void {
    ImporterFactory.defaultImporter = importerClass;
  }

  /**
   * Get an importer instance for the given file path.
   *
   * @param filePath - Path to the file to import
   * @returns Importer instance (defaults to TxtImporter)
   */
  static getImporter(filePath: string): Importer {
    const lowerPath = filePath.toLowerCase();

    // Find matching extension
    for (const [ext, ImporterClass] of ImporterFactory.registry) {
      if (lowerPath.endsWith(ext)) {
        return new ImporterClass();
      }
    }

    // Default fallback
    return new ImporterFactory.defaultImporter();
  }
}
