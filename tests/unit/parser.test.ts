/**
 * Tests for the parser module.
 */

import { parse, parseString } from "@importers/txt/core/parser.js";
import { describe, expect, it } from "vitest";
import { SAMPLE_CLIPPINGS_EN, SAMPLE_CLIPPINGS_ES } from "../fixtures/sample-clippings.js";

describe("parser", () => {
  describe("parseString", () => {
    it("should parse English clippings", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);

      expect(result.clippings.length).toBe(5);
    });

    it("should detect language automatically", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);

      // Should detect as English
      expect(result.clippings[0]?.language).toBe("en");
    });

    it("should extract title and author correctly", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);
      const firstClipping = result.clippings[0];

      expect(firstClipping?.title).toBe("The Great Gatsby");
      expect(firstClipping?.author).toBe("F. Scott Fitzgerald");
    });

    it("should extract page and location", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);
      const firstClipping = result.clippings[0];

      expect(firstClipping?.page).toBe(5);
      expect(firstClipping?.location.start).toBe(100);
      expect(firstClipping?.location.end).toBe(105);
    });

    it("should identify clipping types correctly", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);

      expect(result.clippings[0]?.type).toBe("highlight");
      expect(result.clippings[1]?.type).toBe("note");
      expect(result.clippings[3]?.type).toBe("bookmark");
    });

    it("should extract content correctly", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);
      const firstClipping = result.clippings[0];

      expect(firstClipping?.content).toContain("In my younger and more vulnerable years");
    });

    it("should mark bookmarks as empty", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);
      const bookmark = result.clippings.find((c) => c.type === "bookmark");

      expect(bookmark?.isEmpty).toBe(true);
    });

    it("should generate deterministic IDs", () => {
      const result1 = parseString(SAMPLE_CLIPPINGS_EN);
      const result2 = parseString(SAMPLE_CLIPPINGS_EN);

      // Same input = same IDs
      expect(result1.clippings[0]?.id).toBe(result2.clippings[0]?.id);
    });

    it("should count words correctly", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);
      const firstClipping = result.clippings[0];

      expect(firstClipping?.wordCount).toBeGreaterThan(0);
      expect(firstClipping?.charCount).toBeGreaterThan(0);
    });

    it("should include blockIndex for ordering", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);

      expect(result.clippings[0]?.blockIndex).toBe(0);
      expect(result.clippings[1]?.blockIndex).toBe(1);
      expect(result.clippings[2]?.blockIndex).toBe(2);
    });

    it("should include stats in result", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN);

      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBe(5);
      expect(result.stats.totalHighlights).toBe(3);
      expect(result.stats.totalNotes).toBe(1);
      expect(result.stats.totalBookmarks).toBe(1);
    });
  });

  describe("parse (alias)", () => {
    it("should work identically to parseString", () => {
      const result1 = parseString(SAMPLE_CLIPPINGS_EN);
      const result2 = parse(SAMPLE_CLIPPINGS_EN);

      expect(result1.clippings.length).toBe(result2.clippings.length);
    });
  });

  describe("Spanish clippings", () => {
    it("should parse Spanish clippings", () => {
      const result = parseString(SAMPLE_CLIPPINGS_ES);

      expect(result.clippings.length).toBe(2);
    });

    it("should detect Spanish language", () => {
      const result = parseString(SAMPLE_CLIPPINGS_ES);

      expect(result.clippings[0]?.language).toBe("es");
    });

    it("should extract Spanish metadata correctly", () => {
      const result = parseString(SAMPLE_CLIPPINGS_ES);
      const firstClipping = result.clippings[0];

      expect(firstClipping?.title).toBe("Don Quijote de la Mancha");
      expect(firstClipping?.author).toBe("Miguel de Cervantes");
      expect(firstClipping?.type).toBe("highlight");
      expect(firstClipping?.page).toBe(10);
    });
  });

  describe("options", () => {
    it("should use specified language instead of auto-detecting", () => {
      const result = parseString(SAMPLE_CLIPPINGS_EN, { language: "en" });

      expect(result.clippings[0]?.language).toBe("en");
    });
  });

  describe("edge cases", () => {
    it("should handle empty content", () => {
      const result = parseString("");

      expect(result.clippings.length).toBe(0);
    });

    it("should handle malformed blocks gracefully", () => {
      const malformed = `Incomplete block
==========
Just one line
==========`;

      const result = parseString(malformed);

      // Should not crash, may have warnings
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle varying line endings", () => {
      const withCrlf = SAMPLE_CLIPPINGS_EN.replace(/\n/g, "\r\n");
      const result = parseString(withCrlf);

      expect(result.clippings.length).toBe(5);
    });

    it("should handle BOM", () => {
      const withBom = `\uFEFF${SAMPLE_CLIPPINGS_EN}`;
      const result = parseString(withBom);

      expect(result.clippings.length).toBe(5);
    });

    it("should handle extra whitespace in blocks", () => {
      const withExtraSpace = `The Great Gatsby (F. Scott Fitzgerald)
- Your Highlight on page 5 | Location 100-105 | Added on Friday, January 1, 2024 10:30:45 AM

   Some content with leading spaces   
==========`;

      const result = parseString(withExtraSpace);

      expect(result.clippings[0]?.content).toBe("Some content with leading spaces");
    });

    it("should detect sideloaded books", () => {
      const sideloaded = `My Book.pdf (Unknown)
- Your Highlight on page 5 | Location 100-105 | Added on Friday, January 1, 2024 10:30:45 AM

Content from sideloaded book
==========`;

      const result = parseString(sideloaded);

      expect(result.clippings[0]?.source).toBe("sideload");
    });

    it("should detect DRM limit messages", () => {
      const drmLimited = `Protected Book (Author)
- Your Highlight on page 5 | Location 100-105 | Added on Friday, January 1, 2024 10:30:45 AM

You have reached the clipping limit for this item
==========`;

      const result = parseString(drmLimited);

      expect(result.clippings[0]?.isLimitReached).toBe(true);
    });
  });
});
