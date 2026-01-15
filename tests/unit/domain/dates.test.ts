/**
 * Tests for date utilities.
 */

import { describe, expect, it } from "vitest";
import { parseKindleDate, parseKindleDateAuto } from "#domain/parsing/dates.js";
import { formatDateHuman, formatDateISO } from "#utils/system/dates.js";

describe("date utilities", () => {
  describe("parseKindleDate", () => {
    it("should parse English dates (long format)", async () => {
      const input = "Friday, January 1, 2024 10:30:45 AM";
      const result = await parseKindleDate(input, "en");

      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getDate()).toBe(1);
      expect(result?.getHours()).toBe(10);
      expect(result?.getMinutes()).toBe(30);
      expect(result?.getSeconds()).toBe(45);
    });

    it("should parse Spanish dates", async () => {
      const input = "viernes, 1 de enero de 2024 10:30:45";
      const result = await parseKindleDate(input, "es");

      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(1);
    });

    it("should return null for invalid language", async () => {
      // @ts-expect-error Testing invalid language
      const result = await parseKindleDate("Some date", "invalid");
      expect(result).toBeNull();
    });

    it("should return null for unparseable date", async () => {
      const result = await parseKindleDate("Not a date", "en");
      expect(result).toBeNull();
    });
  });

  describe("parseKindleDateAuto", () => {
    it("should detect English automatically", async () => {
      const input = "Friday, January 1, 2024 10:30:45 AM";
      const result = await parseKindleDateAuto(input);

      expect(result.detectedLanguage).toBe("en");
      expect(result.date).not.toBeNull();
    });

    it("should detect Spanish automatically", async () => {
      const input = "viernes, 1 de enero de 2024 10:30:45";
      const result = await parseKindleDateAuto(input);

      expect(result.detectedLanguage).toBe("es");
      expect(result.date).not.toBeNull();
    });

    it("should return nulls for unknown format", async () => {
      const result = await parseKindleDateAuto("gibberish");

      expect(result.date).toBeNull();
      expect(result.detectedLanguage).toBeNull();
    });
  });

  describe("formatting", () => {
    const testDate = new Date("2024-01-01T10:30:45");

    it("formatDateISO should return YYYY-MM-DD", () => {
      expect(formatDateISO(testDate)).toBe("2024-01-01");
    });

    it("formatDateHuman should return readable string", () => {
      // Note: hours might vary if timezone is not handled, but we expect strict formatting
      // formatDateHuman implementation uses getFullYear/etc which use local time.
      // We should be careful about timezone in tests.
      // However, the implementation is naive.
      const formatted = formatDateHuman(testDate);
      expect(formatted).toMatch(/2024-01-01 \d{2}:30:45/);
    });
  });
});
