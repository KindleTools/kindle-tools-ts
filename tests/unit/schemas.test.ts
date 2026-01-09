/**
 * Tests for Zod validation schemas
 */

import { describe, expect, it } from "vitest";
import {
  ClippingImportSchema,
  ClippingLocationObjectSchema,
  ClippingLocationSchema,
  ClippingSourceSchema,
  ClippingsExportSchema,
  ClippingTypeSchema,
  ImportedDataSchema,
  SupportedLanguageSchema,
  SuspiciousReasonSchema,
} from "#schemas/clipping.schema.js";
import {
  ConfigFileSchema,
  GeoLocationSchema,
  ParseOptionsSchema,
  parseParseOptions,
  safeParseParseOptions,
  TagCaseSchema,
} from "#schemas/config.schema.js";

describe("Clipping Schemas", () => {
  describe("ClippingTypeSchema", () => {
    it("should accept valid clipping types", () => {
      expect(ClippingTypeSchema.parse("highlight")).toBe("highlight");
      expect(ClippingTypeSchema.parse("note")).toBe("note");
      expect(ClippingTypeSchema.parse("bookmark")).toBe("bookmark");
      expect(ClippingTypeSchema.parse("clip")).toBe("clip");
      expect(ClippingTypeSchema.parse("article")).toBe("article");
    });

    it("should reject invalid clipping types", () => {
      expect(() => ClippingTypeSchema.parse("invalid")).toThrow();
      expect(() => ClippingTypeSchema.parse("")).toThrow();
      expect(() => ClippingTypeSchema.parse(123)).toThrow();
    });
  });

  describe("SupportedLanguageSchema", () => {
    it("should accept valid language codes", () => {
      expect(SupportedLanguageSchema.parse("en")).toBe("en");
      expect(SupportedLanguageSchema.parse("es")).toBe("es");
      expect(SupportedLanguageSchema.parse("pt")).toBe("pt");
      expect(SupportedLanguageSchema.parse("de")).toBe("de");
      expect(SupportedLanguageSchema.parse("fr")).toBe("fr");
      expect(SupportedLanguageSchema.parse("ja")).toBe("ja");
      expect(SupportedLanguageSchema.parse("zh")).toBe("zh");
    });

    it("should reject invalid language codes", () => {
      expect(() => SupportedLanguageSchema.parse("invalid")).toThrow();
      expect(() => SupportedLanguageSchema.parse("EN")).toThrow(); // Case sensitive
    });
  });

  describe("ClippingSourceSchema", () => {
    it("should accept valid sources", () => {
      expect(ClippingSourceSchema.parse("kindle")).toBe("kindle");
      expect(ClippingSourceSchema.parse("sideload")).toBe("sideload");
    });

    it("should reject invalid sources", () => {
      expect(() => ClippingSourceSchema.parse("other")).toThrow();
    });
  });

  describe("SuspiciousReasonSchema", () => {
    it("should accept valid suspicious reasons", () => {
      expect(SuspiciousReasonSchema.parse("too_short")).toBe("too_short");
      expect(SuspiciousReasonSchema.parse("fragment")).toBe("fragment");
      expect(SuspiciousReasonSchema.parse("incomplete")).toBe("incomplete");
      expect(SuspiciousReasonSchema.parse("exact_duplicate")).toBe("exact_duplicate");
      expect(SuspiciousReasonSchema.parse("overlapping")).toBe("overlapping");
    });

    it("should reject invalid reasons", () => {
      expect(() => SuspiciousReasonSchema.parse("unknown")).toThrow();
    });
  });

  describe("ClippingLocationSchema", () => {
    it("should accept location as string", () => {
      const result = ClippingLocationSchema.parse("100-105");
      expect(result).toBe("100-105");
    });

    it("should accept location as object", () => {
      const result = ClippingLocationSchema.parse({ raw: "100-105", start: 100, end: 105 });
      expect(result).toEqual({ raw: "100-105", start: 100, end: 105 });
    });

    it("should apply defaults for object format", () => {
      const result = ClippingLocationSchema.parse({});
      expect(result).toEqual({ raw: "", start: 0, end: null });
    });
  });

  describe("ClippingLocationObjectSchema", () => {
    it("should validate complete location object", () => {
      const result = ClippingLocationObjectSchema.parse({
        raw: "100-105",
        start: 100,
        end: 105,
      });
      expect(result).toEqual({ raw: "100-105", start: 100, end: 105 });
    });

    it("should accept null for end", () => {
      const result = ClippingLocationObjectSchema.parse({
        raw: "100",
        start: 100,
        end: null,
      });
      expect(result.end).toBeNull();
    });

    it("should reject missing required fields", () => {
      expect(() => ClippingLocationObjectSchema.parse({})).toThrow();
    });
  });

  describe("ClippingImportSchema", () => {
    it("should accept minimal clipping", () => {
      const result = ClippingImportSchema.parse({});
      expect(result).toBeDefined();
    });

    it("should accept complete clipping", () => {
      const clipping = {
        id: "test123",
        title: "Test Book",
        author: "Test Author",
        content: "Some content",
        type: "highlight",
        page: 42,
        location: { raw: "100-105", start: 100, end: 105 },
        tags: ["tag1", "tag2"],
        isSuspiciousHighlight: false,
      };
      const result = ClippingImportSchema.parse(clipping);
      expect(result.id).toBe("test123");
      expect(result.title).toBe("Test Book");
      expect(result.tags).toEqual(["tag1", "tag2"]);
    });

    it("should transform date string to Date object", () => {
      const result = ClippingImportSchema.parse({
        date: "2024-01-01T00:00:00.000Z",
      });
      expect(result.date).toBeInstanceOf(Date);
    });

    it("should handle null date", () => {
      const result = ClippingImportSchema.parse({ date: null });
      expect(result.date).toBeNull();
    });

    it("should handle invalid date string as null", () => {
      const result = ClippingImportSchema.parse({ date: "invalid-date" });
      expect(result.date).toBeNull();
    });

    it("should validate similarityScore range", () => {
      expect(ClippingImportSchema.parse({ similarityScore: 0 }).similarityScore).toBe(0);
      expect(ClippingImportSchema.parse({ similarityScore: 1 }).similarityScore).toBe(1);
      expect(ClippingImportSchema.parse({ similarityScore: 0.5 }).similarityScore).toBe(0.5);
      expect(() => ClippingImportSchema.parse({ similarityScore: 1.5 })).toThrow();
      expect(() => ClippingImportSchema.parse({ similarityScore: -0.1 })).toThrow();
    });
  });

  describe("ClippingsExportSchema", () => {
    it("should accept array format", () => {
      const data = [{ content: "First" }, { content: "Second" }];
      const result = ClippingsExportSchema.parse(data);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it("should accept object format with clippings", () => {
      const data = {
        clippings: [{ content: "First" }],
        meta: { total: 1 },
      };
      const result = ClippingsExportSchema.parse(data);
      expect(result).toHaveProperty("clippings");
    });

    it("should accept object format with books", () => {
      const data = {
        books: {
          "Book 1": [{ content: "Highlight" }],
          "Book 2": [{ content: "Another" }],
        },
      };
      const result = ClippingsExportSchema.parse(data);
      expect(result).toHaveProperty("books");
    });

    it("should accept mixed format with meta", () => {
      const data = {
        clippings: [{ content: "Test" }],
        books: { Book: [{ content: "Test2" }] },
        meta: {
          total: 2,
          totalBooks: 1,
          exportDate: "2024-01-01",
          version: "1.0.0",
        },
      };
      const result = ClippingsExportSchema.parse(data);
      expect(result).toHaveProperty("meta");
    });
  });

  describe("ImportedDataSchema", () => {
    it("should accept data with clippings", () => {
      const result = ImportedDataSchema.parse({
        clippings: [{ content: "Test" }],
      });
      expect(result.clippings).toBeDefined();
    });

    it("should accept data with books", () => {
      const result = ImportedDataSchema.parse({
        books: { Book: [{ content: "Test" }] },
      });
      expect(result.books).toBeDefined();
    });

    it("should reject empty object", () => {
      expect(() => ImportedDataSchema.parse({})).toThrow();
    });
  });
});

describe("Config Schemas", () => {
  describe("TagCaseSchema", () => {
    it("should accept valid tag cases", () => {
      expect(TagCaseSchema.parse("original")).toBe("original");
      expect(TagCaseSchema.parse("uppercase")).toBe("uppercase");
      expect(TagCaseSchema.parse("lowercase")).toBe("lowercase");
    });

    it("should reject invalid cases", () => {
      expect(() => TagCaseSchema.parse("UPPERCASE")).toThrow();
    });
  });

  describe("GeoLocationSchema", () => {
    it("should accept valid coordinates", () => {
      const result = GeoLocationSchema.parse({
        latitude: 40.7128,
        longitude: -74.006,
      });
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.006);
    });

    it("should accept optional fields", () => {
      const result = GeoLocationSchema.parse({
        latitude: 40.7128,
        longitude: -74.006,
        altitude: 10,
        placeName: "New York",
      });
      expect(result.altitude).toBe(10);
      expect(result.placeName).toBe("New York");
    });

    it("should reject out-of-range latitude", () => {
      expect(() => GeoLocationSchema.parse({ latitude: 91, longitude: 0 })).toThrow();
      expect(() => GeoLocationSchema.parse({ latitude: -91, longitude: 0 })).toThrow();
    });

    it("should reject out-of-range longitude", () => {
      expect(() => GeoLocationSchema.parse({ latitude: 0, longitude: 181 })).toThrow();
      expect(() => GeoLocationSchema.parse({ latitude: 0, longitude: -181 })).toThrow();
    });
  });

  describe("ParseOptionsSchema", () => {
    it("should apply defaults for empty input", () => {
      const result = ParseOptionsSchema.parse({});
      expect(result.language).toBe("auto");
      expect(result.removeDuplicates).toBe(true);
      expect(result.mergeNotes).toBe(true);
      expect(result.extractTags).toBe(false);
      expect(result.tagCase).toBe("uppercase");
      expect(result.mergeOverlapping).toBe(true);
      expect(result.highlightsOnly).toBe(false);
      expect(result.normalizeUnicode).toBe(true);
      expect(result.cleanContent).toBe(true);
      expect(result.cleanTitles).toBe(true);
      expect(result.strict).toBe(false);
    });

    it("should accept valid options", () => {
      const result = ParseOptionsSchema.parse({
        language: "es",
        removeDuplicates: false,
        extractTags: true,
        tagCase: "lowercase",
        excludeTypes: ["bookmark", "note"],
        minContentLength: 10,
      });
      expect(result.language).toBe("es");
      expect(result.removeDuplicates).toBe(false);
      expect(result.excludeTypes).toEqual(["bookmark", "note"]);
      expect(result.minContentLength).toBe(10);
    });

    it("should accept geoLocation", () => {
      const result = ParseOptionsSchema.parse({
        geoLocation: { latitude: 40, longitude: -74 },
      });
      expect(result.geoLocation).toEqual({ latitude: 40, longitude: -74 });
    });
  });

  describe("parseParseOptions helper", () => {
    it("should parse and return typed result", () => {
      const result = parseParseOptions({ language: "de" });
      expect(result.language).toBe("de");
      expect(result.removeDuplicates).toBe(true); // default
    });

    it("should throw on invalid input", () => {
      expect(() => parseParseOptions({ language: "invalid" })).toThrow();
    });
  });

  describe("safeParseParseOptions helper", () => {
    it("should return success result for valid input", () => {
      const result = safeParseParseOptions({ language: "fr" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe("fr");
      }
    });

    it("should return error result for invalid input", () => {
      const result = safeParseParseOptions({ language: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("ConfigFileSchema", () => {
    it("should accept valid config file", () => {
      const config = {
        format: "obsidian",
        folderStructure: "by-author",
        language: "en",
        extractTags: true,
        tagCase: "lowercase",
      };
      const result = ConfigFileSchema.parse(config);
      expect(result.format).toBe("obsidian");
      expect(result.folderStructure).toBe("by-author");
    });

    it("should accept empty config", () => {
      const result = ConfigFileSchema.parse({});
      expect(result.language).toBe("auto"); // default from ParseOptionsSchema
    });

    it("should reject invalid folderStructure", () => {
      expect(() => ConfigFileSchema.parse({ folderStructure: "invalid" })).toThrow();
    });
  });
});
