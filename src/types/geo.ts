/**
 * Geographic location types.
 *
 * @packageDocumentation
 */

/**
 * Geographic coordinates in WGS84 format (standard GPS coordinates).
 */
export interface GeoLocation {
  /** Latitude in decimal degrees (-90 to 90) */
  latitude: number;

  /** Longitude in decimal degrees (-180 to 180) */
  longitude: number;

  /** Altitude in meters above sea level (optional) */
  altitude?: number;

  /** Human-readable place name (optional) */
  placeName?: string;
}
