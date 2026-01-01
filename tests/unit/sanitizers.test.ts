/**
 * Tests for the sanitizers module.
 */

import { describe, expect, it } from "vitest";
import {
  extractAuthor,
  isSideloaded,
  sanitizeContent,
  sanitizeTitle,
} from "../../src/utils/sanitizers.js";

describe("sanitizers", () => {
  describe("sanitizeTitle", () => {
    it("should remove .pdf extension", () => {
      expect(sanitizeTitle("My Book.pdf")).toBe("My Book");
    });

    it("should remove .epub extension", () => {
      expect(sanitizeTitle("My Book.epub")).toBe("My Book");
    });

    it("should remove .mobi extension", () => {
      expect(sanitizeTitle("My Book.mobi")).toBe("My Book");
    });

    it("should remove _EBOK suffix", () => {
      expect(sanitizeTitle("My Book_EBOK")).toBe("My Book");
    });

    it("should handle multiple extensions/suffixes", () => {
      // Extension is removed first, then _EBOK suffix
      expect(sanitizeTitle("My Book_EBOK.pdf")).toBe("My Book");
    });

    it("should trim whitespace", () => {
      expect(sanitizeTitle("  My Book  ")).toBe("My Book");
    });

    it("should preserve clean titles", () => {
      expect(sanitizeTitle("Clean Title")).toBe("Clean Title");
    });
  });

  describe("extractAuthor", () => {
    it("should extract author from simple format", () => {
      const result = extractAuthor("El Quijote (Miguel de Cervantes)");

      expect(result.title).toBe("El Quijote");
      expect(result.author).toBe("Miguel de Cervantes");
    });

    it("should handle author with comma", () => {
      const result = extractAuthor("Book Title (Smith, John)");

      expect(result.title).toBe("Book Title");
      expect(result.author).toBe("Smith, John");
    });

    it("should handle nested parentheses in author", () => {
      const result = extractAuthor("Book Title ((Editor) John Smith)");

      expect(result.title).toBe("Book Title");
      expect(result.author).toBe("(Editor) John Smith");
    });

    it("should return Unknown for title without author", () => {
      const result = extractAuthor("Book Without Author");

      expect(result.title).toBe("Book Without Author");
      expect(result.author).toBe("Unknown");
    });

    it("should clean extensions from title", () => {
      const result = extractAuthor("My Book.pdf (John Doe)");

      expect(result.title).toBe("My Book");
      expect(result.author).toBe("John Doe");
    });

    it("should handle empty author parentheses", () => {
      const result = extractAuthor("Book Title ()");

      expect(result.title).toBe("Book Title");
      expect(result.author).toBe("Unknown");
    });
  });

  describe("isSideloaded", () => {
    it("should detect .pdf as sideloaded", () => {
      expect(isSideloaded("book.pdf")).toBe(true);
    });

    it("should detect .epub as sideloaded", () => {
      expect(isSideloaded("book.epub")).toBe(true);
    });

    it("should detect _EBOK as sideloaded", () => {
      expect(isSideloaded("book_EBOK")).toBe(true);
    });

    it("should not detect clean title as sideloaded", () => {
      expect(isSideloaded("Clean Book Title")).toBe(false);
    });
  });

  describe("sanitizeContent", () => {
    it("should trim content", () => {
      const result = sanitizeContent("  Hello World  ");

      expect(result.content).toBe("Hello World");
      expect(result.isEmpty).toBe(false);
    });

    it("should detect empty content", () => {
      const result = sanitizeContent("   ");

      expect(result.content).toBe("");
      expect(result.isEmpty).toBe(true);
    });

    it("should detect DRM limit message (English)", () => {
      const result = sanitizeContent("You have reached the clipping limit for this item");

      expect(result.isLimitReached).toBe(true);
    });

    it("should detect DRM limit message (Spanish)", () => {
      const result = sanitizeContent("Has alcanzado el límite de recortes");

      expect(result.isLimitReached).toBe(true);
    });

    it("should not flag normal content as DRM limited", () => {
      const result = sanitizeContent("This is a normal highlight about clipping techniques.");

      expect(result.isLimitReached).toBe(false);
    });
  });
});
