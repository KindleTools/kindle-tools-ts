import { describe, it, expect } from "vitest";
import { removeDuplicates, mergeTags } from "#core/processing/deduplicator.js";
import { createClipping } from "../../fixtures/clipping.js";

describe("Deduplicator", () => {
    describe("mergeTags", () => {
        it("should return target if source has no tags", () => {
            const target = createClipping({ tags: ["t1"] });
            const source = createClipping({ tags: [] });
            const result = mergeTags(target, source);
            expect(result).toBe(target); // Reference equality check
        });

        it("should return target if no new tags found", () => {
            const target = createClipping({ tags: ["t1"] });
            const source = createClipping({ tags: ["t1"] });
            const result = mergeTags(target, source);
            expect(result).toBe(target);
        });

        it("should merge new tags", () => {
            const target = createClipping({ tags: ["t1"] });
            const source = createClipping({ tags: ["t2"] });
            const result = mergeTags(target, source);
            expect(result.tags).toEqual(["t1", "t2"]);
        });
    });

    describe("removeDuplicates", () => {
        it("should remove exact duplicates (Last Wins strategy)", () => {
            const c1 = createClipping({
                id: "1",
                title: "Book A",
                location: { raw: "100", start: 100, end: null },
                content: "Same content",
                blockIndex: 1
            });
            const c2 = createClipping({
                id: "2",
                title: "Book A",
                location: { raw: "100", start: 100, end: null },
                content: "Same content",
                blockIndex: 2
            });

            const result = removeDuplicates([c1, c2]);
            expect(result.removedCount).toBe(1);
            expect(result.clippings).toHaveLength(1);
            expect(result.clippings[0].id).toBe("2"); // Last one wins
        });

        it("should merge tags when removing duplicates", () => {
            const c1 = createClipping({
                title: "Book A",
                location: { raw: "100", start: 100, end: null },
                content: "Same content",
                tags: ["tag1"]
            });
            const c2 = createClipping({
                title: "Book A",
                location: { raw: "100", start: 100, end: null },
                content: "Same content",
                tags: ["tag2"]
            });

            const result = removeDuplicates([c1, c2]);
            expect(result.clippings[0].tags).toEqual(expect.arrayContaining(["tag2", "tag1"]));
        });

        it("should flag duplicates if remove=false", () => {
            const c1 = createClipping({
                id: "1",
                title: "Book A",
                location: { raw: "100", start: 100, end: null },
                content: "Same content",
                blockIndex: 1
            });
            const c2 = createClipping({
                id: "2",
                title: "Book A",
                location: { raw: "100", start: 100, end: null },
                content: "Same content",
                blockIndex: 2
            });

            // remove=false
            const result = removeDuplicates([c1, c2], false);

            // Should keep BOTH
            // And removedCount calculated as (total - unique). Unique is 1. Total 2. removedCount 1?
            // "removedCount: clippings.length - seen.size"

            expect(result.clippings).toHaveLength(2);
            expect(result.removedCount).toBe(1); // Wait, strictly this implementation returns 1 even if not removed from array?
            // Implementation: clippings.length - seen.size.
            // seen.size is 1. clippings.length 2. So 1.
            // Correct.

            const flagged = result.clippings.find(c => c.isSuspiciousHighlight);
            expect(flagged).toBeDefined();
            expect(flagged?.id).toBe("1"); // Older one flagged
            expect(flagged?.suspiciousReason).toBe("exact_duplicate");
            expect(flagged?.possibleDuplicateOf).toBe("2");
        });
    });
});
