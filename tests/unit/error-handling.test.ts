import { describe, expect, it } from "vitest";
import { ConfigErrorCodes } from "#errors/codes.js";
import { formatUserMessage } from "#errors/formatting.js";
import {
  exportInvalidOptions,
  exportNoClippings,
  exportSuccess,
  exportTemplateError,
  exportUnknownError,
  exportUnknownFormat,
  exportWriteFailed,
  importEmptyFile,
  importInvalidFormat,
  importParseError,
  importUnknownError,
  toAppError,
  zodIssuesToValidationIssues,
} from "#errors/result.js";

describe("error-handling", () => {
  describe("formatting", () => {
    it("should format import parse error", () => {
      const err = importParseError("Some error", { line: 5 })._unsafeUnwrapErr();
      expect(formatUserMessage(err)).toContain("Could not parse file: Some error (line 5)");
    });

    it("should format import empty file error", () => {
      const err = importEmptyFile()._unsafeUnwrapErr();
      expect(formatUserMessage(err)).toContain("The file appears to be empty");
    });

    it("should format config error", () => {
      const err = { code: ConfigErrorCodes.NOT_FOUND, message: "Missing", path: "config.json" };
      expect(formatUserMessage(err)).toContain('Configuration file not found at "config.json"');
    });

    // Add more specific formatting tests as needed
  });

  describe("result factories", () => {
    // Import results
    it("should create importParseError", () => {
      const res = importParseError("msg", { path: "p" });
      expect(res.isErr()).toBe(true);
      const err = res._unsafeUnwrapErr() as any;
      expect(err.code).toBe("IMPORT_PARSE_ERROR");
      expect(err.path).toBe("p");
    });

    it("should create importEmptyFile", () => {
      const res = importEmptyFile("msg", ["warn"]);
      const err = res._unsafeUnwrapErr() as any;
      expect(err.code).toBe("IMPORT_EMPTY_FILE");
      expect(err.warnings).toEqual(["warn"]);
    });

    it("should create importInvalidFormat", () => {
      const res = importInvalidFormat("msg", { warnings: ["warn"] });
      const err = res._unsafeUnwrapErr() as any;
      expect(err.code).toBe("IMPORT_INVALID_FORMAT");
      expect(err.warnings).toEqual(["warn"]);
    });

    it("should create importUnknownError", () => {
      const res = importUnknownError(new Error("oops"), ["warn"]);
      const err = res._unsafeUnwrapErr() as any;
      expect(err.code).toBe("IMPORT_UNKNOWN");
      expect(err.cause).toBeInstanceOf(Error);
    });

    // Export results
    it("should create exportSuccess", () => {
      const res = exportSuccess("content");
      expect(res.isOk()).toBe(true);
      expect(res._unsafeUnwrap().output).toBe("content");
    });

    it("should create exportUnknownFormat", () => {
      const res = exportUnknownFormat("fmt");
      const err = res._unsafeUnwrapErr() as any;
      expect(err.code).toBe("EXPORT_UNKNOWN_FORMAT");
      expect(err.format).toBe("fmt");
    });

    it("should create exportInvalidOptions", () => {
      const res = exportInvalidOptions("msg");
      expect(res._unsafeUnwrapErr().code).toBe("EXPORT_INVALID_OPTIONS");
    });

    it("should create exportNoClippings", () => {
      const res = exportNoClippings();
      expect(res._unsafeUnwrapErr().code).toBe("EXPORT_NO_CLIPPINGS");
    });

    it("should create exportTemplateError", () => {
      const res = exportTemplateError("msg", { template: "tpl" });
      const err = res._unsafeUnwrapErr() as any;
      expect(err.code).toBe("EXPORT_TEMPLATE_ERROR");
      expect(err.template).toBe("tpl");
    });

    it("should create exportWriteFailed", () => {
      const res = exportWriteFailed("msg", { path: "p" });
      const err = res._unsafeUnwrapErr() as any;
      expect(err.code).toBe("EXPORT_WRITE_FAILED");
      expect(err.path).toBe("p");
    });

    it("should create exportUnknownError", () => {
      const res = exportUnknownError("oops");
      expect(res._unsafeUnwrapErr().code).toBe("EXPORT_UNKNOWN");
    });
  });

  describe("utilities", () => {
    it("should convert zod issues", () => {
      const zodIssues = [{ path: ["a", "b"], message: "msg", code: "custom" }];
      const issues = zodIssuesToValidationIssues(zodIssues);
      expect(issues).toHaveLength(1);
      expect(issues[0].path).toEqual(["a", "b"]);
    });

    it("should convert to AppError", () => {
      const err = new Error("msg");
      const appErr = toAppError(err);
      expect(appErr.code).toBe("UNKNOWN");
      expect(appErr.message).toBe("msg");
    });

    it("should return existing AppError", () => {
      const existing = { code: "EXISTING", message: "msg" };
      expect(toAppError(existing)).toBe(existing);
    });
  });
});
