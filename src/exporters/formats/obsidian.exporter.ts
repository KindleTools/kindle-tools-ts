/**
 * Obsidian Exporter for Kindle clippings.
 *
 * Generates Markdown files optimized for Obsidian with:
 * - YAML frontmatter (metadata)
 * - Callouts for highlights and notes
 * - Wikilinks for interconnection
 * - Tags support
 * - Configurable granularity: per-clipping (default) or per-book
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import { formatPage, getEffectivePage } from "#domain/core/locations.js";
import type { ExportedFile } from "#exporters/core/types.js";
import {
  MultiFileExporter,
  type MultiFileExporterOptions,
} from "#exporters/shared/multi-file-exporter.js";
import type { TemplateEngine, TemplateOptions, TemplatePreset } from "#templates/index.js";

/**
 * Extended options for Obsidian export.
 * Extends ExporterOptionsParsed with Obsidian-specific options.
 */
export interface ObsidianExporterOptions extends MultiFileExporterOptions {
  /** Add wikilinks to author pages (default: true) */
  wikilinks?: boolean;
  /** Use callouts for highlights (default: true) */
  useCallouts?: boolean;
  /** Default tags to add to all notes (default: []) */
  tags?: string[];
  /** Folder name for book notes (default: "books") */
  folder?: string;
  /**
   * Estimate page numbers from Kindle locations when not available.
   * Uses ~16 locations per page as a heuristic.
   * Default: true
   */
  estimatePages?: boolean;
  // noteGranularity is inherited from ExporterOptionsParsed (default: "per-clipping")
}

/**
 * Export clippings to Obsidian-compatible Markdown format.
 */
export class ObsidianExporter extends MultiFileExporter {
  readonly name = "obsidian";
  readonly extension = ".md";

  /** Default values for Obsidian-specific options */
  private static readonly DEFAULTS = {
    wikilinks: true,
    useCallouts: true,
    estimatePages: true,
  } as const;

  /**
   * Convert ObsidianExporterOptions to TemplateOptions for the opt helper.
   */
  private toTemplateOptions(options: ObsidianExporterOptions): TemplateOptions {
    return {
      wikilinks: options.wikilinks ?? ObsidianExporter.DEFAULTS.wikilinks,
      useCallouts: options.useCallouts ?? ObsidianExporter.DEFAULTS.useCallouts,
      estimatePages: options.estimatePages ?? ObsidianExporter.DEFAULTS.estimatePages,
    };
  }

  protected override getDefaultPreset(): TemplatePreset {
    return "obsidian";
  }

  protected override generateSummaryContent(files: ExportedFile[]): string {
    return files.map((f) => `# ${f.path}\n${f.content}`).join("\n\n---\n\n");
  }

  /**
   * Process a single book for multi-file export.
   * Supports two granularities:
   * - per-book: One file containing all clippings from the book (default)
   * - per-clipping: One file per clipping
   */
  protected override async processBook(
    clippings: Clipping[],
    options: ObsidianExporterOptions,
    engine: TemplateEngine,
  ): Promise<ExportedFile[]> {
    const first = clippings[0];
    if (!first) return [];

    const granularity = options.noteGranularity ?? "per-book";

    if (granularity === "per-book") {
      return this.processBookAsOneFile(clippings, options, engine);
    }

    return this.processBookAsClippings(clippings, options, engine);
  }

  /**
   * Original per-book behavior: one file per book with all clippings.
   */
  private processBookAsOneFile(
    clippings: Clipping[],
    options: ObsidianExporterOptions,
    engine: TemplateEngine,
  ): ExportedFile[] {
    const first = clippings[0]!;
    const templateOptions = this.toTemplateOptions(options);
    const context = engine.toBookContext(clippings, templateOptions);

    // Apply tag logic
    const optionsTags = options.tags ?? [];
    const includeClippingTags = options.includeClippingTags !== false;

    let finalTags: string[];
    if (includeClippingTags) {
      finalTags = Array.from(new Set([...optionsTags, ...context.tags])).sort();
    } else {
      finalTags = [...optionsTags].sort();
    }

    context.tags = finalTags;
    context.hasTags = finalTags.length > 0;

    const content = engine.renderBookContext(context);

    // Generate file path
    const folderStructure = options.folderStructure;
    const authorCase = options.authorCase;
    const baseFolder = options.folder ?? options.baseFolder ?? "books";
    const safeTitle = this.sanitizeFilename(first.title);
    const safeAuthor = this.sanitizeFilename(
      this.applyCase(first.author || this.DEFAULT_UNKNOWN_AUTHOR, authorCase),
    );

    const filePath = this.generateFilePath(baseFolder, safeAuthor, safeTitle, folderStructure);

    return [{ path: filePath, content }];
  }

