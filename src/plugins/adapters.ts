/**
 * Factory adapters that integrate the plugin registry with existing factories.
 *
 * This module provides utility functions to bridge the plugin system with
 * the existing ImporterFactory and ExporterFactory patterns.
 *
 * @packageDocumentation
 */

import { ExporterFactory } from "#exporters/core/factory.js";
import { ImporterFactory } from "#importers/core/factory.js";
import { pluginRegistry } from "./registry.js";
import type { ExporterPlugin, ImporterPlugin } from "./types.js";

/**
 * Sync plugin registry with ExporterFactory.
 *
 * This registers all plugins from the PluginRegistry with the ExporterFactory,
 * allowing them to be discovered via the standard factory methods.
 */
export function syncExporterPlugins(): void {
  const formats = pluginRegistry.getExporterFormats();

  for (const format of formats) {
    // We know it exists because we got the format from getExporterFormats()
    // biome-ignore lint/style/noNonNullAssertion: valid in this context
    const exporter = pluginRegistry.getExporter(format)!;

    // Capture values to satisfy TypeScript's null checks in class scope
    const exporterName = exporter.name;
    const exporterExtension = exporter.extension;
    const exporterExport = exporter.export.bind(exporter);

    // Create a wrapper class compatible with ExporterFactory
    const ExporterPluginClass = class {
      name = exporterName;
      extension = exporterExtension;
      export = exporterExport;
    };

    ExporterFactory.register(
      format,
      ExporterPluginClass as unknown as new () => import("#exporters/core/types.js").Exporter,
    );
  }
}

/**
 * Sync plugin registry with ImporterFactory.
 *
 * This registers all plugins from the PluginRegistry with the ImporterFactory,
 * allowing them to be discovered via the standard factory methods.
 */
export function syncImporterPlugins(): void {
  const extensions = pluginRegistry.getImporterExtensions();

  for (const ext of extensions) {
    // We know it exists because we got the extension from getImporterExtensions()
    // biome-ignore lint/style/noNonNullAssertion: valid in this context
    const importer = pluginRegistry.getImporter(ext)!;

    // Capture values to satisfy TypeScript's null checks in class scope
    const importerName = importer.name;
    const importerImport = importer.import.bind(importer);

    // Create a wrapper class compatible with ImporterFactory
    const ImporterPluginClass = class {
      name = importerName;
      import = importerImport;
    };

    ImporterFactory.register(
      ext,
      ImporterPluginClass as unknown as new () => import("#importers/core/types.js").Importer,
    );
  }
}

/**
 * Auto-sync mode: Listen for plugin registrations and automatically
 * update the factories.
 */
export function enableAutoSync(): () => void {
  const unsubscribers: (() => void)[] = [];

  // Sync exporters on registration
  unsubscribers.push(
    pluginRegistry.on("exporter:registered", (event) => {
      const plugin = event.plugin as ExporterPlugin;
      const exporter = plugin.create();

      const ExporterPluginClass = class {
        name = exporter.name;
        extension = exporter.extension;
        export = exporter.export.bind(exporter);
      };

      const formats = [plugin.format, ...(plugin.aliases ?? [])];
      for (const format of formats) {
        ExporterFactory.register(
          format,
          ExporterPluginClass as unknown as new () => import("#exporters/core/types.js").Exporter,
        );
      }
    }),
  );

  // Sync importers on registration
  unsubscribers.push(
    pluginRegistry.on("importer:registered", (event) => {
      const plugin = event.plugin as ImporterPlugin;
      const importer = plugin.create();

      const ImporterPluginClass = class {
        name = importer.name;
        import = importer.import.bind(importer);
      };

      for (const ext of plugin.extensions) {
        const normalized = ext.toLowerCase().startsWith(".")
          ? ext.toLowerCase()
          : `.${ext.toLowerCase()}`;
        ImporterFactory.register(
          normalized,
          ImporterPluginClass as unknown as new () => import("#importers/core/types.js").Importer,
        );
      }
    }),
  );

  // Return cleanup function
  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

/**
 * Register a plugin and automatically sync with factories.
 *
 * Convenience function that combines registration with factory sync.
 */
export function registerExporterPlugin(plugin: ExporterPlugin): void {
  pluginRegistry.registerExporter(plugin);
  syncExporterPlugins();
}

/**
 * Register a plugin and automatically sync with factories.
 *
 * Convenience function that combines registration with factory sync.
 */
export function registerImporterPlugin(plugin: ImporterPlugin): void {
  pluginRegistry.registerImporter(plugin);
  syncImporterPlugins();
}
