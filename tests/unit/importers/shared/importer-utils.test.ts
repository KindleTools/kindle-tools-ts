import { describe, expect, it } from "vitest";
import { importSuccess, importUnknownError } from "#errors";
import {
  createErrorImport,
  createSuccessImport,
  generateImportId,
  parseLocationString,
} from "#importers/shared/importer-utils.js";

describe("Importer Utils", () => {
  describe("parseLocationString", () => {
    it("should parse single number", () => {
      const loc = parseLocationString("123");
      expect(loc).toEqual({ raw: "123", start: 123, end: null });
    });

    it("should parse range", () => {
      const loc = parseLocationString("123-456");
      expect(loc).toEqual({ raw: "123-456", start: 123, end: 456 });
    });

    it("should handle empty/missing input", () => {
      expect(parseLocationString("")).toEqual({ raw: "", start: 0, end: null });
      expect(parseLocationString(undefined)).toEqual({ raw: "", start: 0, end: null });
      expect(parseLocationString(null)).toEqual({ raw: "", start: 0, end: null });
    });

    it("should handle malformed strings", () => {
      // "abc" -> start NaN -> 0
      expect(parseLocationString("abc")).toEqual({ raw: "abc", start: 0, end: null });
      // "123-abc" -> start 123, end NaN -> null?
      // parseInt("abc") is NaN. null? code: end = ... ? parseInt : null.
      // If parts[1] exists ("abc"), parseInt is NaN.
      // NaN is stored in end? Type is `number | null`. NaN is number.
      // Expectation check.

      // "start = parseInt(...) || 0". If NaN -> 0.
      const loc = parseLocationString("123-abc");
      expect(loc.start).toBe(123);
      expect(loc.end).toBeNaN();
    });
  });

  describe("generateImportId", () => {
    it("should generate deterministic ids based on content and index", () => {
      const id1 = generateImportId("some content", 1);
      const id2 = generateImportId("some content", 2);
      const id3 = generateImportId("some content", 1); // Same as id1

      expect(id1).not.toBe(id2);
      expect(id1).toBe(id3); // Deterministic: same input = same output
      expect(id1).toContain("imp_");
    });

    it("should generate different ids for different content", () => {
      const id1 = generateImportId("content A", 1);
      const id2 = generateImportId("content B", 1);

      expect(id1).not.toBe(id2);
    });
  });

  describe("Result Wrappers", () => {
    it("should create success result", () => {
      const res = createSuccessImport([]);
      expect(res.isOk()).toBe(true);
    });

    it("should create error result", () => {
      const res = createErrorImport(new Error("fail"));
      expect(res.isErr()).toBe(true);
    });
  });
});
