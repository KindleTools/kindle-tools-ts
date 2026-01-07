/**
 * Tests for page-utils module.
 */

import { describe, expect, it } from "vitest";
import {
  estimatePageFromLocation,
  formatPage,
  formatPageOrPlaceholder,
  getEffectivePage,
  getPageInfo,
  LOCATIONS_PER_PAGE,
  PAGE_PADDING_LENGTH,
} from "#domain/locations.js";

describe("page-utils", () => {
  describe("constants", () => {
    it("should have correct LOCATIONS_PER_PAGE", () => {
      expect(LOCATIONS_PER_PAGE).toBe(16);
    });

    it("should have correct PAGE_PADDING_LENGTH", () => {
      expect(PAGE_PADDING_LENGTH).toBe(4);
    });
  });

  describe("formatPage", () => {
    it("should format single-digit page numbers with zero-padding", () => {
      expect(formatPage(5)).toBe("[0005]");
    });

    it("should format two-digit page numbers with zero-padding", () => {
      expect(formatPage(42)).toBe("[0042]");
    });

    it("should format three-digit page numbers with zero-padding", () => {
      expect(formatPage(123)).toBe("[0123]");
    });

    it("should format four-digit page numbers without extra padding", () => {
      expect(formatPage(1234)).toBe("[1234]");
    });

    it("should format five-digit page numbers (exceeds default padding)", () => {
      expect(formatPage(12345)).toBe("[12345]");
    });

    it("should return null for null page", () => {
      expect(formatPage(null)).toBeNull();
    });

    it("should allow custom padding length", () => {
      expect(formatPage(5, 2)).toBe("[05]");
      expect(formatPage(5, 6)).toBe("[000005]");
    });

    it("should handle page 0", () => {
      expect(formatPage(0)).toBe("[0000]");
    });
  });

  describe("formatPageOrPlaceholder", () => {
    it("should format page numbers just like formatPage", () => {
      expect(formatPageOrPlaceholder(42)).toBe("[0042]");
    });

    it("should return default placeholder for null", () => {
      expect(formatPageOrPlaceholder(null)).toBe("[????]");
    });

    it("should return custom placeholder for null", () => {
      expect(formatPageOrPlaceholder(null, "N/A")).toBe("N/A");
      expect(formatPageOrPlaceholder(null, "unknown")).toBe("unknown");
    });

    it("should allow custom padding length with placeholder", () => {
      expect(formatPageOrPlaceholder(5, "[??]", 2)).toBe("[05]");
    });
  });

  describe("estimatePageFromLocation", () => {
    it("should estimate page 1 for location 1-16", () => {
      expect(estimatePageFromLocation(1)).toBe(1);
      expect(estimatePageFromLocation(16)).toBe(1);
    });

    it("should estimate page 2 for location 17-32", () => {
      expect(estimatePageFromLocation(17)).toBe(2);
      expect(estimatePageFromLocation(32)).toBe(2);
    });

    it("should estimate page correctly for larger locations", () => {
      expect(estimatePageFromLocation(160)).toBe(10);
      expect(estimatePageFromLocation(1600)).toBe(100);
      expect(estimatePageFromLocation(5000)).toBe(313); // ceil(5000/16) = 313
    });

    it("should return 1 for location 0 or negative", () => {
      expect(estimatePageFromLocation(0)).toBe(1);
      expect(estimatePageFromLocation(-10)).toBe(1);
    });

    it("should use ceiling for fractional results", () => {
      expect(estimatePageFromLocation(100)).toBe(7); // ceil(100/16) = 7
    });
  });

  describe("getEffectivePage", () => {
    const location = { start: 160, end: null, raw: "160" };

    it("should return actual page when available", () => {
      expect(getEffectivePage(42, location)).toBe(42);
      expect(getEffectivePage(1, location)).toBe(1);
    });

    it("should estimate from location when page is null", () => {
      expect(getEffectivePage(null, location)).toBe(10); // 160/16 = 10
    });

    it("should estimate correctly for different locations", () => {
      expect(getEffectivePage(null, { start: 1, end: null, raw: "1" })).toBe(1);
      expect(getEffectivePage(null, { start: 100, end: null, raw: "100" })).toBe(7);
      expect(getEffectivePage(null, { start: 1000, end: null, raw: "1000" })).toBe(63);
    });
  });

  describe("getPageInfo", () => {
    const location = { start: 160, end: null, raw: "160" };

    it("should return correct info for actual page", () => {
      const info = getPageInfo(42, location);

      expect(info.page).toBe(42);
      expect(info.isEstimated).toBe(false);
      expect(info.formatted).toBe("[0042]");
      expect(info.paddedNumber).toBe("0042");
    });

    it("should return correct info for estimated page with prefix", () => {
      const info = getPageInfo(null, location);

      expect(info.page).toBe(10);
      expect(info.isEstimated).toBe(true);
      expect(info.formatted).toBe("~[0010]");
      expect(info.paddedNumber).toBe("~0010");
    });

    it("should return estimated page without prefix when disabled", () => {
      const info = getPageInfo(null, location, false);

      expect(info.page).toBe(10);
      expect(info.isEstimated).toBe(true);
      expect(info.formatted).toBe("[0010]");
      expect(info.paddedNumber).toBe("0010");
    });

    it("should not show prefix for actual page even when enabled", () => {
      const info = getPageInfo(42, location, true);

      expect(info.isEstimated).toBe(false);
      expect(info.formatted).toBe("[0042]");
      expect(info.paddedNumber).toBe("0042");
    });

    it("should handle single-digit pages", () => {
      const info = getPageInfo(5, { start: 50, end: null, raw: "50" });

      expect(info.formatted).toBe("[0005]");
    });

    it("should handle large page numbers", () => {
      const info = getPageInfo(12345, { start: 160, end: null, raw: "160" });

      expect(info.formatted).toBe("[12345]");
    });
  });
});
