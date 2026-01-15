/**
 * Plugin Registry - Central hub for managing KindleTools plugins.
 *
 * The registry manages registration, discovery, and lifecycle of plugins.
 * It integrates with the existing Factory pattern to seamlessly extend
 * import/export capabilities.
 *
 * @example
 * ```typescript
 * import { pluginRegistry } from 'kindle-tools-ts/plugins';
 *
 * // Register a custom exporter plugin
 * pluginRegistry.registerExporter({
 *   name: 'notion-exporter',
 *   version: '1.0.0',
 *   format: 'notion',
 *   create: () => new NotionExporter(),
 * });
 *
 * // Check if format is available
 * if (pluginRegistry.hasExporter('notion')) {
 *   const exporter = pluginRegistry.getExporter('notion');
 * }
 * ```
 *
 * @packageDocumentation
 */

import { AppException } from "#errors";
import type {
  ExporterInstance,
  ExporterPlugin,
  ImporterInstance,
  ImporterPlugin,
  Plugin,
  PluginEvent,
  PluginEventListener,
  PluginEventType,
  PluginMeta,
  PluginValidationResult,
} from "./types.js";

// =============================================================================
// Plugin Validation
// =============================================================================

/**
 * Validate plugin metadata.
 */
function validatePluginMeta(plugin: PluginMeta): string[] {
  const errors: string[] = [];

  if (!plugin.name || typeof plugin.name !== "string") {
    errors.push("Plugin must have a valid 'name' string");
  } else if (!/^[a-z][a-z0-9-]*$/.test(plugin.name)) {
    errors.push("Plugin name should be lowercase with hyphens (kebab-case)");
  }

  if (!plugin.version || typeof plugin.version !== "string") {
    errors.push("Plugin must have a valid 'version' string");
  } else if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
    errors.push("Plugin version should follow semver (e.g., 1.0.0)");
  }

  return errors;
}

/**
 * Validate an importer plugin.
 */
