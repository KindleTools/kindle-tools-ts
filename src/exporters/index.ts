/**
 * Exports for the Exporters module.
 *
 * @packageDocumentation
 */

export { ExporterFactory } from "./core/factory.js";
export type {
  AuthorCase,
  ExportedFile,
  Exporter,
  ExporterOptions,
  ExportResult,
  ExportSuccess,
  FolderStructure,
  TagCase,
} from "./core/types.js";
export { CsvExporter } from "./formats/csv.exporter.js";
export { HtmlExporter } from "./formats/html.exporter.js";
export { JoplinExporter } from "./formats/joplin.exporter.js";
export { JsonExporter } from "./formats/json.exporter.js";
export { MarkdownExporter } from "./formats/markdown.exporter.js";
export { ObsidianExporter } from "./formats/obsidian.exporter.js";
// Shared Base & Utilities
export { BaseExporter } from "./shared/base-exporter.js";
export {
  applyCase,
  createErrorResult,
  createSuccessResult,
  escapeCSV,
  escapeHtml,
  escapeYaml,
  sanitizeFilename,
  withExportErrorHandling,
} from "./shared/exporter-utils.js";
