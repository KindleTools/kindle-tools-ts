/**
 * Plugin examples module.
 *
 * This module provides example plugins that demonstrate how to extend
 * KindleTools with custom importers and exporters.
 *
 * @example
 * ```typescript
 * import { pluginRegistry } from 'kindle-tools-ts/plugins';
 * import { ankiExporterPlugin } from 'kindle-tools-ts/plugins/examples';
 *
 * // Register the Anki exporter
 * pluginRegistry.registerExporter(ankiExporterPlugin);
 *
 * // Now you can export to Anki format
 * const exporter = pluginRegistry.getExporter('anki');
 * ```
 *
 * @packageDocumentation
 */

// Anki Exporter
export {
  type AnkiCardStyle,
  AnkiExporter,
  type AnkiExporterOptions,
  ankiExporterPlugin,
} from "./anki-exporter.js";
