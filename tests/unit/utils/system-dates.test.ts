import { describe, expect, it } from "vitest";
import { formatDateHuman, formatDateISO } from "#utils/system/dates.js";

describe("System Dates", () => {
  describe("formatDateISO", () => {
    it("should format valid date correctly", () => {
      const d = new Date("2023-01-01T12:00:00Z");
      expect(formatDateISO(d)).toBe("2023-01-01");
    });

    it("should throw for invalid date (toISOString throws)", () => {
      const d = new Date("invalid");
      expect(() => formatDateISO(d)).toThrow();
    });
  });

  describe("formatDateHuman", () => {
    it("should format valid date correctly", () => {
      const d = new Date("2023-01-01T15:30:45");
      // Note: getFullYear etc use local time.
      // So output depends on local timezone.
      // But we can check format structure or inject mocked date?
      // Or use regex.
      const result = formatDateHuman(d);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      // Verify components loosely
      expect(result).toContain("2023");
      expect(result).toContain("01"); // month or day
    });

    it("should handle invalid date gracefully", () => {
      const d = new Date("invalid");
      expect(formatDateHuman(d)).toBe("Invalid Date");
    });
  });
});
