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

    const exporterPlugin = plugin;
    const formats = [exporterPlugin.format, ...(exporterPlugin.aliases ?? [])];
    const pluginName = exporterPlugin.name;

    // Create a wrapper class that delegates to the registry singleton
    const ExporterPluginClass = class implements Exporter {
      name = pluginName;

      // Delegate to singleton
      get extension(): string {
        return this.getInstance().extension;
      }

      private getInstance(): ExporterInstance {
        // This will retrieve or create/validate the singleton
        const instance = pluginRegistry.getExporter(exporterPlugin.format);
        if (!instance) {
          // Should not happen if plugin is registered, but best to be safe
          throw new Error(`Plugin '${pluginName}' not found in registry`);
        }
        return instance;
      }

      async export(
        clippings: import("#app-types/clipping.js").Clipping[],
        options?: import("#exporters/core/types.js").ExporterOptions,
      ) {
        return this.getInstance().export(clippings, options);
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

    const importerPlugin = plugin;
    const extensions = importerPlugin.extensions;
    const pluginName = importerPlugin.name;

    // Create a wrapper class that delegates to the registry singleton
    const ImporterPluginClass = class implements Importer {
      name = pluginName;
      extensions = extensions;

      private getInstance(): ImporterInstance {
        // This will retrieve or create/validate the singleton
        // We use the first extension as the key lookup
        const extension = extensions[0];
        if (!extension) {
          throw new Error(`Plugin '${pluginName}' has no extensions`);
        }
        const instance = pluginRegistry.getImporter(extension);
        if (!instance) {
          throw new Error(`Plugin '${pluginName}' not found in registry`);
        }
        return instance;
      }

      import(content: string) {
        // Convert Promise<ImportResult> to ImportResultAsync (ResultAsync)
        return new ResultAsync(this.getInstance().import(content));
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

        get extension(): string {
          return this.getInstance().extension;
        }

        private getInstance(): ExporterInstance {
          const instance = pluginRegistry.getExporter(plugin.format);
          if (!instance) {
            throw new Error(`Plugin '${plugin.name}' not found in registry`);
          }
          return instance;
        }

        async export(
          clippings: import("#app-types/clipping.js").Clipping[],
          options?: import("#exporters/core/types.js").ExporterOptions,
        ) {
          return this.getInstance().export(clippings, options);
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

        private getInstance(): ImporterInstance {
          const extension = plugin.extensions[0];
          if (!extension) {
            throw new Error(`Plugin '${plugin.name}' has no extensions`);
          }
          const instance = pluginRegistry.getImporter(extension);
          if (!instance) {
            throw new Error(`Plugin '${plugin.name}' not found in registry`);
          }
          return instance;
        }
        import(content: string) {
          return new ResultAsync(this.getInstance().import(content));
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
