/**
 * Markdown Exporter for Kindle clippings.
 *
 * Supports customizable templates via Handlebars with:
 * - Pre-defined presets (default, minimal, obsidian, notion, academic, etc.)
 * - Custom user-provided templates
 * - 30+ helpers for formatting and logic
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import { groupByBook } from "#domain/analytics/stats.js";
import { TemplateEngine, type TemplatePreset } from "#templates/index.js";
import type { ExportedFile, ExportResult } from "../core/types.js";
import { MultiFileExporter, type MultiFileExporterOptions } from "../shared/multi-file-exporter.js";

/**
 * Extended options for Markdown export.
 */
export interface MarkdownExporterOptions extends MultiFileExporterOptions {
  /**
   * Template preset to use.
   * Available: 'default', 'minimal', 'obsidian', 'notion', 'academic', 'compact', 'verbose'
   * Default: 'default'
   */
  templatePreset?: TemplatePreset;

  /**
   * Custom templates (override preset).
   * Provide Handlebars templates for clipping, book, or export.
   */
  customTemplates?: {
    clipping?: string;
    book?: string;
    export?: string;
  };
}

/**
 * Export clippings to Markdown format with customizable templates.
 *
 * @example
 * ```typescript
 * const exporter = new MarkdownExporter();
 *
 * // Use default template
 * const result = await exporter.export(clippings);
 *
 * // Use a preset
 * const obsidianResult = await exporter.export(clippings, {
 *   templatePreset: 'obsidian',
 *   groupByBook: true
 * });
 *
 * // Use custom template
 * const customResult = await exporter.export(clippings, {
 *   customTemplates: {
 *     clipping: '> {{content}} — {{author}}'
 *   }
 * });
 * ```
 */
export class MarkdownExporter extends MultiFileExporter {
  readonly name = "markdown";
  readonly extension = ".md";

  /**
   * Export clippings to Markdown.
   *
   * If groupByBook is true, generates separate files per book.
   * If false, generates a single file.
   */
  protected override async doExport(
    clippings: Clipping[],
    options: MarkdownExporterOptions,
  ): Promise<ExportResult> {
    // Single file export
    if (!options.groupByBook) {
      const engine = this.createTemplateEngine(options);
      const grouped = groupByBook(clippings);
      const output = engine.renderExport(grouped, options.title);
      return this.success(output);
    }

    // Multi-file export (handled by base class)
    return super.doExport(clippings, options);
  }

  /**
   * Process a single book for multi-file export.
   */
  protected override async processBook(
    clippings: Clipping[],
    options: MarkdownExporterOptions,
    engine: TemplateEngine,
  ): Promise<ExportedFile[]> {
    const first = clippings[0];
    if (!first) return [];

    const content = engine.renderBook(clippings);

    // Create safe filename
    const folderStructure = options.folderStructure;
    const authorCase = options.authorCase;
    const baseFolder = options.baseFolder ?? "";

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

  /**
   * Override summary content to provide concatenated files for Markdown.
   * This preserves backward compatibility where the result.output contains all content.
   */
  protected override generateSummaryContent(files: ExportedFile[]): string {
    return files.map((f) => f.content).join("\n\n---\n\n");
  }

  /**
   * Validate a custom template.
   */
  validateTemplate(template: string): string | null {
    const engine = new TemplateEngine();
    return engine.validateTemplate(template);
  }

  /**
   * Get list of available template presets.
   */
  static getAvailablePresets(): TemplatePreset[] {
    return ["default", "minimal", "obsidian", "notion", "academic", "compact", "verbose"];
  }

  /**
   * Get list of available template helpers.
   */
  static getAvailableHelpers(): string[] {
    return TemplateEngine.getAvailableHelpers();
  }

  /**
   * Get available template variables.
   */
  static getAvailableVariables(): Record<string, string[]> {
    return TemplateEngine.getAvailableVariables();
  }
}
