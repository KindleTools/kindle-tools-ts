/**
 * Tests for the similarity module.
 */

import { describe, expect, it } from "vitest";
import { compareTexts, isSubset, jaccardSimilarity } from "#utils/text/similarity.js";

describe("similarity", () => {
  describe("jaccardSimilarity", () => {
    it("should return 1 for identical texts", () => {
      expect(jaccardSimilarity("hello world", "hello world")).toBe(1);
    });

    it("should return 0 for completely different texts", () => {
      expect(jaccardSimilarity("hello world", "foo bar baz")).toBe(0);
    });

    it("should return 0 for empty texts", () => {
      expect(jaccardSimilarity("", "hello")).toBe(0);
      expect(jaccardSimilarity("hello", "")).toBe(0);
    });

    it("should return 0 for both empty texts", () => {
      // Empty texts have no words to compare
      expect(jaccardSimilarity("", "")).toBe(0);
    });

    it("should calculate correct similarity for partial overlap", () => {
      // "hello world" and "hello there" share "hello" (1/3 = 0.333)
      const similarity = jaccardSimilarity("hello world", "hello there");
      expect(similarity).toBeCloseTo(0.333, 2);
    });

    it("should be case-insensitive", () => {
      expect(jaccardSimilarity("Hello World", "hello world")).toBe(1);
    });

    it("should ignore punctuation", () => {
      expect(jaccardSimilarity("Hello, world!", "Hello world")).toBe(1);
    });

    it("should handle similar texts with minor differences", () => {
      const similarity = jaccardSimilarity(
        "The quick brown fox jumps over the lazy dog",
        "The quick brown fox jumped over a lazy dog",
      );
      // Most words are shared, expect high similarity
      expect(similarity).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe("compareTexts", () => {
    it("should detect possible duplicates above threshold", () => {
      const result = compareTexts(
        "This is a test sentence with many words",
        "This is a test sentence with some words",
        0.7,
      );
      expect(result.isPossibleDuplicate).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
    });

    it("should not flag different texts as duplicates", () => {
      const result = compareTexts(
        "Completely different content here",
        "Nothing similar at all",
        0.8,
      );
      expect(result.isPossibleDuplicate).toBe(false);
      expect(result.score).toBeLessThan(0.8);
    });
  });

  describe("isSubset", () => {
    it("should detect substring inclusion", () => {
      expect(isSubset("hello", "hello world")).toBe(true);
    });

    it("should detect word-based subset", () => {
      expect(isSubset("quick brown fox", "The quick brown fox jumps")).toBe(true);
    });

    it("should return false for non-subsets", () => {
      expect(isSubset("completely different", "hello world")).toBe(false);
    });

    it("should handle empty strings", () => {
      expect(isSubset("", "hello")).toBe(true);
      expect(isSubset("hello", "")).toBe(false);
    });
  });
});
