/**
 * Configuration loading and management.
 *
 * @packageDocumentation
 */

import type { ConfigFileInput } from "#schemas/config.schema.js";

export {
  clearConfigCache,
  clearConfigCacheSync,
  type LoadConfigOptions,
  type LoadedConfig,
  loadConfig,
  loadConfigSync,
} from "./loader.js";

/**
 * Define configuration with type safety.
 *
 * This helper function doesn't do anything at runtime but provides
 * type inference and autocompletion in JavaScript configuration files.
 *
 * @example
 * ```javascript
 * // kindletools.config.js
 * import { defineConfig } from 'kindle-tools-ts';
 *
 * export default defineConfig({
 *   format: "obsidian",
 *   output: "./exports"
 * });
 * ```
 */
export function defineConfig(config: ConfigFileInput): ConfigFileInput {
  return config;
}
