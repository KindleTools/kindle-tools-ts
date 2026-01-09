/**
 * Plugin system for KindleTools.
 *
 * This module provides a extensible plugin architecture for adding custom
 * importers (file format parsers) and exporters (output formats).
 *
 * @example
 * ```typescript
 * import {
 *   pluginRegistry,
 *   type ExporterPlugin,
 *   type ImporterPlugin,
 * } from 'kindle-tools-ts/plugins';
 *
 * // Register a custom Notion exporter
 * pluginRegistry.registerExporter({
 *   name: 'notion-exporter',
 *   version: '1.0.0',
 *   format: 'notion',
 *   description: 'Export clippings to Notion database',
 *   create: () => new NotionExporter(),
 * });
 *
 * // Register a custom XML importer
 * pluginRegistry.registerImporter({
 *   name: 'kobo-importer',
 *   version: '1.0.0',
 *   extensions: ['.xml', '.kobo'],
 *   description: 'Import Kobo annotations',
 *   create: () => new KoboImporter(),
 * });
 *
 * // List all available formats
 * console.log('Exporters:', pluginRegistry.getExporterFormats());
 * console.log('Importers:', pluginRegistry.getImporterExtensions());
 * ```
 *
 * @packageDocumentation
 */

// Factory Adapters
export {
  enableAutoSync,
  registerExporterPlugin,
  registerImporterPlugin,
  syncExporterPlugins,
  syncImporterPlugins,
} from "./adapters.js";
// Registry
export { PluginRegistry, pluginRegistry } from "./registry.js";
// Types
export type {
  ExporterInstance,
  ExporterPlugin,
  ImporterInstance,
  ImporterPlugin,
  Plugin,
  PluginEvent,
  PluginEventListener,
  PluginEventType,
  PluginLoadOptions,
  PluginMeta,
  PluginValidationResult,
} from "./types.js";
export { isExporterPlugin, isImporterPlugin } from "./types.js";
