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
import type { ExportedFile, ExportResult } from "#exporters/core/types.js";
import type { ExporterOptionsParsed } from "#schemas/exporter.schema.js";
import {
  type TemplateEngine,
  TemplateEngineFactory,
  type TemplatePreset,
} from "#templates/index.js";
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

    // Pre-hook for any global setup (e.g. root notebooks, global tags)
    const preambleFiles = await this.exportPreamble(clippings, options);
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
   * Useful for index files, root folders/notebooks, global tags, etc.
   *
   * @param clippings - All clippings being exported (for analysis/tag collection)
   * @param options - Export options
   */
  protected async exportPreamble(
    _clippings: Clipping[],
    _options: MultiFileExporterOptions,
  ): Promise<ExportedFile[]> {
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
      return TemplateEngineFactory.getEngine(options.customTemplates);
    }

    // Use preset if specified, otherwise subclass default
    const presetName = options.templatePreset || this.getDefaultPreset();

    // Allow subclasses to inject extra helpers or config
    // Note: This might modify the cached instance, which is a potential side effect if multiple exporters use the same preset.
    // However, configureTemplateEngine currently seems to add helpers which are idempotent or harmless if re-added.
    // If subclasses add unique state to the engine, we might need a way to clone or reset, or accept that they share the instance.
    // For now, we assume helpers are global/stateless or unique per class not per instance usage.
    const engine = TemplateEngineFactory.getEngine(presetName);
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
  protected configureTemplateEngine(_engine: TemplateEngine): void {
    // Override in subclass to add helpers
  }
}
