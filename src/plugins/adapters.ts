/**
 * Factory adapters that integrate the plugin registry with existing factories.
 *
 * This module provides utility functions to bridge the plugin system with
 * the existing ImporterFactory and ExporterFactory patterns.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "neverthrow";
import { ExporterFactory } from "#exporters/core/factory.js";
import type { Exporter } from "#exporters/core/types.js";
import { ImporterFactory } from "#importers/core/factory.js";
import type { Importer } from "#importers/core/types.js";
import { pluginRegistry } from "./registry.js";
import {
  type ExporterInstance,
  type ExporterPlugin,
  type ImporterInstance,
  type ImporterPlugin,
  isExporterPlugin,
  isImporterPlugin,
} from "./types.js";

/**
 * Sync plugin registry with ExporterFactory.
 *
 * This registers all plugins from the PluginRegistry with the ExporterFactory,
 * allowing them to be discovered via the standard factory methods.
 */
export function syncExporterPlugins(): void {
  const plugins = pluginRegistry.getAllPlugins();

  for (const plugin of plugins) {
    if (!isExporterPlugin(plugin)) continue;

    // Capture explicit type for closure usage
    const exporterPlugin = plugin;
    const formats = [exporterPlugin.format, ...(exporterPlugin.aliases ?? [])];
    const pluginName = exporterPlugin.name;

    // Create a wrapper class that implements the Exporter interface
    const ExporterPluginClass = class implements Exporter {
      name = pluginName;
      extension: string;
      private instance: ExporterInstance;

      constructor() {
        this.instance = exporterPlugin.create();
        this.extension = this.instance.extension;
      }

      async export(
        clippings: import("#app-types/clipping.js").Clipping[],
        options?: import("#exporters/core/types.js").ExporterOptions,
      ) {
        return this.instance.export(clippings, options as Record<string, unknown>);
      }
    };

    for (const format of formats) {
      ExporterFactory.register(format, ExporterPluginClass);
    }
  }
}

/**
 * Sync plugin registry with ImporterFactory.
 *
 * This registers all plugins from the PluginRegistry with the ImporterFactory,
 * allowing them to be discovered via the standard factory methods.
 */
export function syncImporterPlugins(): void {
  const plugins = pluginRegistry.getAllPlugins();

  for (const plugin of plugins) {
    if (!isImporterPlugin(plugin)) continue;

    // Capture explicit type for closure usage
    const importerPlugin = plugin;
    const extensions = importerPlugin.extensions;
    const pluginName = importerPlugin.name;

    // Create a wrapper class that implements the Importer interface
    const ImporterPluginClass = class implements Importer {
      name = pluginName;
      extensions = extensions;
      private instance: ImporterInstance;

      constructor() {
        this.instance = importerPlugin.create();
      }

      import(content: string) {
        // Convert Promise<ImportResult> to ImportResultAsync (ResultAsync)
        return new ResultAsync(this.instance.import(content));
      }
    };

    ImporterFactory.register(extensions, ImporterPluginClass);
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
      const formats = [plugin.format, ...(plugin.aliases ?? [])];

      const ExporterPluginClass = class implements Exporter {
        name = plugin.name;
        extension: string;
        private instance: ExporterInstance;

        constructor() {
          this.instance = plugin.create();
          this.extension = this.instance.extension;
        }

        async export(
          clippings: import("#app-types/clipping.js").Clipping[],
          options?: import("#exporters/core/types.js").ExporterOptions,
        ) {
          return this.instance.export(clippings, options as Record<string, unknown>);
        }
      };

      for (const format of formats) {
        ExporterFactory.register(format, ExporterPluginClass);
      }
    }),
  );

  // Sync importers on registration
  unsubscribers.push(
    pluginRegistry.on("importer:registered", (event) => {
      const plugin = event.plugin as ImporterPlugin;

      const ImporterPluginClass = class implements Importer {
        name = plugin.name;
        extensions = plugin.extensions;
        private instance: ImporterInstance;

        constructor() {
          this.instance = plugin.create();
        }

        import(content: string) {
          return new ResultAsync(this.instance.import(content));
        }
      };

      ImporterFactory.register(plugin.extensions, ImporterPluginClass);
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
