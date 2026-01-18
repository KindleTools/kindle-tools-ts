/**
 * Configuration constants and defaults.
 *
 * @packageDocumentation
 */

import { LOCATIONS_PER_PAGE, PAGE_PADDING_LENGTH } from "#domain/core/locations.js";

/**
 * User-facing defaults.
 */
export const DEFAULTS = {
  /**
   * Default value for unknown authors.
   */
  UNKNOWN_AUTHOR: "Unknown Author",

  /**
   * Default title for export collections.
   */
  EXPORT_TITLE: "Kindle Highlights",
} as const;

/**
 * Location constants re-exported from domain for backwards compatibility.
 *
 * @see {@link #domain/core/locations.js} for the source of truth.
 */
export const LOCATION_CONSTANTS = {
  LOCATIONS_PER_PAGE,
  PAGE_PADDING_LENGTH,
} as const;
