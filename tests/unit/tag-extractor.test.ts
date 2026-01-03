/**
 * Tests for the tag-extractor module.
 */

import { describe, expect, it } from "vitest";
import { extractTagsFromNote, looksLikeTagNote } from "../../src/utils/tag-extractor.js";

describe("tag-extractor", () => {
  describe("extractTagsFromNote", () => {
    it("should extract comma-separated tags", () => {
      const result = extractTagsFromNote("productivity, psychology, habits");
      expect(result.tags).toEqual(["productivity", "psychology", "habits"]);
      expect(result.hasTags).toBe(true);
      expect(result.isTagOnlyNote).toBe(true);
    });

    it("should extract semicolon-separated tags", () => {
      const result = extractTagsFromNote("business; self-help; motivation");
      expect(result.tags).toEqual(["business", "self-help", "motivation"]);
      expect(result.hasTags).toBe(true);
    });

    it("should extract newline-separated tags", () => {
      const result = extractTagsFromNote("tag1\ntag2\ntag3");
      expect(result.tags).toEqual(["tag1", "tag2", "tag3"]);
      expect(result.hasTags).toBe(true);
    });

    it("should extract period-separated tags", () => {
      const result = extractTagsFromNote("ESTRATEGIA. SABIDURÍA. FILOSOFÍA");
      expect(result.tags).toEqual(["estrategia", "sabiduría", "filosofía"]);
      expect(result.hasTags).toBe(true);
      expect(result.isTagOnlyNote).toBe(true);
    });

    it("should handle mixed separators", () => {
      const result = extractTagsFromNote("productivity, psychology; habits\nlearning");
      expect(result.tags).toEqual(["productivity", "psychology", "habits", "learning"]);
    });

    it("should remove hashtag prefix", () => {
      const result = extractTagsFromNote("#productivity, #habits");
      expect(result.tags).toEqual(["productivity", "habits"]);
    });

    it("should deduplicate tags (case-insensitive)", () => {
      const result = extractTagsFromNote("Productivity, PRODUCTIVITY, productivity");
      expect(result.tags).toEqual(["productivity"]);
    });

    it("should reject very short tags", () => {
      const result = extractTagsFromNote("a, ab, abc");
      // "a" is too short (< 2), "ab" is at minimum
      expect(result.tags).toEqual(["ab", "abc"]);
    });

    it("should reject sentence fragments", () => {
      const result = extractTagsFromNote("This is a sentence, tag1");
      // "This is a sentence" contains "is" and "a" - likely a sentence
      expect(result.tags).toEqual(["tag1"]);
    });

    it("should handle empty input", () => {
      const result = extractTagsFromNote("");
      expect(result.tags).toEqual([]);
      expect(result.hasTags).toBe(false);
      expect(result.isTagOnlyNote).toBe(false);
    });

    it("should handle whitespace-only input", () => {
      const result = extractTagsFromNote("   ");
      expect(result.tags).toEqual([]);
      expect(result.hasTags).toBe(false);
    });
  });

  describe("looksLikeTagNote", () => {
    it("should return true for short notes with separators", () => {
      expect(looksLikeTagNote("tag1, tag2, tag3")).toBe(true);
    });

    it("should return true for single short words", () => {
      expect(looksLikeTagNote("productivity")).toBe(true);
    });

    it("should return false for empty input", () => {
      expect(looksLikeTagNote("")).toBe(false);
    });

    it("should return false for long notes without separators", () => {
      // Long note without separators (periods are now separators, so avoid them here)
      const longNote =
        "This is a long note without any tag-like separators and it contains a full paragraph of text";
      expect(looksLikeTagNote(longNote)).toBe(false);
    });
  });
});
