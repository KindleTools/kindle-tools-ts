/**
 * Factory adapters that integrate the plugin registry with existing factories.
 *
 * This module provides utility functions to bridge the plugin system with
 * the existing ImporterFactory and ExporterFactory patterns.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "neverthrow";
import { AppException } from "#errors/types.js";
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

      private _instance: ExporterInstance | undefined;

      // Lazy getter for extension - instantiates on first access if needed
      get extension(): string {
        return this.getInstance().extension;
      }

      private getInstance(): ExporterInstance {
        if (!this._instance) {
          try {
            this._instance = exporterPlugin.create();
          } catch (error) {
            throw new AppException({
              code: "PLUGIN_INIT_ERROR",
              message: `Failed to initialize exporter plugin '${pluginName}'`,
              cause: error,
            });
          }
        }
        return this._instance;
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

    // Capture explicit type for closure usage
    const importerPlugin = plugin;
    const extensions = importerPlugin.extensions;
    const pluginName = importerPlugin.name;

    // Create a wrapper class that implements the Importer interface
    const ImporterPluginClass = class implements Importer {
      name = pluginName;
      extensions = extensions;
      private _instance: ImporterInstance | undefined;

      private getInstance(): ImporterInstance {
        if (!this._instance) {
          try {
            this._instance = importerPlugin.create();
          } catch (error) {
            throw new AppException({
              code: "PLUGIN_INIT_ERROR",
              message: `Failed to initialize importer plugin '${pluginName}'`,
              cause: error,
            });
          }
        }
        return this._instance;
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
        private _instance: ExporterInstance | undefined;

        get extension(): string {
          return this.getInstance().extension;
        }

        private getInstance(): ExporterInstance {
          if (!this._instance) {
            try {
              this._instance = plugin.create();
            } catch (error) {
              throw new AppException({
                code: "PLUGIN_INIT_ERROR",
                message: `Failed to initialize exporter plugin '${plugin.name}'`,
                cause: error,
              });
            }
          }
          return this._instance;
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
        private _instance: ImporterInstance | undefined;

        private getInstance(): ImporterInstance {
          if (!this._instance) {
            try {
              this._instance = plugin.create();
            } catch (error) {
              throw new AppException({
                code: "PLUGIN_INIT_ERROR",
                message: `Failed to initialize importer plugin '${plugin.name}'`,
                cause: error,
              });
            }
          }
          return this._instance; // Corrected: return _instance
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
