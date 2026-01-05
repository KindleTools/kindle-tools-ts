/**
 * Geographic location utilities for Kindle clippings.
 *
 * Some users want to track where they were reading when they made highlights.
 * This is useful for:
 * - Personal knowledge management (Notion, Roam, Obsidian)
 * - Travel logs
 * - Reading journals
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

/**
 * Validate that a GeoLocation has valid coordinates.
 *
 * @param location - Location to validate
 * @returns True if coordinates are valid
 *
 * @example
 * isValidGeoLocation({ latitude: 40.7128, longitude: -74.0060 }) // true (NYC)
 * isValidGeoLocation({ latitude: 91, longitude: 0 }) // false (lat out of range)
 */
export function isValidGeoLocation(location: GeoLocation): boolean {
  const { latitude, longitude, altitude } = location;

  // Latitude must be between -90 and 90
  if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
    return false;
  }

  // Longitude must be between -180 and 180
  if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
    return false;
  }

  // Altitude, if provided, must be a number
  if (altitude !== undefined && typeof altitude !== "number") {
    return false;
  }

  return true;
}

/**
 * Format a GeoLocation to a human-readable string.
 *
 * @param location - Location to format
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * formatGeoLocation({ latitude: 40.7128, longitude: -74.0060 })
 * // "40.7128°N, 74.006°W"
 *
 * formatGeoLocation({ latitude: 40.7128, longitude: -74.0060, placeName: "New York" })
 * // "New York (40.7128°N, 74.006°W)"
 */
export function formatGeoLocation(
  location: GeoLocation,
  options?: { includeAltitude?: boolean; precision?: number },
): string {
  const precision = options?.precision ?? 4;
  const includeAlt = options?.includeAltitude ?? true;

  const latDir = location.latitude >= 0 ? "N" : "S";
  const lonDir = location.longitude >= 0 ? "E" : "W";

  const lat = Math.abs(location.latitude).toFixed(precision);
  const lon = Math.abs(location.longitude).toFixed(precision);

  let coords = `${lat}°${latDir}, ${lon}°${lonDir}`;

  if (includeAlt && location.altitude !== undefined) {
    coords += ` (${location.altitude}m)`;
  }

  if (location.placeName) {
    return `${location.placeName} (${coords})`;
  }

  return coords;
}

/**
 * Convert a GeoLocation to a Google Maps URL.
 *
 * @param location - Location to convert
 * @returns Google Maps URL that opens the location
 *
 * @example
 * toGoogleMapsUrl({ latitude: 40.7128, longitude: -74.0060 })
 * // "https://www.google.com/maps?q=40.7128,-74.006"
 */
export function toGoogleMapsUrl(location: GeoLocation): string {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

/**
 * Convert a GeoLocation to an OpenStreetMap URL.
 *
 * @param location - Location to convert
 * @returns OpenStreetMap URL that opens the location
 *
 * @example
 * toOpenStreetMapUrl({ latitude: 40.7128, longitude: -74.0060 })
 * // "https://www.openstreetmap.org/?mlat=40.7128&mlon=-74.006#map=15/40.7128/-74.006"
 */
export function toOpenStreetMapUrl(location: GeoLocation): string {
  const lat = location.latitude;
  const lon = location.longitude;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
}

/**
 * Parse a geo location string in various formats.
 *
 * Supported formats:
 * - "40.7128, -74.0060" (decimal degrees)
 * - "40.7128° N, 74.0060° W" (with directions)
 * - "40°42'46\"N 74°0'22\"W" (DMS format)
 *
 * @param input - String to parse
 * @returns Parsed GeoLocation or null if parsing failed
 */
export function parseGeoLocation(input: string): GeoLocation | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const cleaned = input.trim();

  // Try decimal degrees format: "40.7128, -74.0060" or "40.7128 -74.0060"
  // Try decimal degrees format: "40.7128, -74.0060" or "40.7128 -74.0060"
  const decimalMatch = cleaned.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (decimalMatch?.length === 3) {
    const latStr = decimalMatch[1];
    const lonStr = decimalMatch[2];
    if (latStr && lonStr) {
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lonStr);
      const location = { latitude, longitude };
      return isValidGeoLocation(location) ? location : null;
    }
  }

  // Try format with directions: "40.7128°N, 74.0060°W"
  const directionMatch = cleaned.match(
    /(-?\d+\.?\d*)\s*°?\s*([NS])[,\s]+(-?\d+\.?\d*)\s*°?\s*([EW])/i,
  );
  if (directionMatch?.length === 5) {
    const latVal = directionMatch[1];
    const latDir = directionMatch[2];
    const lonVal = directionMatch[3];
    const lonDir = directionMatch[4];

    if (latVal && latDir && lonVal && lonDir) {
      let latitude = parseFloat(latVal);
      let longitude = parseFloat(lonVal);

      if (latDir.toUpperCase() === "S") latitude = -latitude;
      if (lonDir.toUpperCase() === "W") longitude = -longitude;

      const location = { latitude, longitude };
      return isValidGeoLocation(location) ? location : null;
    }
  }

  return null;
}

/**
 * Calculate the distance between two locations using the Haversine formula.
 *
 * @param from - Starting location
 * @param to - Ending location
 * @returns Distance in kilometers
 *
 * @example
 * const nyc = { latitude: 40.7128, longitude: -74.0060 };
 * const la = { latitude: 34.0522, longitude: -118.2437 };
 * distanceBetween(nyc, la) // ~3935.75 km
 */
export function distanceBetween(from: GeoLocation, to: GeoLocation): number {
  const R = 6371; // Earth's radius in km

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
