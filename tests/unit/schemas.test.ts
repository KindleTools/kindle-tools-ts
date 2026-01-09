/**
 * Tests for Zod validation schemas
 */

import { describe, expect, it } from "vitest";
import {
  ClippingImportSchema,
  ClippingLocationObjectSchema,
  ClippingLocationSchema,
  ClippingSourceSchema,
  ClippingStrictSchema,
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
  parseConfigFile,
  parseParseOptions,
  safeParseConfigFile,
  safeParseParseOptions,
  TagCaseSchema,
} from "#schemas/config.schema.js";
import {
  AuthorCaseSchema,
  ExporterOptionsSchema,
  FolderStructureSchema,
  parseExporterOptions,
  safeParseExporterOptions,
  TemplatePresetSchema,
} from "#schemas/exporter.schema.js";
import {
  CaseTransformSchema,
  FolderStructureBaseSchema,
  LanguageCodeSchema,
  LanguageWithAutoSchema,
} from "#schemas/shared.schema.js";

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

  describe("ClippingStrictSchema", () => {
    const validClipping = {
      id: "test123",
      title: "Test Book",
      titleRaw: "Test Book (Edition)",
      author: "Test Author",
      authorRaw: "Author, Test",
      content: "Some highlighted content",
      contentRaw: "Some highlighted content",
      type: "highlight",
      page: 42,
      location: { raw: "100-105", start: 100, end: 105 },
      date: new Date("2024-01-01"),
      dateRaw: "January 1, 2024",
      isLimitReached: false,
      isEmpty: false,
      language: "en",
      source: "kindle",
      wordCount: 3,
      charCount: 25,
      blockIndex: 0,
    };

    it("should accept valid complete clipping", () => {
      const result = ClippingStrictSchema.parse(validClipping);
      expect(result.id).toBe("test123");
      expect(result.title).toBe("Test Book");
    });

    it("should reject missing required fields", () => {
      expect(() => ClippingStrictSchema.parse({})).toThrow();
      expect(() => ClippingStrictSchema.parse({ title: "Book" })).toThrow();
    });

    it("should reject empty id", () => {
      expect(() => ClippingStrictSchema.parse({ ...validClipping, id: "" })).toThrow();
    });

    it("should reject empty title", () => {
      expect(() => ClippingStrictSchema.parse({ ...validClipping, title: "" })).toThrow();
    });

    it("should accept optional linking fields", () => {
      const withLinks = {
        ...validClipping,
        linkedNoteId: "note123",
        note: "My note",
        tags: ["tag1", "tag2"],
      };
      const result = ClippingStrictSchema.parse(withLinks);
      expect(result.linkedNoteId).toBe("note123");
      expect(result.tags).toEqual(["tag1", "tag2"]);
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

    it("should accept by-author-book folderStructure", () => {
      const result = ConfigFileSchema.parse({ folderStructure: "by-author-book" });
      expect(result.folderStructure).toBe("by-author-book");
    });
  });

  describe("parseConfigFile helper", () => {
    it("should parse valid config file", () => {
      const result = parseConfigFile({
        format: "joplin",
        extractTags: true,
      });
      expect(result.format).toBe("joplin");
      expect(result.extractTags).toBe(true);
    });

    it("should throw on invalid config", () => {
      expect(() => parseConfigFile({ folderStructure: "bad" })).toThrow();
    });
  });

  describe("safeParseConfigFile helper", () => {
    it("should return success for valid config", () => {
      const result = safeParseConfigFile({ format: "html" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe("html");
      }
    });

    it("should return error for invalid config", () => {
      const result = safeParseConfigFile({ folderStructure: "wrong" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Exporter Schemas", () => {
  describe("FolderStructureSchema", () => {
    it("should accept valid folder structures", () => {
      expect(FolderStructureSchema.parse("flat")).toBe("flat");
      expect(FolderStructureSchema.parse("by-book")).toBe("by-book");
      expect(FolderStructureSchema.parse("by-author")).toBe("by-author");
      expect(FolderStructureSchema.parse("by-author-book")).toBe("by-author-book");
    });

    it("should reject invalid folder structures", () => {
      expect(() => FolderStructureSchema.parse("nested")).toThrow();
      expect(() => FolderStructureSchema.parse("by-date")).toThrow();
    });
  });

  describe("AuthorCaseSchema", () => {
    it("should accept valid case transforms", () => {
      expect(AuthorCaseSchema.parse("original")).toBe("original");
      expect(AuthorCaseSchema.parse("uppercase")).toBe("uppercase");
      expect(AuthorCaseSchema.parse("lowercase")).toBe("lowercase");
    });

    it("should reject invalid case transforms", () => {
      expect(() => AuthorCaseSchema.parse("UPPERCASE")).toThrow();
      expect(() => AuthorCaseSchema.parse("camelCase")).toThrow();
    });
  });

  describe("TemplatePresetSchema", () => {
    it("should accept valid template presets", () => {
      expect(TemplatePresetSchema.parse("default")).toBe("default");
      expect(TemplatePresetSchema.parse("minimal")).toBe("minimal");
      expect(TemplatePresetSchema.parse("obsidian")).toBe("obsidian");
      expect(TemplatePresetSchema.parse("notion")).toBe("notion");
      expect(TemplatePresetSchema.parse("academic")).toBe("academic");
      expect(TemplatePresetSchema.parse("joplin")).toBe("joplin");
    });

    it("should reject invalid presets", () => {
      expect(() => TemplatePresetSchema.parse("custom")).toThrow();
    });
  });

  describe("ExporterOptionsSchema", () => {
    it("should apply defaults for empty input", () => {
      const result = ExporterOptionsSchema.parse({});
      expect(result.groupByBook).toBe(false);
      expect(result.includeStats).toBe(false);
      expect(result.includeRaw).toBe(false);
      expect(result.includeClippingTags).toBe(true);
      expect(result.pretty).toBe(true);
      expect(result.folderStructure).toBe("by-author");
      expect(result.authorCase).toBe("uppercase");
    });

    it("should accept valid options", () => {
      const result = ExporterOptionsSchema.parse({
        outputPath: "./output",
        groupByBook: false,
        includeStats: true,
        folderStructure: "by-author-book",
        authorCase: "lowercase",
        templatePreset: "obsidian",
        title: "My Highlights",
      });
      expect(result.outputPath).toBe("./output");
      expect(result.groupByBook).toBe(false);
      expect(result.includeStats).toBe(true);
      expect(result.folderStructure).toBe("by-author-book");
      expect(result.authorCase).toBe("lowercase");
      expect(result.templatePreset).toBe("obsidian");
      expect(result.title).toBe("My Highlights");
    });

    it("should accept custom templates", () => {
      const result = ExporterOptionsSchema.parse({
        customTemplates: {
          book: "# {{title}}",
          clipping: "> {{content}}",
        },
      });
      expect(result.customTemplates?.book).toBe("# {{title}}");
      expect(result.customTemplates?.clipping).toBe("> {{content}}");
    });

    it("should reject invalid folderStructure", () => {
      expect(() => ExporterOptionsSchema.parse({ folderStructure: "invalid" })).toThrow();
    });

    it("should reject invalid authorCase", () => {
      expect(() => ExporterOptionsSchema.parse({ authorCase: "CAPS" })).toThrow();
    });
  });

  describe("parseExporterOptions helper", () => {
    it("should parse and return typed result with defaults", () => {
      const result = parseExporterOptions({
        folderStructure: "by-book",
      });
      expect(result.folderStructure).toBe("by-book");
      expect(result.authorCase).toBe("uppercase"); // default
      expect(result.pretty).toBe(true); // default
    });

    it("should throw on invalid input", () => {
      expect(() => parseExporterOptions({ folderStructure: "bad" })).toThrow();
    });
  });

  describe("safeParseExporterOptions helper", () => {
    it("should return success result for valid input", () => {
      const result = safeParseExporterOptions({ authorCase: "lowercase" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.authorCase).toBe("lowercase");
      }
    });

    it("should return error result for invalid input", () => {
      const result = safeParseExporterOptions({ templatePreset: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});

describe("Shared Schemas", () => {
  describe("CaseTransformSchema", () => {
    it("should accept valid case transforms", () => {
      expect(CaseTransformSchema.parse("original")).toBe("original");
      expect(CaseTransformSchema.parse("uppercase")).toBe("uppercase");
      expect(CaseTransformSchema.parse("lowercase")).toBe("lowercase");
    });

    it("should reject invalid transforms", () => {
      expect(() => CaseTransformSchema.parse("UPPER")).toThrow();
    });
  });

  describe("FolderStructureBaseSchema", () => {
    it("should accept valid folder structures", () => {
      expect(FolderStructureBaseSchema.parse("flat")).toBe("flat");
      expect(FolderStructureBaseSchema.parse("by-author")).toBe("by-author");
    });

    it("should reject invalid structures", () => {
      expect(() => FolderStructureBaseSchema.parse("nested")).toThrow();
    });
  });

  describe("LanguageCodeSchema", () => {
    it("should accept valid language codes", () => {
      expect(LanguageCodeSchema.parse("en")).toBe("en");
      expect(LanguageCodeSchema.parse("es")).toBe("es");
      expect(LanguageCodeSchema.parse("ja")).toBe("ja");
    });

    it("should reject invalid codes", () => {
      expect(() => LanguageCodeSchema.parse("auto")).toThrow();
      expect(() => LanguageCodeSchema.parse("xx")).toThrow();
    });
  });

  describe("LanguageWithAutoSchema", () => {
    it("should accept language codes and auto", () => {
      expect(LanguageWithAutoSchema.parse("en")).toBe("en");
      expect(LanguageWithAutoSchema.parse("auto")).toBe("auto");
    });

    it("should reject invalid codes", () => {
      expect(() => LanguageWithAutoSchema.parse("invalid")).toThrow();
    });
  });
});
