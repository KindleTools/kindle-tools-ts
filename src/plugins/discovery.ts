/**
 * Plugin discovery module.
 *
 * Provides utilities to discover and load plugins from npm packages.
 * Plugins are discovered using a naming convention:
 *
 * - `kindletools-plugin-*` (e.g., `kindletools-plugin-notion`)
 * - `@scope/kindletools-plugin-*` (e.g., `@myorg/kindletools-plugin-kobo`)
 *
 * ## Usage
 *
 * ```typescript
 * import { discoverPlugins, loadPlugin } from 'kindle-tools-ts/plugins';
 *
 * // Discover all plugins in node_modules
 * const plugins = await discoverPlugins();
 * console.log('Found plugins:', plugins);
 *
 * // Load a specific plugin by name
 * await loadPlugin('kindletools-plugin-notion');
 * ```
 *
 * ## Creating a Plugin Package
 *
 * A plugin package should export a default plugin object or named exports:
 *
 * ```typescript
 * // kindletools-plugin-notion/index.ts
 * import type { ExporterPlugin } from 'kindle-tools-ts/plugins';
 *
 * export const plugin: ExporterPlugin = {
 *   name: 'notion-exporter',
 *   version: '1.0.0',
 *   format: 'notion',
 *   create: () => new NotionExporter(),
 * };
 *
 * // Or as default export
 * export default plugin;
 * ```
 *
 * @packageDocumentation
 */

import { dynamicImport } from "./importer.js";
import { pluginRegistry } from "./registry.js";
import {
  type ExporterPlugin,
  type ImporterPlugin,
  isExporterPlugin,
  isImporterPlugin,
  type Plugin,
} from "./types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Plugin package metadata.
 */
export interface PluginPackageInfo {
  /** npm package name */
  packageName: string;
  /** Package version */
  version: string;
  /** Path to the package */
  path: string;
  /** Plugin type (importer, exporter, or both) */
  type: "importer" | "exporter" | "mixed";
}

/**
 * Result of loading a plugin.
 */
export interface LoadPluginResult {
  success: boolean;
  packageName: string;
  plugins: Plugin[];
  error?: string;
}

/**
 * Options for plugin discovery.
 */
export interface DiscoveryOptions {
  /**
   * Plugin name prefix to search for.
   * @default 'kindletools-plugin-'
   */
  prefix?: string;

  /**
   * Also search in scoped packages (@scope/prefix-*).
   * @default true
   */
  includeScoped?: boolean;

  /**
   * Automatically register discovered plugins.
   * @default false
   */
  autoRegister?: boolean;

  /**
   * Custom node_modules paths to search.
   * If not provided, uses standard Node.js resolution.
   */
  searchPaths?: string[];
}

// =============================================================================
// Constants
// =============================================================================

/** Default plugin package prefix */
export const PLUGIN_PREFIX = "kindletools-plugin-";

/** Keywords to look for in package.json */
export const PLUGIN_KEYWORDS = ["kindletools", "kindletools-plugin", "kindle-clippings"];

// =============================================================================
// Discovery Functions
// =============================================================================

/**
 * Discover plugins from package.json dependencies.
 *
 * This function reads the project's package.json and finds dependencies
 * that match the plugin naming convention.
 *
 * @param options - Discovery options
 * @returns List of discovered plugin package names
 *
 * @example
 * ```typescript
 * const pluginPackages = await discoverPlugins();
 * // ['kindletools-plugin-notion', '@myorg/kindletools-plugin-kobo']
 * ```
 */
export async function discoverPlugins(options?: DiscoveryOptions): Promise<string[]> {
  const prefix = options?.prefix ?? PLUGIN_PREFIX;
  const includeScoped = options?.includeScoped ?? true;
  const discovered: string[] = [];

  try {
    // Read package.json from process.cwd()
    const packageJsonPath = `${process.cwd()}/package.json`;
    const { readFile } = await import("node:fs/promises");

    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const pkgName of Object.keys(allDeps)) {
      // Check unscoped packages
      if (pkgName.startsWith(prefix)) {
        discovered.push(pkgName);
        continue;
      }

      // Check scoped packages
      if (includeScoped && pkgName.startsWith("@")) {
        const scopedName = pkgName.split("/")[1];
        if (scopedName?.startsWith(prefix)) {
          discovered.push(pkgName);
        }
      }
    }

    // Auto-register if requested
    if (options?.autoRegister && discovered.length > 0) {
      for (const pkgName of discovered) {
        await loadPlugin(pkgName);
      }
    }
  } catch {
    // Silently fail if we can't read package.json
    // This is expected in some environments (browser, etc.)
  }

  return discovered;
}

