/**
 * Tests for JSON and CSV importers
 */

import { describe, expect, it } from "vitest";
import { CsvImporter, JsonImporter } from "#importers/index.js";

describe("importers", () => {
  describe("JsonImporter", () => {
    const importer = new JsonImporter();

    it("should import flat format", async () => {
      const json = JSON.stringify({
        clippings: [
          {
            id: "test1",
            title: "Test Book",
            author: "Test Author",
            content: "Test content",
            type: "highlight",
            page: 42,
            location: { raw: "100-105", start: 100, end: 105 },
            date: "2024-01-01T00:00:00.000Z",
            dateRaw: "January 1, 2024",
          },
        ],
        meta: { total: 1 },
      });

      const result = await importer.import(json);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(1);
      expect(result.clippings[0]?.title).toBe("Test Book");
      expect(result.clippings[0]?.author).toBe("Test Author");
      expect(result.clippings[0]?.content).toBe("Test content");
      expect(result.clippings[0]?.type).toBe("highlight");
      expect(result.clippings[0]?.page).toBe(42);
    });

    it("should import grouped by book format", async () => {
      const json = JSON.stringify({
        books: {
          "Test Book": [
            {
              content: "First highlight",
              type: "highlight",
            },
            {
              content: "Second highlight",
              type: "highlight",
            },
          ],
          "Another Book": [
            {
              content: "Third highlight",
              type: "highlight",
            },
          ],
        },
        meta: { totalBooks: 2, totalClippings: 3 },
      });

      const result = await importer.import(json);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(3);
      expect(result.clippings[0]?.title).toBe("Test Book");
      expect(result.clippings[2]?.title).toBe("Another Book");
    });

    it("should handle location as string", async () => {
      const json = JSON.stringify({
        clippings: [
          {
            content: "Test",
            location: "100-105",
          },
        ],
      });

      const result = await importer.import(json);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.location.raw).toBe("100-105");
      expect(result.clippings[0]?.location.start).toBe(100);
      expect(result.clippings[0]?.location.end).toBe(105);
    });

    it("should generate IDs for clippings without them", async () => {
      const json = JSON.stringify({
        clippings: [{ content: "Test" }],
      });

      const result = await importer.import(json);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.id).toMatch(/^imp_/);
    });

    it("should fail on invalid JSON", async () => {
      const result = await importer.import("not valid json");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should fail when no clippings found", async () => {
      const json = JSON.stringify({});

      const result = await importer.import(json);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("No clippings found");
    });

    it("should preserve optional fields when present", async () => {
      const json = JSON.stringify({
        clippings: [
          {
            content: "Test",
            tags: ["tag1", "tag2"],
            note: "My note",
            isSuspiciousHighlight: true,
            suspiciousReason: "too_short",
          },
        ],
      });

      const result = await importer.import(json);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.tags).toEqual(["tag1", "tag2"]);
      expect(result.clippings[0]?.note).toBe("My note");
      expect(result.clippings[0]?.isSuspiciousHighlight).toBe(true);
      expect(result.clippings[0]?.suspiciousReason).toBe("too_short");
    });

    it("should not include undefined optional fields", async () => {
      const json = JSON.stringify({
        clippings: [{ content: "Test" }],
      });

      const result = await importer.import(json);

      expect(result.success).toBe(true);
      expect(Object.hasOwn(result.clippings[0], "tags")).toBe(false);
      expect(Object.hasOwn(result.clippings[0], "note")).toBe(false);
    });

    it("should work with minimal JSON (only content)", async () => {
      const json = JSON.stringify({
        clippings: [{ content: "Just the content, nothing else" }],
      });

      const result = await importer.import(json);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(1);
      expect(result.clippings[0]?.content).toBe("Just the content, nothing else");
      expect(result.clippings[0]?.title).toBe("Unknown");
      expect(result.clippings[0]?.author).toBe("Unknown");
      expect(result.clippings[0]?.type).toBe("highlight");
      expect(result.clippings[0]?.id).toMatch(/^imp_/);
    });

    it("should work with external JSON (different structure)", async () => {
      // Simulate a JSON from another app with different fields
      const json = JSON.stringify({
        clippings: [
          {
            title: "My Book",
            content: "Some quote",
            // No author, no type, no location, etc.
          },
        ],
      });

      const result = await importer.import(json);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.title).toBe("My Book");
      expect(result.clippings[0]?.content).toBe("Some quote");
      expect(result.clippings[0]?.author).toBe("Unknown");
      expect(result.clippings[0]?.type).toBe("highlight");
      expect(result.clippings[0]?.wordCount).toBe(2); // "Some quote"
    });
  });

  describe("CsvImporter", () => {
    const importer = new CsvImporter();

    it("should import valid CSV", async () => {
      const csv = `id,title,author,type,page,location,date,content,wordCount,tags
"test1","Test Book","Test Author","highlight","42","100-105","2024-01-01T00:00:00.000Z","Test content","2",""`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(1);
      expect(result.clippings[0]?.id).toBe("test1");
      expect(result.clippings[0]?.title).toBe("Test Book");
      expect(result.clippings[0]?.author).toBe("Test Author");
      expect(result.clippings[0]?.content).toBe("Test content");
      expect(result.clippings[0]?.page).toBe(42);
    });

    it("should handle BOM", async () => {
      const csv = `\uFEFFid,title,author,type,page,location,date,content,wordCount,tags
"test1","Test Book","Author","highlight","","","","Test",""`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(1);
    });

    it("should handle quoted fields with commas", async () => {
      const csv = `id,title,author,content
"1","Book, With Comma","Author, Name","Content, with, commas"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.title).toBe("Book, With Comma");
      expect(result.clippings[0]?.author).toBe("Author, Name");
      expect(result.clippings[0]?.content).toBe("Content, with, commas");
    });

    it("should handle escaped quotes", async () => {
      const csv = `id,title,content
"1","Book ""With"" Quotes","Content ""quoted"""`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.title).toBe('Book "With" Quotes');
      expect(result.clippings[0]?.content).toBe('Content "quoted"');
    });

    it("should parse tags", async () => {
      const csv = `id,content,tags
"1","Test","tag1; tag2; tag3"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should not include empty tags", async () => {
      const csv = `id,content,tags
"1","Test",""`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(Object.hasOwn(result.clippings[0], "tags")).toBe(false);
    });

    it("should generate IDs when missing", async () => {
      const csv = `title,content
"Test Book","Test content"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.id).toMatch(/^imp_/);
    });

    it("should fail on empty CSV", async () => {
      const result = await importer.import("");

      expect(result.success).toBe(false);
    });

    it("should fail on header-only CSV", async () => {
      const result = await importer.import("id,title,content");

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("no data rows");
    });

    it("should fail when required columns are missing", async () => {
      const csv = `id,page
"1","42"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("content");
    });

    it("should parse location correctly", async () => {
      const csv = `content,location
"Test","100-105"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.location.start).toBe(100);
      expect(result.clippings[0]?.location.end).toBe(105);
    });

    it("should handle CRLF line endings", async () => {
      const csv = `id,title,content\r\n"1","Book","Content"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(1);
    });

    it("should skip empty rows", async () => {
      const csv = `id,content
"1","First"

"2","Second"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(2);
    });

    it("should work with minimal CSV (only content column)", async () => {
      const csv = `content
"This is my highlight"
"Another highlight"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(2);
      expect(result.clippings[0]?.content).toBe("This is my highlight");
      expect(result.clippings[0]?.title).toBe("Unknown");
      expect(result.clippings[0]?.author).toBe("Unknown");
      expect(result.clippings[0]?.type).toBe("highlight");
      expect(result.clippings[0]?.id).toMatch(/^imp_/);
    });

    it("should work with only title column", async () => {
      const csv = `title
"Book 1"
"Book 2"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings).toHaveLength(2);
      expect(result.clippings[0]?.title).toBe("Book 1");
      expect(result.clippings[0]?.content).toBe(""); // Empty content is OK
    });

    it("should work with custom columns from other apps", async () => {
      // Simulate a CSV from Excel or another app with custom columns
      const csv = `Book Title,Quote,Notes
"The Art of War","All warfare is based on deception.","Great quote"
"1984","War is peace.","Orwell was a genius"`;

      const result = await importer.import(csv);

      // This should fail because it doesn't have 'content' or 'title' columns
      expect(result.success).toBe(false);
    });

    it("should be case-insensitive for headers", async () => {
      const csv = `TITLE,CONTENT,AUTHOR
"My Book","My quote","Some Author"`;

      const result = await importer.import(csv);

      expect(result.success).toBe(true);
      expect(result.clippings[0]?.title).toBe("My Book");
      expect(result.clippings[0]?.content).toBe("My quote");
      expect(result.clippings[0]?.author).toBe("Some Author");
    });
  });
});
