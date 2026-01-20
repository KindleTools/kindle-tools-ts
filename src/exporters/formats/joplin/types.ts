/**
 * Type definitions for Joplin exporter.
 *
 * @packageDocumentation
 */

import type { GeoLocation } from "#app-types/geo.js";
import type { MultiFileExporterOptions } from "#exporters/shared/multi-file-exporter.js";

// ============================================================================
// Constants
// ============================================================================

/** Joplin entity type constants */
export const JOPLIN_TYPES = {
  NOTE: 1,
  FOLDER: 2,
  TAG: 5,
  NOTE_TAG: 6,
} as const;

/** Joplin markup language constants */
export const JOPLIN_MARKUP = {
  MARKDOWN: 1,
} as const;

/** Joplin source identifiers */
export const JOPLIN_SOURCE = {
  SOURCE: "kindle-to-jex",
  SOURCE_APP: "kindle-tools-ts",
} as const;

// ============================================================================
// Options
// ============================================================================

/**
 * Extended options for Joplin export.
 * Extends ExporterOptionsParsed with Joplin-specific options.
 */
export interface JoplinExporterOptions extends MultiFileExporterOptions {
  /** Root notebook name (default: "Kindle Highlights") */
  notebookName?: string | undefined;

  /** Add tags to notes (default: []) */
  tags?: string[];

  /**
   * Estimate page numbers from Kindle locations when not available.
   * Uses ~16.69 locations per page as a heuristic.
   * Default: true
   */
  estimatePages?: boolean;

  /**
   * Geographic location where the reading took place.
   * If provided, latitude/longitude/altitude will be added to each note.
   * Useful for personal knowledge management.
   *
   * @example
   * { latitude: 40.7128, longitude: -74.0060, altitude: 10 }
   */
  geoLocation?: GeoLocation;
}

// ============================================================================
// Joplin Entity Types
// ============================================================================

/**
 * Joplin note metadata structure (complete fields).
 */
export interface JoplinNote {
  id: string;
  parent_id: string;
  title: string;
  body: string;
  created_time: number;
  updated_time: number;
  user_created_time: number;
  user_updated_time: number;
  is_todo: number;
  todo_completed: number;
  source: string;
  source_url: string;
  source_application: string;
  order: number;
  latitude: number;
  longitude: number;
  altitude: number;
  author: string;
  is_shared: number;
  encryption_applied: number;
  markup_language: number;
  type_: number;
}

/**
 * Joplin notebook metadata structure.
 */
export interface JoplinNotebook {
  id: string;
  parent_id: string;
  title: string;
  created_time: number;
  updated_time: number;
  type_: number;
}

/**
 * Joplin tag structure.
 */
export interface JoplinTag {
  id: string;
  title: string;
  parent_id: string;
  created_time: number;
  updated_time: number;
  type_: number;
}

/**
 * Joplin note-tag association.
 */
export interface JoplinNoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  created_time: number;
  updated_time: number;
  type_: number;
}

// ============================================================================
// Export Context
// ============================================================================

/**
 * Ephemeral context for a single export operation.
 * Replaces mutable class state for stateless exports.
 */
export interface JoplinExportContext {
  rootNotebookId: string;
  rootNotebookName: string;
  authorNotebookIds: Map<string, string>;
  tagMap: Map<string, string>;
  orderCounter: number;
}
