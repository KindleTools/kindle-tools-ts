import { describe, expect, it } from "vitest";
import { ZodError, type ZodIssue } from "zod";
import {
  formatZodError,
  formatZodErrorSummary,
  getErrorMessage,
  toError,
} from "#utils/system/errors.js";

describe("errors details", () => {
  describe("formatZodError", () => {
    it("should format issues into a list", () => {
      const issues: ZodIssue[] = [
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["field1"],
          message: "Invalid type",
        },
        { code: "custom", path: ["nested", "field2"], message: "Custom message" },
      ];
      const error = new ZodError(issues);

      const result = formatZodError(error);

      expect(result).toContain("  - field1: Invalid type");
      expect(result).toContain("  - nested.field2: Custom message");
    });

    it("should handle root path", () => {
      const issues: ZodIssue[] = [{ code: "custom", path: [], message: "Root error" }];
      const error = new ZodError(issues);

      const result = formatZodError(error);

      expect(result).toContain("  - (root): Root error");
    });

    it("should respect options", () => {
      const issues: ZodIssue[] = [{ code: "custom", path: ["a"], message: "error" }];
      const error = new ZodError(issues);

      const result = formatZodError(error, { prefix: "* ", indent: "\t" });

      expect(result).toBe("\t* a: error");
    });
  });

  describe("formatZodErrorSummary", () => {
    it("should format single error", () => {
      const error = new ZodError([{ code: "custom", path: ["a"], message: "error" }]);
      expect(formatZodErrorSummary(error)).toBe("a: error");
    });

    it("should handle multiple errors with count", () => {
      const error = new ZodError([
        { code: "custom", path: ["a"], message: "error 1" },
        { code: "custom", path: ["b"], message: "error 2" },
        { code: "custom", path: ["c"], message: "error 3" },
      ]);
      expect(formatZodErrorSummary(error)).toBe("a: error 1 (+2 more)");
    });

    it("should handle empty errors", () => {
      const error = new ZodError([]);
      expect(formatZodErrorSummary(error)).toBe("Unknown validation error");
    });
  });

  describe("toError", () => {
    it("should return Error instance as is", () => {
      const err = new Error("test");
      expect(toError(err)).toBe(err);
    });

    it("should wrap string in Error", () => {
      const err = toError("string error");
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("string error");
    });

    it("should extract message from object", () => {
      const err = toError({ message: "msg" });
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("msg");
    });

    it("should stringify other objects", () => {
      const err = toError(123);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("123");
    });

    it("should handle null", () => {
      const err = toError(null);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("null");
    });
  });

  describe("getErrorMessage", () => {
    it("should return message from Error", () => {
      expect(getErrorMessage(new Error("test"))).toBe("test");
    });
  });
});
