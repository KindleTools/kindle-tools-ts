/**
 * Tests for the text-cleaner module.
 */

import { describe, expect, it } from "vitest";
import { cleanText, needsCleaning } from "#importers/formats/txt/text-cleaner.js";

describe("text-cleaner", () => {
  describe("cleanText", () => {
    it("should de-hyphenate PDF line breaks", () => {
      const result = cleanText("some-\nthing went wrong");
      expect(result.text).toBe("Something went wrong");
      expect(result.wasCleaned).toBe(true);
      expect(result.appliedOperations).toContain("dehyphenation");
    });

    it("should remove spaces before punctuation", () => {
      const result = cleanText("Hello , world .");
      expect(result.text).toBe("Hello, world.");
      expect(result.wasCleaned).toBe(true);
      expect(result.appliedOperations).toContain("space_before_punctuation");
    });

    it("should collapse multiple spaces", () => {
      const result = cleanText("Hello    world");
      expect(result.text).toBe("Hello world");
      expect(result.wasCleaned).toBe(true);
      expect(result.appliedOperations).toContain("multiple_spaces");
    });

    it("should not modify already clean text", () => {
      const result = cleanText("This is clean text.");
      expect(result.text).toBe("This is clean text.");
      expect(result.wasCleaned).toBe(false);
      expect(result.appliedOperations).toHaveLength(0);
    });

    it("should handle complex PDF artifacts", () => {
      const result = cleanText("The impor-\ntant thing is to under-\nstand the concept .");
      expect(result.text).toBe("The important thing is to understand the concept.");
      expect(result.wasCleaned).toBe(true);
    });

    it("should not capitalize text starting with ellipsis", () => {
      const result = cleanText("...continuation of previous sentence");
      expect(result.text).toBe("...continuation of previous sentence");
    });

    it("should handle international characters in de-hyphenation", () => {
      const result = cleanText("espa-\nñol");
      expect(result.text).toBe("Español");
    });
  });

  describe("needsCleaning", () => {
    it("should detect text with PDF hyphenation", () => {
      expect(needsCleaning("word-\nbreak")).toBe(true);
    });

    it("should detect text with space before punctuation", () => {
      expect(needsCleaning("hello ,")).toBe(true);
    });

    it("should detect text with multiple spaces", () => {
      expect(needsCleaning("hello  world")).toBe(true);
    });

    it("should return false for clean text", () => {
      expect(needsCleaning("This is clean text.")).toBe(false);
    });
  });
});
