/**
 * Constants related to defaults and locations.
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
 * Constants related to finding and estimating locations/pages.
 */
export const LOCATION_CONSTANTS = {
  /**
   * Number of Kindle locations that approximately correspond to one page.
   * Based on ~128 bytes per location and typical font sizes.
   */
  LOCATIONS_PER_PAGE: 16,

  /**
   * Default number of digits for zero-padding page numbers.
   * Using 4 digits allows for books up to 9999 pages.
   */
  PAGE_PADDING_LENGTH: 4,
} as const;
