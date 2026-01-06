/**
 * Tests for the tokenizer module.
 */

import { tokenize } from "@importers/txt/core/tokenizer.js";
import { describe, expect, it } from "vitest";

describe("tokenizer", () => {
  describe("tokenize", () => {
    it("should split clippings by separator", () => {
      const content = `Book Title (Author)
- Your Highlight on page 1 | Location 100-105 | Added on Friday, January 1, 2024 10:30:45 AM

This is the first highlight.
==========
Book Title (Author)
- Your Highlight on page 2 | Location 200-210 | Added on Friday, January 2, 2024 11:00:00 AM

This is the second highlight.
==========`;

      const blocks = tokenize(content);

      expect(blocks).toHaveLength(2);
      expect(blocks[0]?.lines[0]).toBe("Book Title (Author)");
      expect(blocks[1]?.lines[0]).toBe("Book Title (Author)");
    });

    it("should handle BOM at start of file", () => {
      const bom = "\uFEFF";
      const content = `${bom}Book Title (Author)
- Your Highlight on page 1 | Location 100-105 | Added on Friday, January 1, 2024 10:30:45 AM

This is the content.
==========`;

      const blocks = tokenize(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.lines[0]).toBe("Book Title (Author)");
      // Should NOT start with BOM
      expect(blocks[0]?.lines[0]?.charCodeAt(0)).not.toBe(0xfeff);
    });

    it("should handle Windows line endings (CRLF)", () => {
      const content =
        "Book Title (Author)\r\n- Your Highlight on page 1 | Location 100\r\n\r\nContent\r\n==========";

      const blocks = tokenize(content);

      expect(blocks).toHaveLength(1);
      // Empty lines get filtered as they become empty strings after trim
      expect(blocks[0]?.lines.filter((l) => l.length > 0)).toHaveLength(3);
    });

    it("should handle Unix line endings (LF)", () => {
      const content =
        "Book Title (Author)\n- Your Highlight on page 1 | Location 100\n\nContent\n==========";

      const blocks = tokenize(content);

      expect(blocks).toHaveLength(1);
      // Empty lines get filtered as they become empty strings after trim
      expect(blocks[0]?.lines.filter((l) => l.length > 0)).toHaveLength(3);
    });

    it("should skip empty blocks", () => {
      const content = `==========
==========
Book Title (Author)
- Your Highlight on page 1 | Location 100

Content
==========
==========`;

      const blocks = tokenize(content);

      expect(blocks).toHaveLength(1);
    });

    it("should skip blocks with less than 2 lines", () => {
      const content = `Single line only
==========
Book Title (Author)
- Metadata line

Content
==========`;

      const blocks = tokenize(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.lines[0]).toBe("Book Title (Author)");
    });

    it("should preserve block indices", () => {
      const content = `==========
Block 1 (Author)
- Metadata

Content 1
==========
==========
Block 2 (Author)
- Metadata

Content 2
==========`;

      const blocks = tokenize(content);

      // The actual indices depend on how empty blocks are counted
      expect(blocks).toHaveLength(2);
      expect(blocks[0]?.index).toBeDefined();
      expect(blocks[1]?.index).toBeDefined();
      expect(blocks[0]?.index).not.toBe(blocks[1]?.index);
    });

    it("should handle separator with more than 10 equals signs", () => {
      const content = `Book Title (Author)
- Your Highlight on page 1 | Location 100

Content
============================================================`;

      const blocks = tokenize(content);

      expect(blocks).toHaveLength(1);
    });

    it("should return empty array for empty input", () => {
      expect(tokenize("")).toHaveLength(0);
      expect(tokenize("   ")).toHaveLength(0);
      expect(tokenize("\n\n")).toHaveLength(0);
    });

    it("should return empty array for only separators", () => {
      const content = "==========\n==========\n==========";

      const blocks = tokenize(content);

      expect(blocks).toHaveLength(0);
    });
  });
});
