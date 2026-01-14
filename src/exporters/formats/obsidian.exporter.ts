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

import type { Clipping } from "#app-types/clipping.js";
import type { TemplateEngine, TemplateOptions, TemplatePreset } from "#templates/index.js";
import type { ExportedFile } from "../core/types.js";
import { MultiFileExporter, type MultiFileExporterOptions } from "../shared/multi-file-exporter.js";

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
   */
  protected override async processBook(
    clippings: Clipping[],
    options: ObsidianExporterOptions,
    engine: TemplateEngine,
  ): Promise<ExportedFile[]> {
    const first = clippings[0];
    if (!first) return [];

    // Convert exporter options to template options for the opt helper
    const templateOptions = this.toTemplateOptions(options);

    // Generate context with template options so the opt helper can read them
    const context = engine.toBookContext(clippings, templateOptions);

    // Apply tag logic
    // 1. Start with tags from options
    // 2. Add clipping tags if filtering is enabled (default: true)
    const optionsTags = options.tags ?? [];
    const includeClippingTags = options.includeClippingTags !== false;

    let finalTags: string[];

    if (includeClippingTags) {
      // Merge option tags with clipping tags (already in context.tags)
      finalTags = Array.from(new Set([...optionsTags, ...context.tags])).sort();
    } else {
      // Only use option tags
      finalTags = [...optionsTags].sort();
    }

    // Update context
    context.tags = finalTags;
    context.hasTags = finalTags.length > 0;

    const content = engine.renderBookContext(context);

    // Create safe filename
    const folderStructure = options.folderStructure;
    const authorCase = options.authorCase;
    // Obsidian keeps books in a specific folder ("books" by default)
    const baseFolder = options.folder ?? options.baseFolder ?? "books";

    const safeTitle = this.sanitizeFilename(first.title);
    const safeAuthor = this.sanitizeFilename(
      this.applyCase(first.author || this.DEFAULT_UNKNOWN_AUTHOR, authorCase),
    );

    const filePath = this.generateFilePath(baseFolder, safeAuthor, safeTitle, folderStructure);

    return [
      {
        path: filePath,
        content,
      },
    ];
  }
}
