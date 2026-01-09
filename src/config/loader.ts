/**
 * Configuration file loader using cosmiconfig.
 *
 * Automatically searches for configuration files named:
 * - .kindletoolsrc
 * - .kindletoolsrc.json
 * - .kindletoolsrc.yaml
 * - .kindletoolsrc.yml
 * - .kindletoolsrc.js
 * - .kindletoolsrc.cjs
 * - kindletools.config.js
 * - kindletools.config.cjs
 * - A "kindletools" key in package.json
 *
 * @example
 * ```typescript
 * import { loadConfig, loadConfigSync } from 'kindle-tools-ts';
 *
 * // Async loading
 * const config = await loadConfig();
 * if (config) {
 *   console.log('Loaded from:', config.filepath);
 *   console.log('Config:', config.config);
 * }
 *
 * // Sync loading (for CLI)
 * const configSync = loadConfigSync();
 * ```
 *
 * @packageDocumentation
 */

import type { CosmiconfigResult } from "cosmiconfig";
import { cosmiconfig, cosmiconfigSync } from "cosmiconfig";
import { type ConfigFile, ConfigFileSchema } from "#schemas/config.schema.js";
import { formatZodError } from "#utils/system/errors.js";

// Module name used for config file search
const MODULE_NAME = "kindletools";

/**
 * Result of loading a configuration file.
 */
export interface LoadedConfig {
  /** The validated configuration object */
  config: ConfigFile;
  /** Path to the configuration file that was loaded */
  filepath: string;
  /** Whether the config was empty (just {}) */
  isEmpty: boolean;
}

/**
 * Options for configuration loading.
 */
export interface LoadConfigOptions {
  /** Starting directory for the search (default: process.cwd()) */
  searchFrom?: string;
  /** Custom configuration file path to load directly */
  configPath?: string;
}

/**
 * Create the cosmiconfig explorer instance.
 */
function createExplorer() {
  return cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      "package.json",
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.json`,
      `.${MODULE_NAME}rc.yaml`,
      `.${MODULE_NAME}rc.yml`,
      `.${MODULE_NAME}rc.js`,
      `.${MODULE_NAME}rc.cjs`,
      `${MODULE_NAME}.config.js`,
      `${MODULE_NAME}.config.cjs`,
    ],
  });
}

/**
 * Create the sync cosmiconfig explorer instance.
 */
function createExplorerSync() {
  return cosmiconfigSync(MODULE_NAME, {
    searchPlaces: [
      "package.json",
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.json`,
      `.${MODULE_NAME}rc.yaml`,
      `.${MODULE_NAME}rc.yml`,
      `.${MODULE_NAME}rc.js`,
      `.${MODULE_NAME}rc.cjs`,
      `${MODULE_NAME}.config.js`,
      `${MODULE_NAME}.config.cjs`,
    ],
  });
}

/**
 * Process and validate a cosmiconfig result.
 */
function processResult(result: CosmiconfigResult): LoadedConfig | null {
  if (!result || result.isEmpty) {
    return null;
  }

  // Validate the configuration with Zod
  const parseResult = ConfigFileSchema.safeParse(result.config);

  if (!parseResult.success) {
    const errorMessage = formatZodError(parseResult.error);
    throw new Error(`Invalid configuration in ${result.filepath}:\n${errorMessage}`);
  }

  return {
    config: parseResult.data,
    filepath: result.filepath,
    isEmpty: result.isEmpty ?? true,
  };
}

/**
 * Load configuration asynchronously.
 *
 * Searches for configuration files starting from the specified directory
 * and moving up the directory tree.
 *
 * @param options - Loading options
 * @returns The loaded and validated configuration, or null if not found
 * @throws Error if configuration is found but invalid
 *
 * @example
 * ```typescript
 * // Search from current directory
 * const config = await loadConfig();
 *
 * // Search from a specific directory
 * const config = await loadConfig({ searchFrom: '/path/to/project' });
 *
 * // Load a specific file
 * const config = await loadConfig({ configPath: './.kindletoolsrc.json' });
 * ```
 */
export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig | null> {
  const explorer = createExplorer();

  let result: CosmiconfigResult;

  if (options.configPath) {
    // Load specific file
    result = await explorer.load(options.configPath);
  } else {
    // Search for config
    result = await explorer.search(options.searchFrom);
  }

  return processResult(result);
}

/**
 * Load configuration synchronously.
 *
 * Useful for CLI applications where async is not convenient.
 *
 * @param options - Loading options
 * @returns The loaded and validated configuration, or null if not found
 * @throws Error if configuration is found but invalid
 *
 * @example
 * ```typescript
 * const config = loadConfigSync();
 * if (config) {
 *   console.log(`Using config from: ${config.filepath}`);
 * }
 * ```
 */
export function loadConfigSync(options: LoadConfigOptions = {}): LoadedConfig | null {
  const explorer = createExplorerSync();

  let result: CosmiconfigResult;

  if (options.configPath) {
    // Load specific file
    result = explorer.load(options.configPath);
  } else {
    // Search for config
    result = explorer.search(options.searchFrom);
  }

  return processResult(result);
}

/**
 * Clear the configuration cache.
 *
 * Useful during development or when configuration files change.
 */
export function clearConfigCache(): void {
  createExplorer().clearCaches();
}

/**
 * Clear the sync configuration cache.
 */
export function clearConfigCacheSync(): void {
  createExplorerSync().clearCaches();
}