  /**
   * Per-clipping behavior: one file per clipping with YAML frontmatter.
   */
  private processBookAsClippings(
    clippings: Clipping[],
    options: ObsidianExporterOptions,
    engine: TemplateEngine,
  ): ExportedFile[] {
    const first = clippings[0]!;
    const files: ExportedFile[] = [];

    const folderStructure = options.folderStructure;
    const authorCase = options.authorCase;
    const baseFolder = options.folder ?? options.baseFolder ?? "books";
    const estimatePages = options.estimatePages ?? ObsidianExporter.DEFAULTS.estimatePages;

    const safeBookTitle = this.sanitizeFilename(first.title);
    const safeAuthor = this.sanitizeFilename(
      this.applyCase(first.author || this.DEFAULT_UNKNOWN_AUTHOR, authorCase),
    );

    // Build base folder path for the book
    let bookFolder: string;
    switch (folderStructure) {
      case "flat":
        bookFolder = `${baseFolder}/${safeBookTitle}`;
        break;
      case "by-book":
        bookFolder = `${baseFolder}/${safeBookTitle}`;
        break;
      case "by-author":
        bookFolder = `${baseFolder}/${safeAuthor}`;
        break;
      case "by-author-book":
      default:
        bookFolder = `${baseFolder}/${safeAuthor}/${safeBookTitle}`;
        break;
    }

    // Process each clipping
    for (const clipping of clippings) {
      // Get formatted page for title template
      const effectivePage = estimatePages
        ? getEffectivePage(clipping.page, clipping.location)
        : (clipping.page ?? 0);

      const formattedPage = formatPage(effectivePage) ?? "[0000]";

      // Generate filename from title template
      const title = engine.renderClippingTitle(clipping, formattedPage);
      const safeTitle = this.sanitizeFilename(title, 60);
      const fileName = `${safeTitle}.md`;
      const filePath = `${bookFolder}/${fileName}`;

      // Generate YAML frontmatter + content
      const content = this.renderClippingWithFrontmatter(clipping, options, engine);

      files.push({ path: filePath, content });
    }

    return files;
  }

  /**
   * Render a single clipping with Obsidian-style YAML frontmatter.
   */
  private renderClippingWithFrontmatter(
    clipping: Clipping,
    options: ObsidianExporterOptions,
    engine: TemplateEngine,
  ): string {
    const optionsTags = options.tags ?? [];
    const includeClippingTags = options.includeClippingTags !== false;

    // Collect tags
    const tagSet = new Set<string>(optionsTags);
    if (includeClippingTags && clipping.tags) {
      for (const tag of clipping.tags) {
        tagSet.add(tag);
      }
    }
    const tags = Array.from(tagSet).sort();

    // Build frontmatter
    const frontmatter = [
      "---",
      `title: "${this.escapeYaml(clipping.content.slice(0, 50))}..."`,
      `book: "${this.escapeYaml(clipping.title)}"`,
      `author: "${this.escapeYaml(clipping.author)}"`,
      `type: ${clipping.type}`,
      `page: ${clipping.page ?? "null"}`,
      `location: "${clipping.location.raw}"`,
      `date: ${clipping.date?.toISOString() ?? "null"}`,
      `source: kindle`,
    ];

    if (tags.length > 0) {
      frontmatter.push("tags:");
      for (const tag of tags) {
        frontmatter.push(`  - ${tag}`);
      }
    }

    frontmatter.push("---", "");

    // Render clipping content using template engine
    const body = engine.renderClipping(clipping);

    return frontmatter.join("\n") + body;
  }
}
