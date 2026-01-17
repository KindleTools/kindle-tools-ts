import { describe, it, expect } from "vitest";
import { smartMergeHighlights } from "#core/processing/merger.js";
import { createClipping } from "../../fixtures/clipping.js";

describe("Merger Edge Cases", () => {
    it("should merge nearby highlights (gap = 5)", () => {
        // Gap of exactly 5 should pass proximity check if content overlaps
        // bStart = 115. aEnd = 110. Diff 5. (bStart > aEnd + 5) -> 115 > 115 False.

        const c1 = createClipping({
            location: { start: 100, end: 110, raw: "100-110" },
            content: "Content that matches enough"
        });
        const c2 = createClipping({
            location: { start: 115, end: 125, raw: "115-125" },
            content: "matches enough to merge"
        });

        // Overlap: "matches enough". 
        // aWords: Content, that, matches, enough. (4)
        // bWords: matches, enough, to, merge. (4)
        // Intersection: matches, enough (2).
        // 50% of 4 is 2. 2 >= 2. True.

        const result = smartMergeHighlights([c1, c2]);
        expect(result.mergedCount).toBe(1);
    });

    it("should NOT merge distant highlights (gap = 6)", () => {
        // Gap of 6 should fail proximity check
        // bStart = 116. aEnd = 110. (116 > 115) True.

        const c1 = createClipping({
            location: { start: 100, end: 110, raw: "100-110" },
            content: "Content that matches enough"
        });
        const c2 = createClipping({
            location: { start: 116, end: 126, raw: "116-126" },
            content: "matches enough to merge"
        });

        const result = smartMergeHighlights([c1, c2]);
        expect(result.mergedCount).toBe(0);
    });



    it("should merge if content is empty (handled by includes check)", () => {
        const c1 = createClipping({ content: "" });
        const c2 = createClipping({ content: "" });

        const result = smartMergeHighlights([c1, c2]);
        expect(result.mergedCount).toBe(1);
    });
});
