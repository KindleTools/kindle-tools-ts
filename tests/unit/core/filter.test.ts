import { describe, expect, it } from "vitest";
import type { Clipping } from "#app-types/clipping.js";
import { filterClippings, filterToHighlightsOnly } from "#core/processing/filter.js";

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

describe("filter", () => {
  describe("filterClippings", () => {
    const clippings = [
      createClipping({ id: "1", type: "highlight", content: "Short" }),
      createClipping({ id: "2", type: "note", content: "A note" }),
      createClipping({ id: "3", type: "highlight", content: "A very long content string" }),
      createClipping({ id: "4", type: "highlight", title: "Excluded Book" }),
      createClipping({ id: "5", type: "highlight", title: "Included Book" }),
    ];

    it("should filter by excludeTypes", () => {
      const result = filterClippings(clippings, { excludeTypes: ["note"], detectedLanguage: "en" });
      expect(result.clippings.find((c) => c.type === "note")).toBeUndefined();
      expect(result.clippings.length).toBe(4);
    });

    it("should filter by minContentLength (excluding bookmarks)", () => {
      const result = filterClippings(clippings, { minContentLength: 10, detectedLanguage: "en" });
      // "Short" (5 chars) should be removed. "A very long..." should stay.
      expect(result.clippings.find((c) => c.content === "Short")).toBeUndefined();
      expect(
        result.clippings.find((c) => c.content === "A very long content string"),
      ).toBeDefined();
    });

    it("should not filter bookmarks by minContentLength", () => {
      const bookmark = createClipping({ type: "bookmark", content: "" });
      const result = filterClippings([bookmark], { minContentLength: 10, detectedLanguage: "en" });
      expect(result.clippings.length).toBe(1);
    });

    it("should filter by excludeBooks", () => {
      const result = filterClippings(clippings, {
        excludeBooks: ["Excluded"],
        detectedLanguage: "en",
      });
      expect(result.clippings.find((c) => c.title === "Excluded Book")).toBeUndefined();
      expect(result.clippings.find((c) => c.title === "Included Book")).toBeDefined();
    });

    it("should filter by onlyBooks", () => {
      const result = filterClippings(clippings, {
        onlyBooks: ["Included"],
        detectedLanguage: "en",
      });
      expect(result.clippings.length).toBe(1);
      expect(result.clippings[0].title).toBe("Included Book");
    });

    it("should return empty if onlyBooks matches nothing", () => {
      const result = filterClippings(clippings, {
        onlyBooks: ["Nonexistent"],
        detectedLanguage: "en",
      });
      expect(result.clippings.length).toBe(0);
    });

    it("should combine filters", () => {
      // Exclude note AND min length 10
      const result = filterClippings(clippings, {
        excludeTypes: ["note"],
        minContentLength: 10,
        detectedLanguage: "en",
      });
      expect(result.clippings.find((c) => c.type === "note")).toBeUndefined();
      expect(result.clippings.find((c) => c.content === "Short")).toBeUndefined();
    });
  });

  describe("filterToHighlightsOnly", () => {
    it("should filter out bookmarks and notes", () => {
      const clippings = [
        createClipping({ type: "highlight" }),
        createClipping({ type: "note" }),
        createClipping({ type: "bookmark" }),
      ];
      const result = filterToHighlightsOnly(clippings);
      expect(result.clippings.length).toBe(1);
      expect(result.clippings[0].type).toBe("highlight");
      expect(result.filteredCount).toBe(2);
    });
  });
});
