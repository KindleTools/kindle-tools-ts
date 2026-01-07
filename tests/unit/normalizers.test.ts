/**
 * Tests for the normalizers module.
 */

import { describe, expect, it } from "vitest";
import {
  normalizeText,
  normalizeUnicode,
  normalizeWhitespace,
  removeBOM,
  removeControlCharacters,
} from "#utils/text/normalizers.js";

describe("normalizers", () => {
  describe("normalizeUnicode", () => {
    it("should normalize composed and decomposed characters", () => {
      // "café" with é as single char vs e + combining accent
      const composed = "caf\u00E9"; // é as single character
      const decomposed = "cafe\u0301"; // e + combining acute accent

      expect(normalizeUnicode(composed)).toBe(normalizeUnicode(decomposed));
    });

    it("should handle normal ASCII text", () => {
      const text = "Hello World";
      expect(normalizeUnicode(text)).toBe(text);
    });
  });

  describe("removeBOM", () => {
    it("should remove BOM from start of string", () => {
      const withBOM = "\uFEFFHello";
      expect(removeBOM(withBOM)).toBe("Hello");
    });

    it("should leave string unchanged if no BOM", () => {
      const noBOM = "Hello";
      expect(removeBOM(noBOM)).toBe("Hello");
    });

    it("should only remove BOM from start, not middle", () => {
      const bomInMiddle = "Hello\uFEFFWorld";
      // BOM pattern only matches at start
      expect(removeBOM(bomInMiddle)).toBe("Hello\uFEFFWorld");
    });
  });

  describe("normalizeWhitespace", () => {
    it("should collapse multiple spaces", () => {
      expect(normalizeWhitespace("hello    world")).toBe("hello world");
    });

    it("should trim leading and trailing whitespace", () => {
      expect(normalizeWhitespace("  hello  ")).toBe("hello");
    });

    it("should convert non-breaking spaces to regular spaces", () => {
      expect(normalizeWhitespace("hello\u00A0world")).toBe("hello world");
    });
  });

  describe("removeControlCharacters", () => {
    it("should remove control characters", () => {
      const withControl = "Hello\x00World\x1F";
      expect(removeControlCharacters(withControl)).toBe("HelloWorld");
    });

    it("should remove zero-width characters", () => {
      const withZeroWidth = "Hello\u200BWorld\uFEFF";
      expect(removeControlCharacters(withZeroWidth)).toBe("HelloWorld");
    });

    it("should preserve normal text", () => {
      const normal = "Hello World 123 !@#";
      expect(removeControlCharacters(normal)).toBe(normal);
    });
  });

  describe("normalizeText", () => {
    it("should apply all normalizations", () => {
      const messy = "\uFEFF  Hello\x00   World\u00A0 \u200B ";
      const clean = normalizeText(messy);

      expect(clean).toBe("Hello World");
    });

    it("should handle already clean text", () => {
      const clean = "Hello World";
      expect(normalizeText(clean)).toBe(clean);
    });
  });
});
