import { describe, expect, it } from "vitest";
import {
  isConfigError,
  isExportError,
  isFileSystemError,
  isImportError,
  isValidationError,
} from "#errors/codes.js";
import { formatErrorDetail, formatUserMessage, getErrorCode } from "#errors/formatting.js";
import type { AppError } from "#errors/types.js";
import { AppException, hasCause, hasIssues, hasWarnings } from "#errors/types.js";

describe("error codes", () => {
  describe("helpers", () => {
    it("should identify import errors", () => {
      expect(isImportError("IMPORT_PARSE_ERROR")).toBe(true);
      expect(isImportError("EXPORT_UNKNOWN")).toBe(false);
    });

    it("should identify export errors", () => {
      expect(isExportError("EXPORT_WRITE_FAILED")).toBe(true);
      expect(isExportError("IMPORT_UNKNOWN")).toBe(false);
    });

    it("should identify config errors", () => {
      expect(isConfigError("CONFIG_NOT_FOUND")).toBe(true);
      expect(isConfigError("IMPORT_UNKNOWN")).toBe(false);
    });

    it("should identify validation errors", () => {
      expect(isValidationError("VALIDATION_SCHEMA")).toBe(true);
      expect(isValidationError("IMPORT_UNKNOWN")).toBe(false);
    });

    it("should identify fs errors", () => {
      expect(isFileSystemError("FS_NOT_FOUND")).toBe(true);
      expect(isFileSystemError("IMPORT_UNKNOWN")).toBe(false);
    });
  });
});

describe("error formatting", () => {
  describe("formatUserMessage", () => {
    it("should format import errors", () => {
      expect(
        formatUserMessage({ code: "IMPORT_PARSE_ERROR", message: "Bad JSON", line: 5 }),
      ).toContain("Bad JSON (line 5)");
      expect(formatUserMessage({ code: "IMPORT_EMPTY_FILE", message: "" })).toContain("empty");
      expect(formatUserMessage({ code: "IMPORT_INVALID_FORMAT", message: "Wrong ext" })).toContain(
        "Invalid file format: Wrong ext",
      );
      expect(formatUserMessage({ code: "IMPORT_UNKNOWN", message: "Panic" })).toContain(
        "unexpected error",
      );
    });

    it("should format export errors", () => {
      expect(
        formatUserMessage({ code: "EXPORT_UNKNOWN_FORMAT", message: "Bad", format: "pdf" }),
      ).toContain('Unsupported export format: "pdf"');
      expect(
        formatUserMessage({ code: "EXPORT_WRITE_FAILED", message: "Locked", path: "out.txt" }),
      ).toContain("Could not write to out.txt");
      expect(formatUserMessage({ code: "EXPORT_INVALID_OPTIONS", message: "Bad opt" })).toContain(
        "Invalid export options",
      );
      expect(formatUserMessage({ code: "EXPORT_NO_CLIPPINGS", message: "" })).toContain(
        "No clippings",
      );
      expect(
        formatUserMessage({
          code: "EXPORT_TEMPLATE_ERROR",
          message: "Missing var",
          template: "custom",
        }),
      ).toContain('Template error in "custom"');
      expect(formatUserMessage({ code: "EXPORT_UNKNOWN", message: "Panic" })).toContain(
        "unexpected error",
      );
    });

    it("should format config errors", () => {
      expect(
        formatUserMessage({ code: "CONFIG_NOT_FOUND", message: "Missing", path: "conf.json" }),
      ).toContain('Configuration file not found at "conf.json"');
      expect(
        formatUserMessage({ code: "CONFIG_INVALID", message: "Bad schema", path: "conf.json" }),
      ).toContain('Invalid configuration in "conf.json"');
      expect(
        formatUserMessage({ code: "CONFIG_PARSE_ERROR", message: "Bad JSON", path: "conf.json" }),
      ).toContain('Could not parse configuration from "conf.json"');
    });

    it("should format validation errors", () => {
      expect(
        formatUserMessage({
          code: "VALIDATION_SCHEMA",
          message: "Invalid type",
          schema: "Clipping",
        }),
      ).toContain('Validation failed for "Clipping"');
      expect(formatUserMessage({ code: "VALIDATION_ARGS", message: "Missing arg" })).toContain(
        "Invalid arguments",
      );
      expect(
        formatUserMessage({
          code: "VALIDATION_REQUIRED",
          message: "Missing field",
          field: "title",
        }),
      ).toContain('Required "title" is missing');
    });

    it("should format fs errors", () => {
      expect(
        formatUserMessage({ code: "FS_NOT_FOUND", message: "Missing", path: "file.txt" }),
      ).toContain('File not found: "file.txt"');
      expect(
        formatUserMessage({ code: "FS_PERMISSION_DENIED", message: "No access", path: "file.txt" }),
      ).toContain('Permission denied for "file.txt"');
      expect(
        formatUserMessage({ code: "FS_READ_ERROR", message: "Read fail", path: "file.txt" }),
      ).toContain("Could not read file.txt");
      expect(
        formatUserMessage({ code: "FS_WRITE_ERROR", message: "Write fail", path: "file.txt" }),
      ).toContain("Could not write to file.txt");
    });

    it("should format unknown errors", () => {
      expect(formatUserMessage({ code: "UNKNOWN", message: "Something happened" })).toBe(
        "Something happened",
      );
    });
  });

  describe("formatErrorDetail", () => {
    it("should include code and message", () => {
      expect(formatErrorDetail({ code: "IMPORT_PARSE_ERROR", message: "Details" })).toBe(
        "[IMPORT_PARSE_ERROR] Details",
      );
    });
  });

  describe("getErrorCode", () => {
    it("should return code", () => {
      expect(getErrorCode({ code: "IMPORT_PARSE_ERROR", message: "Details" })).toBe(
        "IMPORT_PARSE_ERROR",
      );
    });
  });
});

describe("error types", () => {
  describe("type guards", () => {
    it("should check for cause", () => {
      expect(hasCause({ code: "UNKNOWN", message: "err", cause: new Error() })).toBe(true);
      expect(hasCause({ code: "UNKNOWN", message: "err" })).toBe(false);
    });

    it("should check for issues", () => {
      const issues = [{ path: [], message: "", code: "" }];
      expect(hasIssues({ code: "VALIDATION_SCHEMA", message: "err", issues })).toBe(true);
      expect(hasIssues({ code: "UNKNOWN", message: "err" })).toBe(false);
    });

    it("should check for warnings", () => {
      expect(hasWarnings({ code: "IMPORT_PARSE_ERROR", message: "err", warnings: ["warn"] })).toBe(
        true,
      );
      expect(hasWarnings({ code: "UNKNOWN", message: "err" })).toBe(false);
    });
  });

  describe("AppException", () => {
    it("should wrap AppError", () => {
      const error: AppError = { code: "CONFIG_INVALID", message: "Invalid config" };
      const exception = new AppException(error);

      expect(exception).toBeInstanceOf(Error);
      expect(exception.message).toBe("Invalid config");
      expect(exception.name).toBe("AppException");
      expect(exception.appError).toBe(error);
      expect(exception.code).toBe("CONFIG_INVALID");
    });
  });
});
