/**
 * Exporter factory for creating exporters based on format.
 *
 * @packageDocumentation
 */

import { CsvExporter } from "#exporters/formats/csv.exporter.js";
import { HtmlExporter } from "#exporters/formats/html.exporter.js";
import { JoplinExporter } from "#exporters/formats/joplin.exporter.js";
import { JsonExporter } from "#exporters/formats/json.exporter.js";
import { MarkdownExporter } from "#exporters/formats/markdown.exporter.js";
import { ObsidianExporter } from "#exporters/formats/obsidian.exporter.js";
import type { Exporter } from "./types.js";

/**
 * Factory for creating exporters.
 *
 * Implements the Registry pattern to allow dynamic registration of new exporter formats.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Factory pattern preference
export class ExporterFactory {
  // Registry map to store exporter constructors

  private static registry = new Map<string, new () => Exporter>();

  // Initialize default exporters
  static {
    ExporterFactory.register("json", JsonExporter);
    ExporterFactory.register("csv", CsvExporter);
    ExporterFactory.register("md", MarkdownExporter);
    ExporterFactory.register("markdown", MarkdownExporter); // Alias
    ExporterFactory.register("obsidian", ObsidianExporter);
    ExporterFactory.register("joplin", JoplinExporter);
    ExporterFactory.register("html", HtmlExporter);
  }

  /**
   * Register a new exporter implementation.
   *
   * @param format - Format identifier (case-insensitive)
   * @param exporterClass - Constructor for the exporter class
   */

  static register(format: string, exporterClass: new () => Exporter): void {
    ExporterFactory.registry.set(format.toLowerCase(), exporterClass);
  }

  /**
   * Get an exporter instance for the given format.
   *
   * @param format - Export format (json, csv, md, obsidian, joplin, html)
   * @returns Exporter instance or null if format is unknown
   */
  static getExporter(format: string): Exporter | null {
    const lowerFormat = format.toLowerCase();
    const ExporterClass = ExporterFactory.registry.get(lowerFormat);

    if (ExporterClass) {
      return new ExporterClass();
    }

    return null;
  }

  /**
   * Get a list of all registered formats.
   */
  static getRegisteredFormats(): string[] {
    return Array.from(ExporterFactory.registry.keys());
  }
}