/**
 * Load a plugin from an npm package.
 *
 * The package should export:
 * - A `plugin` named export (ImporterPlugin or ExporterPlugin)
 * - A `plugins` named export (array of plugins)
 * - A default export (plugin or array of plugins)
 *
 * @param packageName - npm package name
 * @param options - Options for loading
 * @returns Load result with registered plugins
 *
 * @example
 * ```typescript
 * const result = await loadPlugin('kindletools-plugin-notion');
 * if (result.success) {
 *   console.log('Loaded plugins:', result.plugins.map(p => p.name));
 * }
 * ```
 */
export async function loadPlugin(
  packageName: string,
  options?: { autoRegister?: boolean },
): Promise<LoadPluginResult> {
  const autoRegister = options?.autoRegister ?? true;
  const result: LoadPluginResult = {
    success: false,
    packageName,
    plugins: [],
  };

  try {
    // Dynamically import the package
    const pluginModule = (await dynamicImport(packageName)) as Record<string, unknown>;

    // Look for plugins in the module
    const plugins: Plugin[] = [];

    // Check for named 'plugin' export
    const pluginExport = pluginModule["plugin"];
    if (pluginExport && isPlugin(pluginExport)) {
      plugins.push(pluginExport as Plugin);
    }

    // Check for named 'plugins' export (array)
    const pluginsExport = pluginModule["plugins"];
    if (Array.isArray(pluginsExport)) {
      for (const p of pluginsExport) {
        if (isPlugin(p)) {
          plugins.push(p as Plugin);
        }
      }
    }

    // Check for default export
    const defaultExport = pluginModule["default"];
    if (defaultExport) {
      if (Array.isArray(defaultExport)) {
        for (const p of defaultExport) {
          if (isPlugin(p)) {
            plugins.push(p as Plugin);
          }
        }
      } else if (isPlugin(defaultExport)) {
        plugins.push(defaultExport as Plugin);
      }
    }

    // Check for individual plugin exports
    for (const [key, value] of Object.entries(pluginModule)) {
      if (key !== "plugin" && key !== "plugins" && key !== "default" && isPlugin(value)) {
        // Avoid duplicates
        if (!plugins.some((p) => p.name === (value as Plugin).name)) {
          plugins.push(value as Plugin);
        }
      }
    }

    if (plugins.length === 0) {
      result.error = `No valid plugins found in package '${packageName}'`;
      return result;
    }

    // Register plugins if requested
    if (autoRegister) {
      for (const plugin of plugins) {
        if (isExporterPlugin(plugin)) {
          pluginRegistry.registerExporter(plugin as ExporterPlugin);
        } else if (isImporterPlugin(plugin)) {
          pluginRegistry.registerImporter(plugin as ImporterPlugin);
        }
      }
    }

    result.success = true;
    result.plugins = plugins;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Load multiple plugins.
 */
export async function loadPlugins(
  packageNames: string[],
  options?: { autoRegister?: boolean },
): Promise<LoadPluginResult[]> {
  const results: LoadPluginResult[] = [];
  for (const pkgName of packageNames) {
    results.push(await loadPlugin(pkgName, options));
  }
  return results;
}

/**
 * Discover and load all plugins.
 *
 * Convenience function that combines discovery and loading.
 *
 * @example
 * ```typescript
 * const results = await discoverAndLoadPlugins();
 * console.log(`Loaded ${results.filter(r => r.success).length} plugins`);
 * ```
 */
export async function discoverAndLoadPlugins(
  options?: DiscoveryOptions,
): Promise<LoadPluginResult[]> {
  const discovered = await discoverPlugins(options);
  return loadPlugins(discovered, { autoRegister: true });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if an object is a valid plugin.
 */
function isPlugin(obj: unknown): obj is Plugin {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  return isExporterPlugin(obj as Plugin) || isImporterPlugin(obj as Plugin);
}
