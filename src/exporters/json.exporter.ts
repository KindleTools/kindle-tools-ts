/**
 * JSON Exporter for Kindle clippings.
 *
 * @packageDocumentation
 */

import type { Clipping } from "../types/clipping.js";
import type { Exporter, ExporterOptions, ExportResult } from "../types/exporter.js";
import { groupByBook } from "../utils/stats.js";

/**
 * Export clippings to JSON format.
 */
export class JsonExporter implements Exporter {
  name = "json";
  extension = ".json";

  /**
   * Export clippings to JSON.
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with JSON string
   */
  async export(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult> {
    try {
      let data: unknown;

      if (options?.groupByBook) {
        // Group by book
        const grouped = groupByBook(clippings);
        const books: Record<string, Clipping[]> = {};

        for (const [title, bookClippings] of grouped) {
          books[title] = this.prepareClippings(bookClippings, options);
        }

        data =
          options?.includeStats !== false
            ? { books, meta: { totalBooks: grouped.size, totalClippings: clippings.length } }
            : { books };
      } else {
        // Flat array
        const preparedClippings = this.prepareClippings(clippings, options);
        data =
          options?.includeStats !== false
            ? { clippings: preparedClippings, meta: { total: clippings.length } }
            : { clippings: preparedClippings };
      }

      const indent = options?.pretty ? 2 : undefined;
      const output = JSON.stringify(data, null, indent);

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
   * Prepare clippings for export (remove raw fields if requested, ensure tags field).
   */
  private prepareClippings(clippings: Clipping[], options?: ExporterOptions): Clipping[] {
    const includeClippingTags = options?.includeClippingTags ?? true;

    return clippings.map((c) => {
      // Start with the clipping, optionally removing raw fields
      let prepared: Clipping;
      if (options?.includeRaw) {
        prepared = { ...c };
      } else {
        const { titleRaw: _titleRaw, authorRaw: _authorRaw, contentRaw: _contentRaw, ...rest } = c;
        prepared = rest as Clipping;
      }

      // Ensure tags field is always present (as empty array if no tags)
      if (includeClippingTags) {
        prepared.tags = c.tags ?? [];
      }

      return prepared;
    });
  }
}
