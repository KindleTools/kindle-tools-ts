/**
 * Configuration types and helpers.
 *
 * @packageDocumentation
 */

import type { ConfigFileInput } from "#schemas/config.schema.js";

export { DEFAULTS, LOCATION_CONSTANTS } from "./defaults.js";

/**
 * Define configuration with type safety.
 *
 * This helper function provides type inference and autocompletion
 * when creating configuration objects.
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'kindle-tools-ts';
 *
 * const config = defineConfig({
 *   format: "obsidian",
 *   output: "./exports"
 * });
 * ```
 */
export function defineConfig(config: ConfigFileInput): ConfigFileInput {
  return config;
}