function validateImporterPlugin(plugin: ImporterPlugin): PluginValidationResult {
  const errors = validatePluginMeta(plugin);
  const warnings: string[] = [];

  if (!Array.isArray(plugin.extensions) || plugin.extensions.length === 0) {
    errors.push("ImporterPlugin must have at least one extension");
  } else {
    for (const ext of plugin.extensions) {
      if (!ext.startsWith(".")) {
        warnings.push(`Extension '${ext}' should start with a dot`);
      }
    }
  }

  if (typeof plugin.create !== "function") {
    errors.push("ImporterPlugin must have a 'create' factory function");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an exporter plugin.
 */
function validateExporterPlugin(plugin: ExporterPlugin): PluginValidationResult {
  const errors = validatePluginMeta(plugin);
  const warnings: string[] = [];

  if (!plugin.format || typeof plugin.format !== "string") {
    errors.push("ExporterPlugin must have a valid 'format' string");
  } else if (plugin.format !== plugin.format.toLowerCase()) {
    warnings.push("Format should be lowercase");
  }

  if (typeof plugin.create !== "function") {
    errors.push("ExporterPlugin must have a 'create' factory function");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an exporter instance at runtime.
 */
function validateExporterInstance(instance: unknown): instance is ExporterInstance {
  return (
    typeof instance === "object" &&
    instance !== null &&
    typeof (instance as ExporterInstance).export === "function" &&
    typeof (instance as ExporterInstance).name === "string" &&
    typeof (instance as ExporterInstance).extension === "string"
  );
}

/**
 * Validate an importer instance at runtime.
 */
function validateImporterInstance(instance: unknown): instance is ImporterInstance {
  return (
    typeof instance === "object" &&
    instance !== null &&
    typeof (instance as ImporterInstance).import === "function" &&
    typeof (instance as ImporterInstance).name === "string"
  );
}

// =============================================================================
// Plugin Registry Implementation
// =============================================================================

/**
 * Registered importer entry with metadata.
 */
interface RegisteredImporter {
  plugin: ImporterPlugin;
  extensions: string[];
  instance?: ImporterInstance;
}

/**
 * Registered exporter entry with metadata.
 */
interface RegisteredExporter {
  plugin: ExporterPlugin;
  formats: string[];
  instance?: ExporterInstance;
}

/**
 * Central registry for managing KindleTools plugins.
 *
 * Features:
 * - Type-safe plugin registration
 * - Plugin validation
 * - Event system for registry changes
 * - Integration with Factory pattern
 */
class PluginRegistry {
  // Importer plugins indexed by extension (normalized to lowercase with dot)
  private readonly importers = new Map<string, RegisteredImporter>();

  // Exporter plugins indexed by format (normalized to lowercase)
  private readonly exporters = new Map<string, RegisteredExporter>();

  // Plugin metadata indexed by name
  private readonly plugins = new Map<string, Plugin>();

  // Event listeners
  private readonly listeners = new Map<PluginEventType, Set<PluginEventListener>>();

  // ==========================================================================
  // Importer Plugin Management
  // ==========================================================================

  /**
   * Register an importer plugin.
   *
   * @param plugin - Importer plugin to register
   * @param options - Registration options
   * @throws Error if plugin is invalid or extension already registered (unless allowOverwrite)
   */
  registerImporter(plugin: ImporterPlugin, options?: { allowOverwrite?: boolean }): void {
    const validation = validateImporterPlugin(plugin);
    if (!validation.valid) {
      throw new AppException({
        code: "VALIDATION_SCHEMA",
        message: `Invalid importer plugin '${plugin.name}': ${validation.errors.join(", ")}`,
        schema: "ImporterPlugin",
      });
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn(
        `[PluginRegistry] Warnings for '${plugin.name}': ${validation.warnings.join(", ")}`,
      );
    }

    const normalizedExtensions: string[] = [];

    for (const ext of plugin.extensions) {
      const normalized = ext.toLowerCase().startsWith(".")
        ? ext.toLowerCase()
        : `.${ext.toLowerCase()}`;

      if (this.importers.has(normalized) && !options?.allowOverwrite) {
        throw new AppException({
          code: "VALIDATION_ARGS",
          message: `Extension '${normalized}' is already registered by plugin '${this.importers.get(normalized)?.plugin.name}'`,
          args: {
            extension: normalized,
            existingPlugin: this.importers.get(normalized)?.plugin.name,
          },
        });
      }

      normalizedExtensions.push(normalized);
    }

    // Register
    const entry: RegisteredImporter = { plugin, extensions: normalizedExtensions };
    for (const ext of normalizedExtensions) {
      this.importers.set(ext, entry);
    }
    this.plugins.set(plugin.name, plugin);

    this.emit("importer:registered", plugin);
  }

  /**
   * Unregister an importer plugin by name.
   */
  unregisterImporter(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !("extensions" in plugin)) {
      return false;
    }

    const importerPlugin = plugin as ImporterPlugin;
    for (const ext of importerPlugin.extensions) {
      const normalized = ext.toLowerCase().startsWith(".")
        ? ext.toLowerCase()
        : `.${ext.toLowerCase()}`;
      this.importers.delete(normalized);
    }
    this.plugins.delete(pluginName);

    this.emit("importer:unregistered", plugin);
    return true;
  }

  /**
   * Check if an extension has a registered importer.
   */
  hasImporter(extension: string): boolean {
    const normalized = extension.toLowerCase().startsWith(".")
      ? extension.toLowerCase()
      : `.${extension.toLowerCase()}`;
    return this.importers.has(normalized);
  }

  /**
   * Get an importer instance for a file extension.
   */
  getImporter(extension: string): ImporterInstance | null {
    const normalized = extension.toLowerCase().startsWith(".")
      ? extension.toLowerCase()
      : `.${extension.toLowerCase()}`;

    const entry = this.importers.get(normalized);
    if (!entry) {
      return null;
    }

    // Check for existing instance (Singleton)
    if (entry.instance) {
      return entry.instance;
    }

    // Create and validate new instance
    let instance: unknown;
    try {
      instance = entry.plugin.create();
    } catch (error) {
      throw new AppException({
        code: "PLUGIN_INIT_ERROR",
        message: `Failed to initialize importer plugin '${entry.plugin.name}'`,
        cause: error,
      });
    }

    if (!validateImporterInstance(instance)) {
      throw new AppException({
        code: "PLUGIN_INVALID_INSTANCE",
        message: `Plugin '${entry.plugin.name}' did not return a valid Importer instance`,
      });
    }

    // Cache instance
    entry.instance = instance;
    return instance;
  }

  /**
   * Get all registered importer extensions.
   */
  getImporterExtensions(): string[] {
    return Array.from(this.importers.keys());
  }

  // ==========================================================================
  // Exporter Plugin Management
  // ==========================================================================

  /**
   * Register an exporter plugin.
   *
   * @param plugin - Exporter plugin to register
   * @param options - Registration options
   * @throws Error if plugin is invalid or format already registered (unless allowOverwrite)
   */
  registerExporter(plugin: ExporterPlugin, options?: { allowOverwrite?: boolean }): void {
    const validation = validateExporterPlugin(plugin);
    if (!validation.valid) {
      throw new AppException({
        code: "VALIDATION_SCHEMA",
        message: `Invalid exporter plugin '${plugin.name}': ${validation.errors.join(", ")}`,
        schema: "ExporterPlugin",
      });
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn(
        `[PluginRegistry] Warnings for '${plugin.name}': ${validation.warnings.join(", ")}`,
      );
    }

    const formats = [
      plugin.format.toLowerCase(),
      ...(plugin.aliases?.map((a) => a.toLowerCase()) ?? []),
    ];

    for (const format of formats) {
      if (this.exporters.has(format) && !options?.allowOverwrite) {
        throw new AppException({
          code: "VALIDATION_ARGS",
          message: `Format '${format}' is already registered by plugin '${this.exporters.get(format)?.plugin.name}'`,
          args: { format, existingPlugin: this.exporters.get(format)?.plugin.name },
        });
      }
    }

    // Register
    const entry: RegisteredExporter = { plugin, formats };
    for (const format of formats) {
      this.exporters.set(format, entry);
    }
    this.plugins.set(plugin.name, plugin);

    this.emit("exporter:registered", plugin);
  }

  /**
   * Unregister an exporter plugin by name.
   */
  unregisterExporter(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !("format" in plugin)) {
      return false;
    }

    const exporterPlugin = plugin as ExporterPlugin;
    const formats = [exporterPlugin.format, ...(exporterPlugin.aliases ?? [])];
    for (const format of formats) {
      this.exporters.delete(format.toLowerCase());
    }
    this.plugins.delete(pluginName);

    this.emit("exporter:unregistered", plugin);
    return true;
  }

  /**
   * Check if a format has a registered exporter.
   */
  hasExporter(format: string): boolean {
    return this.exporters.has(format.toLowerCase());
  }

  /**
   * Get an exporter instance for a format.
   */
  getExporter(format: string): ExporterInstance | null {
    const entry = this.exporters.get(format.toLowerCase());
    if (!entry) {
      return null;
    }

    // Check for existing instance (Singleton)
    if (entry.instance) {
      return entry.instance;
    }

    // Create and validate new instance
    let instance: unknown;
    try {
      instance = entry.plugin.create();
    } catch (error) {
      throw new AppException({
        code: "PLUGIN_INIT_ERROR",
        message: `Failed to initialize exporter plugin '${entry.plugin.name}'`,
        cause: error,
      });
    }

    if (!validateExporterInstance(instance)) {
      throw new AppException({
        code: "PLUGIN_INVALID_INSTANCE",
        message: `Plugin '${entry.plugin.name}' did not return a valid Exporter instance`,
      });
    }

    // Cache instance
    entry.instance = instance;
    return instance;
  }

  /**
   * Get all registered exporter formats.
   */
  getExporterFormats(): string[] {
    return Array.from(this.exporters.keys());
  }

  // ==========================================================================
  // Generic Plugin Queries
  // ==========================================================================

  /**
   * Get plugin metadata by name.
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins.
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get count of registered plugins.
   */
  getPluginCount(): { importers: number; exporters: number; total: number } {
    const importerNames = new Set<string>();
    const exporterNames = new Set<string>();

    for (const entry of this.importers.values()) {
      importerNames.add(entry.plugin.name);
    }
    for (const entry of this.exporters.values()) {
      exporterNames.add(entry.plugin.name);
    }

    return {
      importers: importerNames.size,
      exporters: exporterNames.size,
      total: this.plugins.size,
    };
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Subscribe to registry events.
   */
  on(event: PluginEventType, listener: PluginEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /**
   * Emit a registry event.
   */
  private emit(type: PluginEventType, plugin: Plugin): void {
    const listeners = this.listeners.get(type);
    if (!listeners) return;

    const event: PluginEvent = { type, plugin, timestamp: new Date() };
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`[PluginRegistry] Event listener error:`, error);
      }
    }
  }

  // ==========================================================================
  // Lifecycle Management
  // ==========================================================================

  /**
   * Reset a plugin's instance.
   *
   * This clears the cached singleton instance of the plugin, forcing it to be
   * re-created on next access. Useful for testing or hot-reloading.
   *
   * @param pluginName - Name of the plugin to reset
   */
  resetPluginInstance(pluginName: string): void {
    // Check importers
    for (const entry of this.importers.values()) {
      if (entry.plugin.name === pluginName) {
        delete entry.instance;
      }
    }

    // Check exporters
    for (const entry of this.exporters.values()) {
      if (entry.plugin.name === pluginName) {
        delete entry.instance;
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Clear all registered plugins.
   * Useful for testing.
   */
  clear(): void {
    this.importers.clear();
    this.exporters.clear();
    this.plugins.clear();
  }

  /**
   * Get a summary of registered plugins for debugging.
   */
  getSummary(): string {
    const lines: string[] = ["[PluginRegistry Summary]"];
    const counts = this.getPluginCount();
    lines.push(
      `Total plugins: ${counts.total} (${counts.importers} importers, ${counts.exporters} exporters)`,
    );

    if (counts.importers > 0) {
      lines.push(`\nImporter extensions: ${this.getImporterExtensions().join(", ")}`);
    }

    if (counts.exporters > 0) {
      lines.push(`Exporter formats: ${this.getExporterFormats().join(", ")}`);
    }

    return lines.join("\n");
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Global plugin registry instance.
 *
 * This is the primary way to interact with the plugin system.
 */
export const pluginRegistry = new PluginRegistry();

// Also export the class for testing or custom instances
export { PluginRegistry };
