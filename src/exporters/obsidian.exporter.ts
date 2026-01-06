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
import type {
  AuthorCase,
  ExportedFile,
  ExporterOptions,
  ExportResult,
  FolderStructure,
} from "../types/exporter.js";
import { formatDateISO } from "../utils/dates.js";
import { getPageInfo } from "../utils/page-utils.js";
import { groupByBook } from "../utils/stats.js";
import { BaseExporter } from "./shared/index.js";

/**
 * Extended options for Obsidian export.
 */
export interface ObsidianExporterOptions extends ExporterOptions {
  /** Add wikilinks to author pages (default: true) */
  wikilinks?: boolean;
  /** Use callouts for highlights (default: true) */
  useCallouts?: boolean;
  /** Default tags to add to all notes (default: []) */
  tags?: string[];
  /** Folder name for book notes (default: "books") */
  folder?: string;
  /**
   * Folder structure for organizing files.
   * - 'flat': All files in the root folder
   * - 'by-book': One folder per book (containing a single file)
   * - 'by-author': Root > Author > Book (default)
   * - 'by-author-book': Author folder > Book subfolder
   */
  folderStructure?: FolderStructure;
  /**
   * Case transformation for author folder names.
   * - 'original': Keep original case
   * - 'uppercase': Convert to UPPERCASE (default)
   * - 'lowercase': Convert to lowercase
   */
  authorCase?: AuthorCase;
  /**
   * Include clipping tags in the frontmatter.
   * Tags are merged with default tags. (default: true)
   */
  includeClippingTags?: boolean;
  /**
   * Estimate page numbers from Kindle locations when not available.
   * Uses ~16 locations per page as a heuristic.
   * Default: true
   */
  estimatePages?: boolean;
}

/**
 * Export clippings to Obsidian-compatible Markdown format.
 */
export class ObsidianExporter extends BaseExporter {
  readonly name = "obsidian";
  readonly extension = ".md";

  /**
   * Export clippings to Obsidian format.
   *
   * Always generates separate files per book (Obsidian best practice).
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with Markdown files
   */
  protected async doExport(
    clippings: Clipping[],
    options?: ObsidianExporterOptions,
  ): Promise<ExportResult> {
    const grouped = groupByBook(clippings);
    const files: ExportedFile[] = [];
    const folder = options?.folder ?? "books";
    const folderStructure = options?.folderStructure ?? "by-author";
    const authorCase = options?.authorCase ?? "uppercase";

    for (const [title, bookClippings] of grouped) {
      const first = bookClippings[0];
      if (!first) continue;

      const content = this.generateBookNote(bookClippings, options);
      const safeTitle = this.sanitizeFilename(title);
      const safeAuthor = this.sanitizeFilename(
        this.applyCase(first.author || "Unknown Author", authorCase),
      );

      // Determine file path based on folder structure
      const filePath = this.generateFilePath(folder, safeAuthor, safeTitle, folderStructure);

      files.push({
        path: filePath,
        content,
      });
    }

    return this.success(files.map((f) => f.content).join("\n\n---\n\n"), files);
  }

  /**
   * Generate a complete Obsidian note for a book.
   */
  private generateBookNote(clippings: Clipping[], options?: ObsidianExporterOptions): string {
    const first = clippings[0];
    if (!first) return "";

    const useCallouts = options?.useCallouts ?? true;
    const useWikilinks = options?.wikilinks ?? true;
    const defaultTags = options?.tags ?? [];
    const includeClippingTags = options?.includeClippingTags ?? true;
    const estimatePages = options?.estimatePages ?? true;

    // Collect all unique tags from clippings
    const allTags = new Set<string>(defaultTags);
    if (includeClippingTags) {
      for (const clipping of clippings) {
        if (clipping.tags) {
          for (const tag of clipping.tags) {
            allTags.add(tag);
          }
        }
      }
    }

    const lines: string[] = [];

    // YAML Frontmatter
    lines.push("---");
    lines.push(`title: "${this.escapeYaml(first.title)}"`);
    lines.push(`author: "${this.escapeYaml(first.author)}"`);
    lines.push(`source: kindle`);
    lines.push(`type: book`);
    lines.push(`total_highlights: ${clippings.filter((c) => c.type === "highlight").length}`);
    lines.push(`total_notes: ${clippings.filter((c) => c.type === "note").length}`);

    // Add creation date from the first clipping (book start) or current date
    const createdDate = first.date ? formatDateISO(first.date) : formatDateISO(new Date());
    lines.push(`created: ${createdDate}`);
    lines.push(`date_imported: ${formatDateISO(new Date())}`);

    lines.push(`tags:`);
    for (const tag of allTags) {
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
        this.appendHighlight(lines, clipping, useCallouts, estimatePages);
      }
    }

