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

import { getTemplatePreset, type TemplatePreset } from "../templates/index.js";
import type { Clipping } from "../types/clipping.js";
import type { ExportedFile, Exporter, ExporterOptions, ExportResult } from "../types/exporter.js";
import { groupByBook } from "../utils/stats.js";
import { TemplateEngine } from "../utils/template-engine.js";

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
  async export(clippings: Clipping[], options?: MarkdownExporterOptions): Promise<ExportResult> {
    try {
      // Create template engine with appropriate templates
      const engine = this.createTemplateEngine(options);

      if (options?.groupByBook) {
        return this.exportGrouped(clippings, engine);
      }

      return this.exportSingle(clippings, engine);
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
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
  private exportSingle(clippings: Clipping[], engine: TemplateEngine): ExportResult {
    const grouped = groupByBook(clippings);
    const output = engine.renderExport(grouped);

    return {
      success: true,
      output,
    };
  }

  /**
   * Export clippings grouped by book into separate files.
   */
  private exportGrouped(clippings: Clipping[], engine: TemplateEngine): ExportResult {
    const grouped = groupByBook(clippings);
    const files: ExportedFile[] = [];

    for (const [_, bookClippings] of grouped) {
      const first = bookClippings[0];
      if (!first) continue;

      const content = engine.renderBook(bookClippings);

      // Create safe filename using the actual title from the clipping, not the grouping key (which is lowercased)
      const safeTitle = first.title.replace(/[<>:"/\\|?*]/g, "-").slice(0, 100);

      files.push({
        path: `${safeTitle}.md`,
        content,
      });
    }

    return {
      success: true,
      output: files.map((f) => f.content).join("\n\n---\n\n"),
      files,
    };
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
