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
import { groupByBook } from "#domain/stats.js";
import { getTemplatePreset, TemplateEngine, type TemplatePreset } from "#templates/index.js";
import { BaseExporter } from "./shared/index.js";
import type { ExportedFile, ExporterOptions, ExportResult } from "./types.js";

/**
 * Extended options for Markdown export.
 */
export interface MarkdownExporterOptions extends ExporterOptions {
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
export class MarkdownExporter extends BaseExporter {
  readonly name = "markdown";
  readonly extension = ".md";

  /**
   * Export clippings to Markdown.
   *
   * If groupByBook is true, generates separate files per book.
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with Markdown content
   */
  protected async doExport(
    clippings: Clipping[],
    options?: MarkdownExporterOptions,
  ): Promise<ExportResult> {
    // Create template engine with appropriate templates
    const engine = this.createTemplateEngine(options);

    if (options?.groupByBook) {
      return this.exportGrouped(clippings, engine, options);
    }

    return this.exportSingle(clippings, engine, options?.title);
  }

  /**
   * Create a template engine based on options.
   */
  private createTemplateEngine(options?: MarkdownExporterOptions): TemplateEngine {
    // Custom templates take precedence
    if (options?.customTemplates) {
      return new TemplateEngine(options.customTemplates);
    }

    // Use preset if specified
    if (options?.templatePreset) {
      const preset = getTemplatePreset(options.templatePreset);
      return new TemplateEngine(preset);
    }

    // Default template engine
    return new TemplateEngine();
  }

  /**
   * Export all clippings to a single Markdown file.
   */
  private exportSingle(
    clippings: Clipping[],
    engine: TemplateEngine,
    title?: string,
  ): ExportResult {
    const grouped = groupByBook(clippings);
    const output = engine.renderExport(grouped, title);

    return this.success(output);
  }

  /**
   * Export clippings grouped by book into separate files.
   */
  private exportGrouped(
    clippings: Clipping[],
    engine: TemplateEngine,
    options?: MarkdownExporterOptions,
  ): ExportResult {
    const grouped = groupByBook(clippings);
    const files: ExportedFile[] = [];

    // Default options for file structure
    const folderStructure = options?.folderStructure ?? "flat";
    const authorCase = options?.authorCase ?? "original";
    const baseFolder = ""; // Markdown files usually exported to root unless specified otherwise

    for (const [_, bookClippings] of grouped) {
      const first = bookClippings[0];
      if (!first) continue;

      const content = engine.renderBook(bookClippings);

      // Create safe filename using inherited utility
      const safeTitle = this.sanitizeFilename(first.title);
      const safeAuthor = this.sanitizeFilename(
        this.applyCase(first.author || this.DEFAULT_UNKNOWN_AUTHOR, authorCase),
      );

      const filePath = this.generateFilePath(baseFolder, safeAuthor, safeTitle, folderStructure);

      files.push({
        path: filePath,
        content,
      });
    }

    return this.success(files.map((f) => f.content).join("\n\n---\n\n"), files);
  }

  /**
   * Validate a custom template.
   * Returns null if valid, error message if invalid.
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
   * Get available template variables for each context type.
   */
  static getAvailableVariables(): Record<string, string[]> {
    return TemplateEngine.getAvailableVariables();
  }
}