    // Standalone notes section (notes not linked to highlights)
    const standaloneNotes = notes.filter((n) => !n.linkedHighlightId);
    if (standaloneNotes.length > 0) {
      lines.push("## 💭 Notes");
      lines.push("");

      for (const clipping of standaloneNotes) {
        this.appendNote(lines, clipping, useCallouts, estimatePages);
      }
    }

    // Bookmarks section
    if (bookmarks.length > 0) {
      lines.push("## 🔖 Bookmarks");
      lines.push("");

      for (const clipping of bookmarks) {
        const pageInfo = this.getPageDisplay(clipping, estimatePages);
        lines.push(`- Location ${clipping.location.raw} (${pageInfo})`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Helper to get display string for page number
   */
  private getPageDisplay(clipping: Clipping, estimate: boolean): string {
    if (clipping.page !== null) {
      return `Page ${clipping.page}`;
    }
    if (estimate && clipping.location.start > 0) {
      const info = getPageInfo(null, clipping.location);
      return `Page ~${info.page}`;
    }
    return "Page ?";
  }

  /**
   * Append a highlight to the content lines.
   */
  private appendHighlight(
    lines: string[],
    clipping: Clipping,
    useCallouts: boolean,
    estimate: boolean,
  ): void {
    const pageInfo = this.getPageDisplay(clipping, estimate);
    const locationInfo = `${pageInfo}, Location ${clipping.location.raw}`;

    if (useCallouts) {
      lines.push(`> [!quote] ${locationInfo}`);
      // Split content by lines for proper callout formatting
      const contentLines = clipping.content.split("\n");
      for (const line of contentLines) {
        lines.push(`> ${line}`);
      }

      // Add linked note if present (only if not consumed as tags)
      const noteWasConsumedAsTags = clipping.tags && clipping.tags.length > 0;
      if (clipping.note && !noteWasConsumedAsTags) {
        lines.push(">");
        lines.push(`> [!note] My Note`);
        lines.push(`> ${clipping.note}`);
      }
    } else {
      lines.push(`> ${clipping.content}`);
      lines.push(`> — ${locationInfo}`);

      // Add linked note if present (only if not consumed as tags)
      const noteWasConsumedAsTags = clipping.tags && clipping.tags.length > 0;
      if (clipping.note && !noteWasConsumedAsTags) {
        lines.push("");
        lines.push(`**Note:** ${clipping.note}`);
      }
    }

    lines.push("");
  }

  /**
   * Append a standalone note to the content lines.
   */
  private appendNote(
    lines: string[],
    clipping: Clipping,
    useCallouts: boolean,
    estimate: boolean,
  ): void {
    const pageInfo = this.getPageDisplay(clipping, estimate);
    // For standalone notes, location is more relevant, but page is nice too
    const locationInfo = `Location ${clipping.location.raw} (${pageInfo})`;

    if (useCallouts) {
      lines.push(`> [!note] ${locationInfo}`);
      lines.push(`> ${clipping.content}`);
    } else {
      lines.push(`📝 **${locationInfo}:**`);
      lines.push(clipping.content);
    }

    lines.push("");
  }
}
