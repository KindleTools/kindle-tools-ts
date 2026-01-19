import { describe, expect, it } from "vitest";
import { flagFuzzyDuplicates, flagSuspiciousHighlights } from "#core/processing/quality.js";

import { createClipping } from "../../fixtures/clipping.js"; // Relative import from tests/unit/core

describe("Quality Processing Edge Cases", () => {
  describe("flagSuspiciousHighlights", () => {
    it("should ignore non-highlight types", () => {
      const c = createClipping({ type: "note", content: "Short" });
      const result = flagSuspiciousHighlights([c]);
      expect(result.flaggedCount).toBe(0);
      expect(result.clippings[0].isSuspiciousHighlight).toBeUndefined();
    });

    it("should flag very short content as garbage", () => {
      // GARBAGE_LENGTH usually 5?
      const c = createClipping({ content: "ab" });
      const result = flagSuspiciousHighlights([c]);
      expect(result.flaggedCount).toBe(1);
      expect(result.clippings[0].suspiciousReason).toBe("too_short");
    });

    it("should flag fragments starting with lowercase", () => {
      // min length for fragment check is usually SHORT_LENGTH?
      // If length < SHORT_LENGTH (e.g. 30), it checks fragment.
      // If > SHORT_LENGTH (e.g. 100), it skips.
      // Assume constants.

      // Check lower case
      const c = createClipping({ content: "lower case start here but not too long" });
      // Make sure it's long enough to not be "too short" but short enough to be checked
      // If "too short" is < 5.

      const result = flagSuspiciousHighlights([c]);
      expect(result.flaggedCount).toBe(1);
      expect(result.clippings[0].suspiciousReason).toBe("fragment");
    });

    it("should flag incomplete endings", () => {
      const c = createClipping({ content: "No ending punctuation here" });
      const result = flagSuspiciousHighlights([c]);
      expect(result.flaggedCount).toBe(1);
      expect(result.clippings[0].suspiciousReason).toBe("incomplete");
    });

    it("should skip checks for long content", () => {
      const longContent = "A".repeat(200); // Definitely > SHORT_LENGTH
      // Start with lowercase to triggering fragment check if length check wasn't there
      const c = createClipping({ content: `long content ${longContent}` });
      const result = flagSuspiciousHighlights([c]);
      expect(result.flaggedCount).toBe(0);
    });
  });

  describe("flagFuzzyDuplicates", () => {
    it("should identify fuzzy duplicates", () => {
      const c1 = createClipping({
        id: "1",
        location: { start: 100, end: 110, raw: "100-110" },
        content: "This is some content for fuzzy matching test",
      });
      const c2 = createClipping({
        id: "2",
        location: { start: 105, end: 115, raw: "105-115" },
        content: "This is some content for fuzzy matching text", // tiny change
      });

      // Should match (similarity ~0.77)
      const result = flagFuzzyDuplicates([c1, c2], 0.7);
      expect(result.flaggedCount).toBe(1);
      const flagged = result.clippings.find((c) => c.id === "2");
      expect(flagged?.possibleDuplicateOf).toBe("1");
    });

    it("should stop checking if locations are too far apart (branch optimization)", () => {
      const c1 = createClipping({
        id: "1",
        location: { start: 100, end: 110, raw: "100-110" },
        content: "Identical content",
      });
      const c2 = createClipping({
        id: "2",
        location: { start: 200, end: 210, raw: "200-210" }, // Distance > 50
        content: "Identical content",
      });

      const result = flagFuzzyDuplicates([c1, c2], 0.8);
      // Should NOT flag because distance optimization skips comparison
      // Even though content is identical and matches threshold
      expect(result.flaggedCount).toBe(0);
    });

    it("should handles skip if already flagged", () => {
      const c1 = createClipping({
        id: "1",
        location: { start: 100, end: 110, raw: "" },
        content: "Common words A B C",
      });
      const c2 = createClipping({
        id: "2",
        location: { start: 100, end: 110, raw: "" },
        content: "Common words A B D",
      });
      const c3 = createClipping({
        id: "3",
        location: { start: 100, end: 110, raw: "" },
        content: "Common words A B E",
      });

      // All similar to each other (~0.75 or less?)
      // {Common, words, A, B, C} (5) vs {..., D} (5). Union 6. Intersection 4. 4/6 = 0.66.

      const result = flagFuzzyDuplicates([c1, c2, c3], 0.6);
      expect(result.flaggedCount).toBe(2); // c2 and c3 flagged
    });
  });
});
