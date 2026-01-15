import { describe, expect, it } from "vitest";
import type { Clipping } from "#app-types/clipping.js";
import { removeLinkedNotes } from "#core/processing/note-merger.js";

// Helper to create a minimal clipping
function createClipping(overrides: Partial<Clipping> = {}): Clipping {
  return {
    id: "test-id",
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

describe("Note Merger", () => {
  describe("removeLinkedNotes", () => {
    it("should remove notes that are linked to highlights", () => {
      const highlight = createClipping({
        id: "highlight-1",
        type: "highlight",
        linkedNoteId: "note-1",
        note: "My note content",
      });
      const linkedNote = createClipping({
        id: "note-1",
        type: "note",
        content: "My note content",
        linkedHighlightId: "highlight-1",
      });

      const result = removeLinkedNotes([highlight, linkedNote]);

      expect(result.clippings).toHaveLength(1);
      expect(result.clippings[0].id).toBe("highlight-1");
      expect(result.consumedCount).toBe(1);
    });

    it("should keep unlinked notes in output", () => {
      const highlight = createClipping({
        id: "highlight-1",
        type: "highlight",
      });
      const unlinkedNote = createClipping({
        id: "note-1",
        type: "note",
        content: "Standalone note",
        // No linkedHighlightId
      });

      const result = removeLinkedNotes([highlight, unlinkedNote]);

      expect(result.clippings).toHaveLength(2);
      expect(result.consumedCount).toBe(0);
    });

    it("should keep all non-note types", () => {
      const highlight = createClipping({ id: "h1", type: "highlight" });
      const bookmark = createClipping({ id: "b1", type: "bookmark", content: "" });
      const clip = createClipping({ id: "c1", type: "clip" });
      const article = createClipping({ id: "a1", type: "article" });

      const result = removeLinkedNotes([highlight, bookmark, clip, article]);

      expect(result.clippings).toHaveLength(4);
      expect(result.consumedCount).toBe(0);
    });

    it("should handle mixed linked and unlinked notes", () => {
      const highlight1 = createClipping({
        id: "h1",
        type: "highlight",
        linkedNoteId: "n1",
        note: "Note 1 content",
      });
      const linkedNote = createClipping({
        id: "n1",
        type: "note",
        linkedHighlightId: "h1",
      });
      const unlinkedNote = createClipping({
        id: "n2",
        type: "note",
        content: "Standalone thought",
      });
      const highlight2 = createClipping({
        id: "h2",
        type: "highlight",
      });

      const result = removeLinkedNotes([highlight1, linkedNote, unlinkedNote, highlight2]);

      expect(result.clippings).toHaveLength(3);
      expect(result.consumedCount).toBe(1);
      // Verify linked note was removed
      expect(result.clippings.find((c) => c.id === "n1")).toBeUndefined();
      // Verify unlinked note was kept
      expect(result.clippings.find((c) => c.id === "n2")).toBeDefined();
      // Verify highlights were kept
      expect(result.clippings.find((c) => c.id === "h1")).toBeDefined();
      expect(result.clippings.find((c) => c.id === "h2")).toBeDefined();
    });

    it("should return empty array when all items are linked notes", () => {
      const linkedNote1 = createClipping({
        id: "note-1",
        type: "note",
        linkedHighlightId: "highlight-1",
      });
      const linkedNote2 = createClipping({
        id: "note-2",
        type: "note",
        linkedHighlightId: "highlight-2",
      });

      const result = removeLinkedNotes([linkedNote1, linkedNote2]);

      expect(result.clippings).toHaveLength(0);
      expect(result.consumedCount).toBe(2);
    });

    it("should handle empty input", () => {
      const result = removeLinkedNotes([]);

      expect(result.clippings).toHaveLength(0);
      expect(result.consumedCount).toBe(0);
    });

    it("should preserve highlights with embedded notes after removal", () => {
      const highlight = createClipping({
        id: "h1",
        type: "highlight",
        content: "Important quote",
        linkedNoteId: "n1",
        note: "My thoughts on this quote",
        tags: ["important", "review"],
      });
      const linkedNote = createClipping({
        id: "n1",
        type: "note",
        content: "My thoughts on this quote",
        linkedHighlightId: "h1",
      });

      const result = removeLinkedNotes([highlight, linkedNote]);

      expect(result.clippings).toHaveLength(1);
      const remainingHighlight = result.clippings[0];
      expect(remainingHighlight.id).toBe("h1");
      expect(remainingHighlight.note).toBe("My thoughts on this quote");
      expect(remainingHighlight.tags).toEqual(["important", "review"]);
      expect(remainingHighlight.linkedNoteId).toBe("n1");
    });

    it("should handle multiple linked notes across multiple highlights", () => {
      const h1 = createClipping({
        id: "h1",
        type: "highlight",
        title: "Book A",
        linkedNoteId: "n1",
        note: "Note 1",
      });
      const n1 = createClipping({
        id: "n1",
        type: "note",
        title: "Book A",
        linkedHighlightId: "h1",
      });
      const h2 = createClipping({
        id: "h2",
        type: "highlight",
        title: "Book B",
        linkedNoteId: "n2",
        note: "Note 2",
      });
      const n2 = createClipping({
        id: "n2",
        type: "note",
        title: "Book B",
        linkedHighlightId: "h2",
      });
      const h3 = createClipping({
        id: "h3",
        type: "highlight",
        title: "Book A",
        // No linked note
      });

      const result = removeLinkedNotes([h1, n1, h2, n2, h3]);

      expect(result.clippings).toHaveLength(3);
      expect(result.consumedCount).toBe(2);
      expect(result.clippings.map((c) => c.id).sort()).toEqual(["h1", "h2", "h3"]);
    });

    describe("with removeUnlinked option", () => {
      it("should also remove unlinked notes when removeUnlinked is true", () => {
        const highlight = createClipping({
          id: "h1",
          type: "highlight",
        });
        const unlinkedNote = createClipping({
          id: "n1",
          type: "note",
          content: "Standalone note",
        });

        const result = removeLinkedNotes([highlight, unlinkedNote], { removeUnlinked: true });

        expect(result.clippings).toHaveLength(1);
        expect(result.clippings[0].id).toBe("h1");
        expect(result.consumedCount).toBe(1);
      });

      it("should remove both linked and unlinked notes when removeUnlinked is true", () => {
        const highlight = createClipping({
          id: "h1",
          type: "highlight",
          linkedNoteId: "n1",
          note: "Linked note content",
        });
        const linkedNote = createClipping({
          id: "n1",
          type: "note",
          linkedHighlightId: "h1",
        });
        const unlinkedNote = createClipping({
          id: "n2",
          type: "note",
          content: "Standalone thought",
        });

        const result = removeLinkedNotes([highlight, linkedNote, unlinkedNote], {
          removeUnlinked: true,
        });

        expect(result.clippings).toHaveLength(1);
        expect(result.clippings[0].id).toBe("h1");
        expect(result.consumedCount).toBe(2);
      });

      it("should keep non-note types even with removeUnlinked true", () => {
        const highlight = createClipping({ id: "h1", type: "highlight" });
        const bookmark = createClipping({ id: "b1", type: "bookmark", content: "" });
        const unlinkedNote = createClipping({ id: "n1", type: "note", content: "Standalone" });

        const result = removeLinkedNotes([highlight, bookmark, unlinkedNote], {
          removeUnlinked: true,
        });

        expect(result.clippings).toHaveLength(2);
        expect(result.clippings.map((c) => c.id).sort()).toEqual(["b1", "h1"]);
        expect(result.consumedCount).toBe(1);
      });
    });
  });
});
