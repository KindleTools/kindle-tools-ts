import { describe, expect, it } from "vitest";
import type { Clipping } from "#app-types/clipping.js";
import { smartMergeHighlights } from "#core/processing/merger.js";

// Helper to create a minimal clipping
function createClipping(overrides: Partial<Clipping> = {}): Clipping {
  return {
    id: "1",
    title: "Book A",
    author: "Author A",
    content: "Content",
    type: "highlight",
    date: new Date(),
    location: { start: 1, end: 1, raw: "1" },
    page: 1,
    ...overrides,
  } as Clipping;
}

describe("Merger", () => {
  describe("smartMergeHighlights", () => {
    it("should not merge highlights from different books", () => {
      const c1 = createClipping({
        title: "Book A",
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Content A",
      });
      const c2 = createClipping({
        title: "Book B",
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Content A", // Same content
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.mergedCount).toBe(0);
      expect(result.clippings).toHaveLength(2);
    });

    it("should not merge highlights with distant locations", () => {
      const c1 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
      });
      const c2 = createClipping({
        location: { start: 200, end: 210, raw: "200-210" },
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.mergedCount).toBe(0);
      expect(result.clippings).toHaveLength(2);
    });

    it("should merge highlights when one contains the other (A contains B)", () => {
      const c1 = createClipping({
        location: { start: 100, end: 120, raw: "100-120" },
        content: "This is a longer content string",
      });
      const c2 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "This is a longer",
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.mergedCount).toBe(1);
      expect(result.clippings).toHaveLength(1);
      expect(result.clippings[0].content).toBe("This is a longer content string");
    });

    it("should merge highlights when one contains the other (B contains A)", () => {
      const c1 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "This is a longer",
      });
      const c2 = createClipping({
        location: { start: 100, end: 120, raw: "100-120" },
        content: "This is a longer content string",
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.mergedCount).toBe(1);
      expect(result.clippings).toHaveLength(1);
      expect(result.clippings[0].content).toBe("This is a longer content string");
    });

    it("should merge highlights with significant word overlap", () => {
      const c1 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Common words overlap significantly here",
      });
      const c2 = createClipping({
        location: { start: 105, end: 115, raw: "105-115" },
        content: "overlap significantly here and more",
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.mergedCount).toBe(1);
      expect(result.clippings).toHaveLength(1);
      // It should keep the longer one
      expect(result.clippings[0].content.length).toBeGreaterThan(0);
    });

    it("should NOT merge highlights with insufficient word overlap", () => {
      const c1 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Apple Banana Cherry Date",
      });
      const c2 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" }, // locations overlap
        content: "Elderberry Fig Grape Honeydew", // different words
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.mergedCount).toBe(0);
      expect(result.clippings).toHaveLength(2);
    });

    it("should merge tags from both clippings", () => {
      const c1 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Content",
        tags: ["tag1"],
      });
      const c2 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Content",
        tags: ["tag2"],
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.clippings[0].tags).toEqual(expect.arrayContaining(["tag1", "tag2"]));
    });

    it("should preserve notes if present", () => {
      const c1 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Content",
        note: "Note 1",
      });
      const c2 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Content",
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.clippings[0].note).toBe("Note 1");
    });

    it("should keep the most recent date", () => {
      const d1 = new Date("2023-01-01");
      const d2 = new Date("2023-02-01");
      const c1 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Content",
        date: d1,
      });
      const c2 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Content",
        date: d2,
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.clippings[0].date).toEqual(d2);
    });

    it("should handle null end location fallback", () => {
      const c1 = createClipping({
        location: { start: 100, end: null, raw: "100" },
        content: "Content start",
      });
      const c2 = createClipping({
        location: { start: 100, end: 105, raw: "100-105" },
        content: "Content start extended",
      });

      const result = smartMergeHighlights([c1, c2]);
      expect(result.mergedCount).toBe(1);
      expect(result.clippings[0].location.end).toBe(105);
    });

    it("should flag overlaps instead of merging when merge=false", () => {
      const c1 = createClipping({
        location: { start: 100, end: 120, raw: "100-120" },
        content: "Longer content version",
      });
      const c2 = createClipping({
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Longer content",
      });

      const result = smartMergeHighlights([c1, c2], false);
      expect(result.mergedCount).toBe(0);
      expect(result.clippings).toHaveLength(2);

      // Find the one that was flagged
      const flagged = result.clippings.find((c) => c.isSuspiciousHighlight);
      expect(flagged).toBeDefined();
      expect(flagged?.suspiciousReason).toBe("overlapping");
      expect(flagged?.id).toBe(c2.id); // The shorter one should be flagged
      expect(flagged?.possibleDuplicateOf).toBe(c1.id);
    });

    it("should correctly handle single clip in group", () => {
      const c1 = createClipping({ title: "Book A" });
      const result = smartMergeHighlights([c1]);
      expect(result.clippings).toHaveLength(1);
    });

    it("should ignore non-highlight clippings", () => {
      const c1 = createClipping({ type: "note" });
      const result = smartMergeHighlights([c1]);
      expect(result.clippings).toHaveLength(1);
    });
  });
});
