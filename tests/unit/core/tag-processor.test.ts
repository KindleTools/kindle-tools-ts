import { describe, expect, it } from "vitest";
import type { Clipping } from "#app-types/clipping.js";
import { extractTagsFromLinkedNotes } from "#core/processing/tag-processor.js";

describe("tag-processor", () => {
  describe("extractTagsFromLinkedNotes", () => {
    const baseClipping = {
      id: "1",
      title: "Book 1",
      author: "Author 1",
      content: "Highlight content",
      type: "highlight",
      date: new Date(),
      location: { start: 1, end: 1, raw: "1" },
      page: 1,
    } as Clipping;

    it("should extract tags from linked notes for highlights", () => {
      const clippings: Clipping[] = [
        {
          ...baseClipping,
          id: "1",
          note: "tag1, tag2",
        },
        {
          ...baseClipping,
          id: "2",
          note: undefined, // No linked note
        },
      ];

      const result = extractTagsFromLinkedNotes(clippings);

      expect(result.extractedCount).toBe(1);
      expect(result.clippings[0].tags).toEqual(["TAG1", "TAG2"]);
      expect(result.clippings[1].tags).toBeUndefined();
    });

    it("should ignore non-highlight clippings", () => {
      const clippings: Clipping[] = [
        {
          ...baseClipping,
          id: "3",
          type: "note",
          note: "tag1, tag2",
        },
      ];

      const result = extractTagsFromLinkedNotes(clippings);
      expect(result.extractedCount).toBe(0);
      // Should remain unchanged
      expect(result.clippings[0].tags).toBeUndefined();
    });

    it("should respect tag case options", () => {
      const clippings: Clipping[] = [
        {
          ...baseClipping,
          note: "MyTag",
        },
      ];

      const result = extractTagsFromLinkedNotes(clippings, { tagCase: "lowercase" });
      expect(result.clippings[0].tags).toEqual(["mytag"]);
    });

    it("should not modify clippings if no tags found in note", () => {
      const clippings: Clipping[] = [
        {
          ...baseClipping,
          note: "Just a regular note without tags",
        },
      ];

      const result = extractTagsFromLinkedNotes(clippings);
      expect(result.extractedCount).toBe(0);
      expect(result.clippings[0].tags).toBeUndefined();
    });
  });
});
