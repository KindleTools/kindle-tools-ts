/**
 * Tests for the processor module.
 *
 * Tests deduplication, tag merging, note linking, and quality flags.
 */

import { describe, expect, it } from "vitest";
import {
  filterToHighlightsOnly,
  linkNotesToHighlights,
  process,
  removeDuplicates,
  smartMergeHighlights,
} from "../../src/core/processor.js";
import type { Clipping } from "../../src/types/clipping.js";

/**
 * Create a minimal clipping for testing.
 */
function createClipping(overrides: Partial<Clipping> = {}): Clipping {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    title: "Test Book",
    titleRaw: "Test Book (Author)",
    author: "Author",
    authorRaw: "Test Book (Author)",
    content: "Test content",
    contentRaw: "Test content",
    type: "highlight",
    page: 1,
    location: { raw: "100-110", start: 100, end: 110 },
    date: new Date("2024-01-01"),
    dateRaw: "January 1, 2024",
    isEmpty: false,
    isLimitReached: false,
    language: "en",
    source: "kindle",
    wordCount: 2,
    charCount: 12,
    blockIndex: 0,
    ...overrides,
  };
}

describe("processor", () => {
  describe("removeDuplicates", () => {
    it("should remove exact duplicates", () => {
      const clippings = [
        createClipping({ title: "Book A", location: { raw: "100", start: 100, end: null } }),
        createClipping({ title: "Book A", location: { raw: "100", start: 100, end: null } }),
        createClipping({ title: "Book B", location: { raw: "200", start: 200, end: null } }),
      ];

      const result = removeDuplicates(clippings);

      expect(result.clippings.length).toBe(2);
      expect(result.removedCount).toBe(1);
    });

    it("should merge tags when removing duplicates", () => {
      const clippings = [
        createClipping({
          title: "Book A",
          content: "Same content",
          location: { raw: "100", start: 100, end: null },
          tags: ["tag1", "tag2"],
        }),
        createClipping({
          title: "Book A",
          content: "Same content",
          location: { raw: "100", start: 100, end: null },
          tags: ["tag2", "tag3"],
        }),
      ];

      const result = removeDuplicates(clippings);

      expect(result.clippings.length).toBe(1);
      expect(result.clippings[0]?.tags).toContain("tag1");
      expect(result.clippings[0]?.tags).toContain("tag2");
      expect(result.clippings[0]?.tags).toContain("tag3");
      expect(result.clippings[0]?.tags?.length).toBe(3);
    });

    it("should preserve tags when only one clipping has them", () => {
      const clippings = [
        createClipping({
          title: "Book A",
          content: "Same content",
          location: { raw: "100", start: 100, end: null },
          tags: ["important"],
        }),
        createClipping({
          title: "Book A",
          content: "Same content",
          location: { raw: "100", start: 100, end: null },
        }),
      ];

      const result = removeDuplicates(clippings);

      expect(result.clippings.length).toBe(1);
      expect(result.clippings[0]?.tags).toEqual(["important"]);
    });
  });

  describe("smartMergeHighlights", () => {
    it("should merge overlapping highlights", () => {
      const clippings = [
        createClipping({
          title: "Book A",
          content: "This is the beginning",
          location: { raw: "100-110", start: 100, end: 110 },
        }),
        createClipping({
          title: "Book A",
          content: "This is the beginning of a longer sentence",
          location: { raw: "100-120", start: 100, end: 120 },
        }),
      ];

      const result = smartMergeHighlights(clippings);

      expect(result.clippings.length).toBe(1);
      expect(result.mergedCount).toBe(1);
      // Should keep the longer content
      expect(result.clippings[0]?.content).toContain("longer sentence");
    });

    it("should merge tags when merging highlights", () => {
      const clippings = [
        createClipping({
          title: "Book A",
          content: "Short content",
          location: { raw: "100-110", start: 100, end: 110 },
          tags: ["tag1"],
        }),
        createClipping({
          title: "Book A",
          content: "Short content extended with more text",
          location: { raw: "100-130", start: 100, end: 130 },
          tags: ["tag2"],
        }),
      ];

      const result = smartMergeHighlights(clippings);

      expect(result.clippings.length).toBe(1);
      expect(result.clippings[0]?.tags).toContain("tag1");
      expect(result.clippings[0]?.tags).toContain("tag2");
    });

    it("should not merge non-overlapping highlights", () => {
      const clippings = [
        createClipping({
          title: "Book A",
          content: "First highlight",
          location: { raw: "100-110", start: 100, end: 110 },
        }),
        createClipping({
          title: "Book A",
          content: "Second highlight far away",
          location: { raw: "500-510", start: 500, end: 510 },
        }),
      ];

      const result = smartMergeHighlights(clippings);

      expect(result.clippings.length).toBe(2);
      expect(result.mergedCount).toBe(0);
    });
  });

  describe("linkNotesToHighlights", () => {
    it("should link note within highlight range (range coverage)", () => {
      const highlight = createClipping({
        id: "highlight-1",
        title: "Book A",
        content: "A long highlight spanning many locations",
        location: { raw: "100-200", start: 100, end: 200 },
        type: "highlight",
      });

      const note = createClipping({
        id: "note-1",
        title: "Book A",
        content: "My note about this",
        location: { raw: "150", start: 150, end: null },
        type: "note",
      });

      const result = linkNotesToHighlights([highlight, note]);

      expect(result.linkedCount).toBe(1);
      const linkedHighlight = result.clippings.find((c) => c.id === "highlight-1");
      expect(linkedHighlight?.linkedNoteId).toBe("note-1");
      expect(linkedHighlight?.note).toBe("My note about this");
    });

    it("should link note at the end of a long highlight (range coverage edge case)", () => {
      const highlight = createClipping({
        id: "highlight-1",
        title: "Book A",
        content: "A very long highlight",
        location: { raw: "100-500", start: 100, end: 500 },
        type: "highlight",
      });

      // Note at location 490, which is at the end of the highlight
      // With old proximity algorithm (distance 10), this would NOT match
      // With range coverage, it SHOULD match because 490 is within [100, 500]
      const note = createClipping({
        id: "note-1",
        title: "Book A",
        content: "Note at the end",
        location: { raw: "490", start: 490, end: null },
        type: "note",
      });

      const result = linkNotesToHighlights([highlight, note]);

      expect(result.linkedCount).toBe(1);
      const linkedHighlight = result.clippings.find((c) => c.id === "highlight-1");
      expect(linkedHighlight?.linkedNoteId).toBe("note-1");
    });

    it("should fallback to proximity when note is outside all ranges", () => {
      const highlight = createClipping({
        id: "highlight-1",
        title: "Book A",
        content: "A highlight",
        location: { raw: "100-110", start: 100, end: 110 },
        type: "highlight",
      });

      // Note at location 95, outside range [100, 110] but within proximity of start (|100-95| = 5 < 10)
      const note = createClipping({
        id: "note-1",
        title: "Book A",
        content: "Nearby note before highlight",
        location: { raw: "95", start: 95, end: null },
        type: "note",
      });

      const result = linkNotesToHighlights([highlight, note]);

      expect(result.linkedCount).toBe(1);
    });

    it("should not link notes from different books", () => {
      const highlight = createClipping({
        id: "highlight-1",
        title: "Book A",
        location: { raw: "100-110", start: 100, end: 110 },
        type: "highlight",
      });

      const note = createClipping({
        id: "note-1",
        title: "Book B",
        location: { raw: "105", start: 105, end: null },
        type: "note",
      });

      const result = linkNotesToHighlights([highlight, note]);

      expect(result.linkedCount).toBe(0);
    });

    it("should prefer the most specific highlight when multiple contain the note", () => {
      // Two overlapping highlights
      const broadHighlight = createClipping({
        id: "broad",
        title: "Book A",
        content: "A very long highlight",
        location: { raw: "100-500", start: 100, end: 500 },
        type: "highlight",
      });

      const narrowHighlight = createClipping({
        id: "narrow",
        title: "Book A",
        content: "A shorter highlight",
        location: { raw: "180-220", start: 180, end: 220 },
        type: "highlight",
      });

      // Note at 200, which is within both ranges
      const note = createClipping({
        id: "note-1",
        title: "Book A",
        content: "Which highlight am I for?",
        location: { raw: "200", start: 200, end: null },
        type: "note",
      });

      const result = linkNotesToHighlights([broadHighlight, narrowHighlight, note]);

      expect(result.linkedCount).toBe(1);
      // Should prefer the narrow highlight (start 180 is closer to 200 than start 100)
      const linkedNote = result.clippings.find((c) => c.id === "note-1");
      expect(linkedNote?.linkedHighlightId).toBe("narrow");
    });
  });

  describe("filterToHighlightsOnly", () => {
    it("should filter out notes and bookmarks, keeping only highlights", () => {
      const clippings = [
        createClipping({
          id: "highlight-1",
          type: "highlight",
          content: "Important highlight",
        }),
        createClipping({
          id: "note-1",
          type: "note",
          content: "A note",
        }),
        createClipping({
          id: "bookmark-1",
          type: "bookmark",
          content: "",
        }),
        createClipping({
          id: "highlight-2",
          type: "highlight",
          content: "Another highlight",
        }),
      ];

      const result = filterToHighlightsOnly(clippings);

      expect(result.clippings.length).toBe(2);
      expect(result.filteredCount).toBe(2);
      expect(result.clippings.every((c) => c.type === "highlight")).toBe(true);
    });

    it("should preserve embedded notes on highlights", () => {
      const clippings = [
        createClipping({
          id: "highlight-1",
          type: "highlight",
          content: "Important highlight",
          note: "My thoughts on this",
          linkedNoteId: "note-1",
        }),
        createClipping({
          id: "note-1",
          type: "note",
          content: "My thoughts on this",
          linkedHighlightId: "highlight-1",
        }),
      ];

      const result = filterToHighlightsOnly(clippings);

      expect(result.clippings.length).toBe(1);
      expect(result.clippings[0]?.note).toBe("My thoughts on this");
      expect(result.clippings[0]?.linkedNoteId).toBe("note-1");
    });

    it("should return empty array when no highlights exist", () => {
      const clippings = [
        createClipping({ type: "note", content: "A note" }),
        createClipping({ type: "bookmark", content: "" }),
      ];

      const result = filterToHighlightsOnly(clippings);

      expect(result.clippings.length).toBe(0);
      expect(result.filteredCount).toBe(2);
    });
  });

  describe("process (full pipeline)", () => {
    it("should run all processing steps", () => {
      const clippings = [
        createClipping({
          title: "Book A",
          content: "Some content",
          location: { raw: "100-110", start: 100, end: 110 },
        }),
        createClipping({
          title: "Book A",
          content: "Very short",
          location: { raw: "200-210", start: 200, end: 210 },
        }),
      ];

      const result = process(clippings, { detectedLanguage: "en" });

      expect(result.clippings.length).toBe(2);
      expect(result.duplicatesRemoved).toBe(0);
    });

    it("should preserve tags through the full pipeline", () => {
      const clippings = [
        createClipping({
          title: "Book A",
          content: "Same content here",
          location: { raw: "100", start: 100, end: null },
          tags: ["philosophy", "important"],
        }),
        createClipping({
          title: "Book A",
          content: "Same content here",
          location: { raw: "100", start: 100, end: null },
          tags: ["to-review"],
        }),
      ];

      const result = process(clippings, {
        removeDuplicates: true,
        detectedLanguage: "en",
      });

      expect(result.clippings.length).toBe(1);
      expect(result.clippings[0]?.tags).toContain("philosophy");
      expect(result.clippings[0]?.tags).toContain("important");
      expect(result.clippings[0]?.tags).toContain("to-review");
    });

    it("should filter to highlights only when highlightsOnly is enabled", () => {
      const clippings = [
        createClipping({
          id: "highlight-1",
          title: "Book A",
          type: "highlight",
          content: "A highlight",
          location: { raw: "100-110", start: 100, end: 110 },
        }),
        createClipping({
          id: "note-1",
          title: "Book A",
          type: "note",
          content: "A note linked to highlight",
          location: { raw: "105", start: 105, end: null },
        }),
        createClipping({
          id: "bookmark-1",
          title: "Book A",
          type: "bookmark",
          content: "",
          location: { raw: "200", start: 200, end: null },
        }),
      ];

      const result = process(clippings, {
        detectedLanguage: "en",
        highlightsOnly: true,
      });

      expect(result.clippings.length).toBe(1);
      expect(result.clippings[0]?.type).toBe("highlight");
      expect(result.clippings[0]?.note).toBe("A note linked to highlight");
      expect(result.filteredForHighlightsOnly).toBe(2);
    });

    it("should return all types when highlightsOnly is disabled", () => {
      const clippings = [
        createClipping({
          id: "highlight-1",
          type: "highlight",
          content: "A highlight",
        }),
        createClipping({
          id: "note-1",
          type: "note",
          content: "A note",
        }),
        createClipping({
          id: "bookmark-1",
          type: "bookmark",
          content: "",
        }),
      ];

      const result = process(clippings, {
        detectedLanguage: "en",
        highlightsOnly: false,
      });

      expect(result.clippings.length).toBe(3);
      expect(result.filteredForHighlightsOnly).toBe(0);
    });
  });
});
