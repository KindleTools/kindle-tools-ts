/**
 * CSV Exporter for Kindle clippings.
 *
 * @packageDocumentation
 */

import type { Clipping } from "../types/clipping.js";
import type { Exporter, ExporterOptions, ExportResult } from "../types/exporter.js";

/**
 * Export clippings to CSV format.
 */
export class CsvExporter implements Exporter {
  name = "csv";
  extension = ".csv";

  /**
   * Export clippings to CSV.
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with CSV string
   */
  async export(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult> {
    try {
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
          this.escapeCSV(clipping.author),
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

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Escape a value for CSV.
   * Wraps in quotes and escapes internal quotes.
   */
  private escapeCSV(value: string): string {
    if (!value) return '""';

    // Replace newlines with spaces
    const cleaned = value.replace(/[\r\n]+/g, " ");

    // Escape quotes by doubling them
    const escaped = cleaned.replace(/"/g, '""');

    // Wrap in quotes
    return `"${escaped}"`;
  }
}
