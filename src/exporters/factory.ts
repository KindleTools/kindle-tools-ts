/**
 * Exporter factory for creating exporters based on format.
 *
 * @packageDocumentation
 */

import { CsvExporter } from "./csv.exporter.js";
import { HtmlExporter } from "./html.exporter.js";
import { JoplinExporter } from "./joplin.exporter.js";
import { JsonExporter } from "./json.exporter.js";
import { MarkdownExporter } from "./markdown.exporter.js";
import { ObsidianExporter } from "./obsidian.exporter.js";
import type { Exporter } from "./types.js";

/**
 * Factory for creating exporters.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Factory pattern preference
export class ExporterFactory {
  /**
   * Get an exporter instance for the given format.
   *
   * @param format - Export format (json, csv, md, obsidian, joplin, html)
   * @returns Exporter instance or null if format is unknown
   */
  static getExporter(format: string): Exporter | null {
    const lowerFormat = format.toLowerCase();

    switch (lowerFormat) {
      case "json":
        return new JsonExporter();
      case "csv":
        return new CsvExporter();
      case "md":
      case "markdown":
        return new MarkdownExporter();
      case "obsidian":
        return new ObsidianExporter();
      case "joplin":
        return new JoplinExporter();
      case "html":
        return new HtmlExporter();
      default:
        return null;
    }
  }
}
