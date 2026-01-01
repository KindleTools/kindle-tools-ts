/**
 * Obsidian Exporter for Kindle clippings.
 *
 * Generates Markdown files optimized for Obsidian with:
 * - YAML frontmatter (metadata)
 * - Callouts for highlights and notes
 * - Wikilinks for interconnection
 * - Tags support
 *
 * @packageDocumentation
 */

import type { Clipping } from "../types/clipping.js";
import type { ExportedFile, Exporter, ExporterOptions, ExportResult } from "../types/exporter.js";
import { groupByBook } from "../utils/stats.js";

/**
 * Extended options for Obsidian export.
 */
export interface ObsidianExporterOptions extends ExporterOptions {
  /** Add wikilinks to author pages (default: true) */
  wikilinks?: boolean;
  /** Use callouts for highlights (default: true) */
  useCallouts?: boolean;
  /** Default tags to add to all notes */
  tags?: string[];
  /** Folder name for book notes (default: "books") */
  folder?: string;
}

/**
 * Export clippings to Obsidian-compatible Markdown format.
 */
export class ObsidianExporter implements Exporter {
  name = "obsidian";
  extension = ".md";

  /**
   * Export clippings to Obsidian format.
   *
   * Always generates separate files per book (Obsidian best practice).
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with Markdown files
   */
  async export(clippings: Clipping[], options?: ObsidianExporterOptions): Promise<ExportResult> {
    try {
      const grouped = groupByBook(clippings);
      const files: ExportedFile[] = [];
      const folder = options?.folder ?? "books";

      for (const [title, bookClippings] of grouped) {
        const first = bookClippings[0];
        if (!first) continue;

        const content = this.generateBookNote(bookClippings, options);
        const safeTitle = this.sanitizeFilename(title);

        files.push({
          path: `${folder}/${safeTitle}.md`,
          content,
        });
      }

      return {
        success: true,
        output: files.map((f) => f.content).join("\n\n---\n\n"),
        files,
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
   * Generate a complete Obsidian note for a book.
   */
  private generateBookNote(clippings: Clipping[], options?: ObsidianExporterOptions): string {
    const first = clippings[0];
    if (!first) return "";

    const useCallouts = options?.useCallouts ?? true;
    const useWikilinks = options?.wikilinks ?? true;
    const tags = options?.tags ?? ["kindle", "highlights"];

    const lines: string[] = [];

    // YAML Frontmatter
    lines.push("---");
    lines.push(`title: "${this.escapeYaml(first.title)}"`);
    lines.push(`author: "${this.escapeYaml(first.author)}"`);
    lines.push(`source: kindle`);
    lines.push(`type: book`);
    lines.push(`total_highlights: ${clippings.filter((c) => c.type === "highlight").length}`);
    lines.push(`total_notes: ${clippings.filter((c) => c.type === "note").length}`);
    lines.push(`date_imported: ${new Date().toISOString().split("T")[0]}`);
    lines.push(`tags:`);
    for (const tag of tags) {
      lines.push(`  - ${tag}`);
    }
    lines.push("---");
    lines.push("");

    // Title
    lines.push(`# ${first.title}`);
    lines.push("");

    // Author with optional wikilink
    if (useWikilinks) {
      lines.push(`**Author:** [[${first.author}]]`);
    } else {
      lines.push(`**Author:** ${first.author}`);
    }
    lines.push("");

    // Stats summary
    const highlights = clippings.filter((c) => c.type === "highlight");
    const notes = clippings.filter((c) => c.type === "note");
    const bookmarks = clippings.filter((c) => c.type === "bookmark");

    lines.push("## 📊 Summary");
    lines.push("");
    lines.push(`- **Highlights:** ${highlights.length}`);
    lines.push(`- **Notes:** ${notes.length}`);
    lines.push(`- **Bookmarks:** ${bookmarks.length}`);
    lines.push("");

    // Highlights section
    if (highlights.length > 0) {
      lines.push("## 📝 Highlights");
      lines.push("");

      for (const clipping of highlights) {
        this.appendHighlight(lines, clipping, useCallouts);
      }
    }

    // Standalone notes section (notes not linked to highlights)
    const standaloneNotes = notes.filter((n) => !n.linkedHighlightId);
    if (standaloneNotes.length > 0) {
      lines.push("## 💭 Notes");
      lines.push("");

      for (const clipping of standaloneNotes) {
        this.appendNote(lines, clipping, useCallouts);
      }
    }

    // Bookmarks section
    if (bookmarks.length > 0) {
      lines.push("## 🔖 Bookmarks");
      lines.push("");

      for (const clipping of bookmarks) {
        lines.push(`- Location ${clipping.location.raw} (Page ${clipping.page ?? "?"})`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Append a highlight to the content lines.
   */
  private appendHighlight(lines: string[], clipping: Clipping, useCallouts: boolean): void {
    const locationInfo = `Page ${clipping.page ?? "?"}, Location ${clipping.location.raw}`;

    if (useCallouts) {
      lines.push(`> [!quote] ${locationInfo}`);
      // Split content by lines for proper callout formatting
      const contentLines = clipping.content.split("\n");
      for (const line of contentLines) {
        lines.push(`> ${line}`);
      }

      // Add linked note if present
      if (clipping.note) {
        lines.push(">");
        lines.push(`> [!note] My Note`);
        lines.push(`> ${clipping.note}`);
      }
    } else {
      lines.push(`> ${clipping.content}`);
      lines.push(`> — ${locationInfo}`);

      if (clipping.note) {
        lines.push("");
        lines.push(`**Note:** ${clipping.note}`);
      }
    }

    lines.push("");
  }

  /**
   * Append a standalone note to the content lines.
   */
  private appendNote(lines: string[], clipping: Clipping, useCallouts: boolean): void {
    const locationInfo = `Location ${clipping.location.raw}`;

    if (useCallouts) {
      lines.push(`> [!note] ${locationInfo}`);
      lines.push(`> ${clipping.content}`);
    } else {
      lines.push(`📝 **${locationInfo}:**`);
      lines.push(clipping.content);
    }

    lines.push("");
  }

  /**
   * Escape special characters for YAML strings.
   */
  private escapeYaml(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, " ");
  }

  /**
   * Sanitize a string for use as a filename.
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
  }
}
