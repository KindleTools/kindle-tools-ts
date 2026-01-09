/**
 * Plugin system types and interfaces.
 *
 * This module defines the contract for plugins that extend KindleTools functionality.
 * Plugins can provide additional importers (file formats) or exporters (output formats).
 *
 * @example
 * ```typescript
 * import type { ExporterPlugin, ImporterPlugin, Plugin } from 'kindle-tools-ts/plugins';
 *
 * const myExporter: ExporterPlugin = {
 *   name: 'my-exporter',
 *   version: '1.0.0',
 *   format: 'notion',
 *   create: () => new NotionExporter(),
 * };
 *
 * pluginRegistry.registerExporter(myExporter);
 * ```
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import type { ExportResult, ImportResult } from "#errors";

// =============================================================================
// Base Plugin Interface
// =============================================================================

/**
 * Base metadata for all plugins.
 */
export interface PluginMeta {
  /** Unique plugin identifier (lowercase, kebab-case recommended) */
  name: string;

  /** Semantic version string (e.g., "1.0.0") */
  version: string;

  /** Human-readable description */
  description?: string;

  /** Plugin author or maintainer */
  author?: string;

  /** Plugin homepage or repository URL */
  homepage?: string;
}

// =============================================================================
// Importer Plugin
// =============================================================================

/**
 * Interface for importer plugins.
 *
 * Importer plugins allow parsing additional file formats (e.g., XML, EPUB annotations).
 */
export interface ImporterPlugin extends PluginMeta {
  /**
   * File extensions this importer handles (with leading dot).
   * @example [".xml", ".opf"]
   */
  extensions: string[];

  /**
   * Create an importer instance.
   * The importer must implement the standard Importer interface.
   */
  create: () => ImporterInstance;
}

/**
 * Interface that importer plugin instances must implement.
 * This mirrors the core Importer interface for consistency.
 */
export interface ImporterInstance {
  /** Name of the importer */
  name: string;

  /**
   * Parse content and return clippings.
   *
   * @param content - Raw file content as string
   * @param options - Optional parsing options
   * @returns Import result with clippings or error
   */
  import(content: string, options?: Record<string, unknown>): Promise<ImportResult>;
}

// =============================================================================
// Exporter Plugin
// =============================================================================

/**
 * Interface for exporter plugins.
 *
 * Exporter plugins allow exporting to additional formats (e.g., Notion, Anki).
 */
export interface ExporterPlugin extends PluginMeta {
  /**
   * Format identifier (lowercase).
   * Used as the format string in CLI (e.g., --format notion).
   * @example "notion"
   */
  format: string;

  /**
   * Optional format aliases.
   * @example ["anki-txt", "anki-csv"]
   */
  aliases?: string[];

  /**
   * Create an exporter instance.
   * The exporter must implement the standard Exporter interface.
   */
  create: () => ExporterInstance;
}

/**
 * Interface that exporter plugin instances must implement.
 * This mirrors the core Exporter interface for consistency.
 */
export interface ExporterInstance {
  /** Name of the exporter */
  name: string;

  /** File extension for output files */
  extension: string;

  /**
   * Export clippings to the target format.
   *
   * @param clippings - Array of clippings to export
   * @param options - Export options
   * @returns Export result with output content or error
   */
  export(clippings: Clipping[], options?: Record<string, unknown>): Promise<ExportResult>;
}

// =============================================================================
// Generic Plugin
// =============================================================================

/**
 * Union type for all plugin types.
 */
export type Plugin = ImporterPlugin | ExporterPlugin;

/**
 * Type guard to check if a plugin is an ImporterPlugin.
 */
export function isImporterPlugin(plugin: Plugin): plugin is ImporterPlugin {
  return "extensions" in plugin && Array.isArray(plugin.extensions);
}

/**
 * Type guard to check if a plugin is an ExporterPlugin.
 */
export function isExporterPlugin(plugin: Plugin): plugin is ExporterPlugin {
  return "format" in plugin && typeof plugin.format === "string";
}

// =============================================================================
// Plugin Registry Events
// =============================================================================

/**
 * Event types emitted by the plugin registry.
 */
export type PluginEventType =
  | "importer:registered"
  | "importer:unregistered"
  | "exporter:registered"
  | "exporter:unregistered";

/**
 * Plugin event payload.
 */
export interface PluginEvent {
  type: PluginEventType;
  plugin: Plugin;
  timestamp: Date;
}

/**
 * Plugin event listener function.
 */
export type PluginEventListener = (event: PluginEvent) => void;

// =============================================================================
// Plugin Loading Utilities
// =============================================================================

/**
 * Result of validating a plugin.
 */
export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Options for loading plugins dynamically.
 */
export interface PluginLoadOptions {
  /** Path to plugin module or package name */
  source: string;

  /** Whether to validate plugin before registering */
  validate?: boolean;

  /** Allow overwriting existing plugins */
  allowOverwrite?: boolean;
}
