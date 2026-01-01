/**
 * Markdown Exporter for Kindle clippings.
 *
 * @packageDocumentation
 */

import type { Clipping } from "../types/clipping.js";
import type { ExportedFile, Exporter, ExporterOptions, ExportResult } from "../types/exporter.js";
import { groupByBook } from "../utils/stats.js";

/**
 * Export clippings to Markdown format.
 */
export class MarkdownExporter implements Exporter {
  name = "markdown";
  extension = ".md";

  /**
   * Export clippings to Markdown.
   *
   * If groupByBook is true, generates separate files per book.
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with Markdown content
   */
  async export(clippings: Clipping[], options?: ExporterOptions): Promise<ExportResult> {
    try {
      if (options?.groupByBook) {
        return this.exportGrouped(clippings);
      }

      return this.exportSingle(clippings);
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Export all clippings to a single Markdown file.
   */
  private exportSingle(clippings: Clipping[]): ExportResult {
    const lines: string[] = ["# Kindle Highlights", "", `*${clippings.length} clippings*`, ""];

    const grouped = groupByBook(clippings);

    for (const [, bookClippings] of grouped) {
      const first = bookClippings[0];
      if (!first) continue;

      lines.push(`## ${first.title}`);
      lines.push(`*${first.author}*`, "");

      for (const clipping of bookClippings) {
        this.appendClipping(lines, clipping);
      }

      lines.push("---", "");
    }

    return {
      success: true,
      output: lines.join("\n"),
    };
  }

  /**
   * Export clippings grouped by book into separate files.
   */
  private exportGrouped(clippings: Clipping[]): ExportResult {
    const grouped = groupByBook(clippings);
    const files: ExportedFile[] = [];

    for (const [title, bookClippings] of grouped) {
      const first = bookClippings[0];
      if (!first) continue;

      const lines: string[] = [`# ${first.title}`, `*${first.author}*`, ""];

      for (const clipping of bookClippings) {
        this.appendClipping(lines, clipping);
      }

      // Create safe filename
      const safeTitle = title.replace(/[<>:"/\\|?*]/g, "-").slice(0, 100);

      files.push({
        path: `${safeTitle}.md`,
        content: lines.join("\n"),
      });
    }

    return {
      success: true,
      output: files.map((f) => f.content).join("\n\n---\n\n"),
      files,
    };
  }

  /**
   * Append a clipping to the lines array.
   */
  private appendClipping(lines: string[], clipping: Clipping): void {
    if (clipping.type === "highlight") {
      lines.push(`> ${clipping.content}`);
      lines.push(`> — Page ${clipping.page ?? "?"}, Location ${clipping.location.raw}`, "");

      if (clipping.note) {
        lines.push(`**Note:** ${clipping.note}`, "");
      }
    } else if (clipping.type === "note") {
      lines.push(`📝 **Note (Location ${clipping.location.raw}):**`);
      lines.push(clipping.content, "");
    } else if (clipping.type === "bookmark") {
      lines.push(`🔖 Bookmark at Location ${clipping.location.raw}`, "");
    }
  }
}
