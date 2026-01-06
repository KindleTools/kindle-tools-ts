/**
 * Exports for the Exporters module.
 *
 * @packageDocumentation
 */

export { CsvExporter } from "./csv.exporter.js";
export { HtmlExporter } from "./html.exporter.js";
export { JoplinExporter } from "./joplin.exporter.js";
export { JsonExporter } from "./json.exporter.js";
export { MarkdownExporter } from "./markdown.exporter.js";
export { ObsidianExporter } from "./obsidian.exporter.js";

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

export type {
  AuthorCase,
  ExportedFile,
  Exporter,
  ExporterOptions,
  ExportResult,
  FolderStructure,
  TagCase,
} from "./types.js";
