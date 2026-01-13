/**
 * Abstract base class for multi-file exporters.
 *
 * Consolidates logic for exporters that generate multiple files (usually one per book),
 * such as Markdown, Obsidian, and Joplin.
 *
 * Features:
 * - Standardized "Group by Book" processing loop
 * - Centralized Template Engine integration
 * - Unified file path generation helpers
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import { groupByBook } from "#domain/analytics/stats.js";
import type { ExporterOptionsParsed } from "#schemas/exporter.schema.js";
import { getTemplatePreset, TemplateEngine, type TemplatePreset } from "#templates/index.js";
import type { ExportedFile, ExportResult } from "../core/types.js";
import { BaseExporter } from "./base-exporter.js";

/**
 * Configuration options for multi-file exporters.
 */
export interface MultiFileExporterOptions extends ExporterOptionsParsed {
  /**
   * Template preset to use.
   */
  templatePreset?: TemplatePreset;

  /**
   * Custom templates (override preset).
   */
  customTemplates?: {
    clipping?: string;
    book?: string;
    export?: string;
  };

  /**
   * Base folder for export (overrides default).
   */
  baseFolder?: string;
}

/**
 * Base class for exporters that produce multiple files (usually grouped by book).
 */
export abstract class MultiFileExporter extends BaseExporter {
  /**
   * Main export method - orchestrates the multi-file export process.
   */
  protected async doExport(
    clippings: Clipping[],
    options: MultiFileExporterOptions,
  ): Promise<ExportResult> {
    const engine = this.createTemplateEngine(options);
    const grouped = groupByBook(clippings);
    const files: ExportedFile[] = [];

    // Pre-hook for any global setup (e.g. root notebooks)
    const preambleFiles = await this.exportPreamble(options);
    files.push(...preambleFiles);

    for (const [_, bookClippings] of grouped) {
      if (!bookClippings.length) continue;

      const bookFiles = await this.processBook(bookClippings, options, engine);
      files.push(...bookFiles);
    }

    const content = this.generateSummaryContent(files);
    return this.success(content, files);
  }

  /**
   * Generate files for a specific book.
   * Must be implemented by subclasses.
   */
  protected abstract processBook(
    clippings: Clipping[],
    options: MultiFileExporterOptions,
    engine: TemplateEngine,
  ): Promise<ExportedFile[]>;

  /**
   * Optional hook to generate files before processing books.
   * Useful for index files, root folders/notebooks, etc.
   */
  protected async exportPreamble(options: MultiFileExporterOptions): Promise<ExportedFile[]> {
    return [];
  }

  /**
   * Generate a summary content string (main output).
   * Default implementation simply lists generated files or joins content.
   */
  protected generateSummaryContent(files: ExportedFile[]): string {
    // If fewer than 10 files, join them? No, that's too big.
    // Return a summary message or list of files.
    if (files.length === 0) return "No files generated.";

    // For file-based exports, the "content" of the result is usually ignored by the user
    // in favor of the actual files written to disk.
    // However, conventionally we might return the concatenated content or a summary.
    return files.map((f) => `# ${f.path}\n...\n`).join("\n");
  }

  /**
   * Create a template engine instance based on options.
   */
  protected createTemplateEngine(options: MultiFileExporterOptions): TemplateEngine {
    // Custom templates take precedence
    if (options.customTemplates) {
      return new TemplateEngine(options.customTemplates);
    }

    // Use preset if specified, otherwise subclass default
    const presetName = options.templatePreset || this.getDefaultPreset();
    const preset = getTemplatePreset(presetName);

    // Allow subclasses to inject extra helpers or config
    const engine = new TemplateEngine(preset);
    this.configureTemplateEngine(engine);

    return engine;
  }

  /**
   * Get the default preset name for this exporter.
   */
  protected getDefaultPreset(): TemplatePreset {
    return "default";
  }

  /**
   * Configure the template engine with exporter-specific helpers.
   */
  protected configureTemplateEngine(engine: TemplateEngine): void {
    // Override in subclass to add helpers
  }
}
