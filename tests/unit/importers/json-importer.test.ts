import { describe, expect, it } from "vitest";

import { JsonImporter } from "#importers/formats/json.importer.js";

describe("JsonImporter", () => {
  const importer = new JsonImporter();

  it("should have correct name and extensions", () => {
    expect(importer.name).toBe("json");
    expect(importer.extensions).toEqual([".json"]);
  });

  describe("import", () => {
    it("should handle invalid JSON syntax", async () => {
      const result = await importer.import("{ invalid json");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("IMPORT_PARSE_ERROR");
        expect(result.error.message).toContain("Invalid JSON syntax");
      }
    });

    it("should handle schema validation errors", async () => {
      // Providing a number (valid JSON) but invalid against Schema (expects Array or Object)
      const result = await importer.import(JSON.stringify(123));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("IMPORT_PARSE_ERROR");
        expect(result.error.message).toContain("Invalid JSON structure");
      }
    });

    it("should import flat array format", async () => {
      const input = [
        {
          title: "Book A",
          author: "Author A",
          content: "Content A",
          type: "highlight",
          date: new Date().toISOString(),
        },
      ];
      const result = await importer.import(JSON.stringify(input));
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.clippings).toHaveLength(1);
        expect(result.value.clippings[0].title).toBe("Book A");
      }
    });

    it("should import object format with clippings array", async () => {
      const input = {
        clippings: [
          {
            title: "Book B",
            content: "Content B",
            location: "100-200",
          },
        ],
      };
      const result = await importer.import(JSON.stringify(input));
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.clippings).toHaveLength(1);
        expect(result.value.clippings[0].location.start).toBe(100);
      }
    });

    it("should import object format with books map", async () => {
      const input = {
        books: {
          "Book C": [{ content: "Content C1" }, { content: "Content C2" }],
        },
      };
      const result = await importer.import(JSON.stringify(input));
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.clippings).toHaveLength(2);
        expect(result.value.clippings[0].title).toBe("Book C");
        expect(result.value.clippings[0].content).toBe("Content C1");
      }
    });

    it("should return error if no clippings found (empty array)", async () => {
      const result = await importer.import("[]");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("IMPORT_PARSE_ERROR");
        expect(result.error.message).toContain("No clippings found");
      }
    });

    it("should populate all optional fields correctly", async () => {
      const fullClipping = {
        title: "Full Book",
        content: "Full Content",
        note: "My Note",
        tags: ["tag1", "tag2"],
        linkedNoteId: "note-1",
        linkedHighlightId: "high-1",
        isSuspiciousHighlight: true,
        suspiciousReason: "too_short",
        possibleDuplicateOf: "other-id",
        similarityScore: 0.9,
        titleWasCleaned: true,
        contentWasCleaned: true,
        location: { start: 10, end: 20, raw: "10-20" },
      };
      const input = [fullClipping];

      const result = await importer.import(JSON.stringify(input));
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const c = result.value.clippings[0];
        expect(c.note).toBe("My Note");
        expect(c.tags).toEqual(["tag1", "tag2"]);
        expect(c.isSuspiciousHighlight).toBe(true);
        expect(c.similarityScore).toBe(0.9);
        expect(c.location.start).toBe(10);
      }
    });

    it("should handle location edge cases", async () => {
      const input = [
        { content: "A" }, // Missing location (undefined)
        { content: "B", location: { raw: "just raw" } }, // Object location partial
      ];
      const result = await importer.import(JSON.stringify(input));
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.clippings[0].location.raw).toBe("");
        expect(result.value.clippings[1].location.raw).toBe("just raw");
      }
    });
  });
});
