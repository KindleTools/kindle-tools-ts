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
 *   hookRegistry,
 *   discoverPlugins,
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
 * // Add lifecycle hooks
 * hookRegistry.add('beforeExport', (clippings) => {
 *   return clippings.filter(c => c.content?.length > 20);
 * });
 *
 * // Discover and load plugins from node_modules
 * const plugins = await discoverPlugins({ autoRegister: true });
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
// Discovery
export type {
  DiscoveryOptions,
  LoadPluginResult,
  PluginPackageInfo,
} from "./discovery.js";
export {
  discoverAndLoadPlugins,
  discoverPlugins,
  loadPlugin,
  loadPlugins,
  PLUGIN_KEYWORDS,
  PLUGIN_PREFIX,
} from "./discovery.js";
// Example Plugins
export {
  type AnkiCardStyle,
  AnkiExporter,
  type AnkiExporterOptions,
  ankiExporterPlugin,
} from "./examples/index.js";

// Hooks System
export type {
  AfterExportHook,
  AfterImportHook,
  BeforeExportHook,
  BeforeImportHook,
  HookFunction,
  HookType,
} from "./hooks.js";
export {
  createHeaderHook,
  createHighlightsOnlyFilter,
  createMinLengthFilter,
  createTimestampHook,
  HookRegistry,
  hookRegistry,
} from "./hooks.js";
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
