/**
 * CSV Exporter for Kindle clippings.
 *
 * @packageDocumentation
 */

import type { Clipping } from "../types/clipping.js";
import type { ExporterOptions, ExportResult } from "./index.js";
import { BaseExporter } from "./shared/index.js";

/**
 * Export clippings to CSV format.
 */
export class CsvExporter extends BaseExporter {
  readonly name = "csv";
  readonly extension = ".csv";

  /**
   * Export clippings to CSV.
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with CSV string
   */
  protected async doExport(
    clippings: Clipping[],
    options?: ExporterOptions,
  ): Promise<ExportResult> {
    const includeClippingTags = options?.includeClippingTags ?? true;

    const headers = [
      "id",
      "title",
      "author",
      "type",
      "page",
      "location",
      "date",
      "content",
      "wordCount",
      "tags",
    ];

    const rows: string[] = [headers.join(",")];

    for (const clipping of clippings) {
      // Format tags as semicolon-separated string (if includeClippingTags is true)
      const tagsValue = includeClippingTags ? (clipping.tags?.join("; ") ?? "") : "";

      const row = [
        this.escapeCSV(clipping.id),
        this.escapeCSV(clipping.title),
        this.escapeCSV(clipping.author || this.DEFAULT_UNKNOWN_AUTHOR),
        this.escapeCSV(clipping.type),
        clipping.page?.toString() ?? "",
        this.escapeCSV(clipping.location.raw),
        clipping.date?.toISOString() ?? "",
        this.escapeCSV(clipping.content),
        clipping.wordCount.toString(),
        this.escapeCSV(tagsValue),
      ];

      rows.push(row.join(","));
    }

    // Add BOM for Excel compatibility
    const bom = "\uFEFF";
    const output = bom + rows.join("\n");

    return this.success(output);
  }
}
