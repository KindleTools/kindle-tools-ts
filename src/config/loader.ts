/**
 * Configuration file loader using cosmiconfig.
 *
 * Automatically searches for configuration files named:
 * - .kindletoolsrc
 * - .kindletoolsrc.json
 * - .kindletoolsrc.yaml
 * - .kindletoolsrc.yml
 * - .kindletoolsrc.toml
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

import { parse as parseToml } from "@iarna/toml";
import type { CosmiconfigResult } from "cosmiconfig";
import { cosmiconfig, cosmiconfigSync } from "cosmiconfig";
import { closest } from "fastest-levenshtein";
import { AppException } from "#errors";
import { type ConfigFile, ConfigFileSchema } from "#schemas/config.schema.js";
import { expandEnvVars } from "#utils/system/env-expander.js";
import { formatZodError } from "#utils/system/errors.js";

// Module name used for config file search
const MODULE_NAME = "kindletools";

// Singleton instances for caching
let asyncExplorer: ReturnType<typeof cosmiconfig> | null = null;
let syncExplorer: ReturnType<typeof cosmiconfigSync> | null = null;

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

/** Search places for config files */
const SEARCH_PLACES = [
  "package.json",
  `.${MODULE_NAME}rc`,
  `.${MODULE_NAME}rc.json`,
  `.${MODULE_NAME}rc.yaml`,
  `.${MODULE_NAME}rc.yml`,
  `.${MODULE_NAME}rc.toml`,
  `.${MODULE_NAME}rc.js`,
  `.${MODULE_NAME}rc.cjs`,
  `${MODULE_NAME}.config.js`,
  `${MODULE_NAME}.config.cjs`,
];

/**
 * Get the async cosmiconfig explorer instance (singleton).
 */
function getAsyncExplorer() {
  if (!asyncExplorer) {
    asyncExplorer = cosmiconfig(MODULE_NAME, {
      searchPlaces: SEARCH_PLACES,
      loaders: {
        ".toml": (filepath, content) => parseToml(content),
      },
    });
  }
  return asyncExplorer;
}

/**
 * Get the sync cosmiconfig explorer instance (singleton).
 */
function getSyncExplorer() {
  if (!syncExplorer) {
    syncExplorer = cosmiconfigSync(MODULE_NAME, {
      searchPlaces: SEARCH_PLACES,
      loaders: {
        ".toml": (filepath, content) => parseToml(content),
      },
    });
  }
  return syncExplorer;
}

/**
 * Get closest matching key for suggestions
 */
function getSuggestion(invalidKey: string): string | null {
  const validKeys = Object.keys(ConfigFileSchema.shape);
  const suggestion = closest(invalidKey, validKeys);
  // Only suggest if it's somewhat similar (basic heuristic could be improved)
  return suggestion || null;
}

/**
 * Process and validate a cosmiconfig result.
 */
function processResult(result: CosmiconfigResult): LoadedConfig | null {
  if (!result || result.isEmpty) {
    return null;
  }

  // 1. Expand environment variables
  const expandedConfig = expandEnvVars(result.config);

  // 2. Validate the configuration with Zod
  const parseResult = ConfigFileSchema.safeParse(expandedConfig);

  if (!parseResult.success) {
    const error = parseResult.error;

    // Enhance error message with "Did you mean?" suggestions
    let customErrorMessage = "";

    // Check for unrecognized keys
    const unrecognizedIssues = error.issues.filter((issue) => issue.code === "unrecognized_keys");

    if (unrecognizedIssues.length > 0) {
      const suggestions: string[] = [];
      for (const issue of unrecognizedIssues) {
        if (issue.code === "unrecognized_keys") {
          for (const key of issue.keys) {
            const suggestion = getSuggestion(key);
            if (suggestion) {
              suggestions.push(`Unknown key '${key}'. Did you mean '${suggestion}'?`);
            }
          }
        }
      }

      if (suggestions.length > 0) {
        customErrorMessage = `\nSuggestions:\n${suggestions.map((s) => `- ${s}`).join("\n")}`;
      }
    }

    const baseErrorMessage = formatZodError(error);
    throw new AppException({
      code: "CONFIG_INVALID",
      message: `Invalid configuration in ${result.filepath}:\n${baseErrorMessage}${customErrorMessage}`,
      path: result.filepath,
      cause: error,
    });
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
  const explorer = getAsyncExplorer();

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
  const explorer = getSyncExplorer();

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
  asyncExplorer?.clearCaches();
}

/**
 * Clear the sync configuration cache.
 */
export function clearConfigCacheSync(): void {
  syncExplorer?.clearCaches();
}
