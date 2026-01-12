/**
 * Tests for geo-location module.
 */

import { describe, expect, it } from "vitest";
import {
  distanceBetween,
  formatGeoLocation,
  isValidGeoLocation,
  parseGeoLocation,
  toGoogleMapsUrl,
  toOpenStreetMapUrl,
} from "#utils/geo/index.js";

describe("geo-location", () => {
  describe("isValidGeoLocation", () => {
    it("should validate correct coordinates", () => {
      expect(isValidGeoLocation({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidGeoLocation({ latitude: 40.7128, longitude: -74.006 })).toBe(true);
      expect(isValidGeoLocation({ latitude: -90, longitude: 180 })).toBe(true);
      expect(isValidGeoLocation({ latitude: 90, longitude: -180 })).toBe(true);
    });

    it("should reject invalid latitude", () => {
      expect(isValidGeoLocation({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidGeoLocation({ latitude: -91, longitude: 0 })).toBe(false);
    });

    it("should reject invalid longitude", () => {
      expect(isValidGeoLocation({ latitude: 0, longitude: 181 })).toBe(false);
      expect(isValidGeoLocation({ latitude: 0, longitude: -181 })).toBe(false);
    });

    it("should validate with altitude", () => {
      expect(isValidGeoLocation({ latitude: 40, longitude: -74, altitude: 100 })).toBe(true);
      expect(isValidGeoLocation({ latitude: 40, longitude: -74, altitude: -10 })).toBe(true);
    });
  });

  describe("formatGeoLocation", () => {
    it("should format coordinates with direction", () => {
      const nyc = { latitude: 40.7128, longitude: -74.006 };
      expect(formatGeoLocation(nyc)).toBe("40.7128°N, 74.0060°W");
    });

    it("should format southern hemisphere", () => {
      const sydney = { latitude: -33.8688, longitude: 151.2093 };
      expect(formatGeoLocation(sydney)).toBe("33.8688°S, 151.2093°E");
    });

    it("should include place name when provided", () => {
      const nyc = { latitude: 40.7128, longitude: -74.006, placeName: "New York" };
      expect(formatGeoLocation(nyc)).toBe("New York (40.7128°N, 74.0060°W)");
    });

    it("should include altitude when provided and enabled", () => {
      const loc = { latitude: 40.7128, longitude: -74.006, altitude: 100 };
      expect(formatGeoLocation(loc)).toBe("40.7128°N, 74.0060°W (100m)");
      expect(formatGeoLocation(loc, { includeAltitude: false })).toBe("40.7128°N, 74.0060°W");
    });

    it("should respect precision option", () => {
      const loc = { latitude: 40.7128, longitude: -74.006 };
      expect(formatGeoLocation(loc, { precision: 2 })).toBe("40.71°N, 74.01°W");
    });
  });

  describe("toGoogleMapsUrl", () => {
    it("should generate Google Maps URL", () => {
      const nyc = { latitude: 40.7128, longitude: -74.006 };
      const url = toGoogleMapsUrl(nyc);
      expect(url).toBe("https://www.google.com/maps?q=40.7128,-74.006");
    });
  });

  describe("toOpenStreetMapUrl", () => {
    it("should generate OpenStreetMap URL", () => {
      const nyc = { latitude: 40.7128, longitude: -74.006 };
      const url = toOpenStreetMapUrl(nyc);
      expect(url).toContain("openstreetmap.org");
      expect(url).toContain("40.7128");
      expect(url).toContain("-74.006");
    });
  });

  describe("parseGeoLocation", () => {
    it("should parse decimal degrees format", () => {
      const result = parseGeoLocation("40.7128, -74.006");
      expect(result).toEqual({ latitude: 40.7128, longitude: -74.006 });
    });

    it("should parse space-separated format", () => {
      const result = parseGeoLocation("40.7128 -74.006");
      expect(result).toEqual({ latitude: 40.7128, longitude: -74.006 });
    });

    it("should parse format with direction letters", () => {
      const result = parseGeoLocation("40.7128°N, 74.006°W");
      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(40.7128);
      expect(result?.longitude).toBeCloseTo(-74.006);
    });

    it("should parse format with direction letters (south/east)", () => {
      const result = parseGeoLocation("33.8688°S, 151.2093°E");
      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(-33.8688);
      expect(result?.longitude).toBeCloseTo(151.2093);
    });

    it("should return null for invalid input", () => {
      expect(parseGeoLocation("")).toBeNull();
      expect(parseGeoLocation("invalid")).toBeNull();
      expect(parseGeoLocation("abc, def")).toBeNull();
    });

    it("should return null for out-of-range coordinates", () => {
      expect(parseGeoLocation("91, 0")).toBeNull();
      expect(parseGeoLocation("0, 181")).toBeNull();
    });
  });

  describe("distanceBetween", () => {
    it("should calculate distance between two points", () => {
      const nyc = { latitude: 40.7128, longitude: -74.006 };
      const la = { latitude: 34.0522, longitude: -118.2437 };
      const distance = distanceBetween(nyc, la);
      // NYC to LA is approximately 3935-3940 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it("should return 0 for same location", () => {
      const loc = { latitude: 40.7128, longitude: -74.006 };
      expect(distanceBetween(loc, loc)).toBe(0);
    });

    it("should calculate short distances accurately", () => {
      // Two points ~1 km apart
      const point1 = { latitude: 40.7128, longitude: -74.006 };
      const point2 = { latitude: 40.7218, longitude: -74.006 }; // ~1 km north
      const distance = distanceBetween(point1, point2);
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });
  });
});
