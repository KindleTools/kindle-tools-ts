/**
 * Tests for error handling utilities.
 */

import { describe, expect, it } from "vitest";
import type { AppError, ExportError, ImportError } from "#errors";
import { formatErrorDetail, formatUserMessage, getErrorCode } from "#errors";

describe("Error Formatting", () => {
  describe("formatUserMessage", () => {
    it("should format IMPORT_PARSE_ERROR with line number", () => {
      const error: ImportError = {
        code: "IMPORT_PARSE_ERROR",
        message: "Unexpected token",
        line: 42,
      };

      const message = formatUserMessage(error);

      expect(message).toContain("Could not parse file");
      expect(message).toContain("Unexpected token");
      expect(message).toContain("line 42");
    });

    it("should format IMPORT_EMPTY_FILE", () => {
      const error: ImportError = {
        code: "IMPORT_EMPTY_FILE",
        message: "File is empty",
      };

      const message = formatUserMessage(error);

      expect(message).toContain("empty");
      expect(message).toContain("no valid content");
    });

    it("should format IMPORT_INVALID_FORMAT", () => {
      const error: ImportError = {
        code: "IMPORT_INVALID_FORMAT",
        message: "Not a valid JSON",
      };

      const message = formatUserMessage(error);

      expect(message).toContain("Invalid file format");
      expect(message).toContain("Not a valid JSON");
    });

    it("should format EXPORT_UNKNOWN_FORMAT with format name", () => {
      const error: ExportError = {
        code: "EXPORT_UNKNOWN_FORMAT",
        message: "Unknown format",
        format: "xyz",
      };

      const message = formatUserMessage(error);

      expect(message).toContain("Unsupported export format");
      expect(message).toContain("xyz");
    });

    it("should format EXPORT_WRITE_FAILED with path", () => {
      const error: ExportError = {
        code: "EXPORT_WRITE_FAILED",
        message: "ENOENT",
        path: "/tmp/output.json",
      };

      const message = formatUserMessage(error);

      expect(message).toContain("Could not write to");
      expect(message).toContain("/tmp/output.json");
    });

    it("should format EXPORT_NO_CLIPPINGS", () => {
      const error: ExportError = {
        code: "EXPORT_NO_CLIPPINGS",
        message: "No data",
      };

      const message = formatUserMessage(error);

      expect(message).toContain("No clippings to export");
    });

    it("should fallback to message for unknown error types", () => {
      const error: AppError = {
        code: "UNKNOWN",
        message: "Something went wrong",
      };

      const message = formatUserMessage(error);

      expect(message).toBe("Something went wrong");
    });
  });

  describe("formatErrorDetail", () => {
    it("should include code and message", () => {
      const error: ImportError = {
        code: "IMPORT_PARSE_ERROR",
        message: "Syntax error",
      };

      const detail = formatErrorDetail(error);

      expect(detail).toBe("[IMPORT_PARSE_ERROR] Syntax error");
    });
  });

  describe("getErrorCode", () => {
    it("should return the error code", () => {
      const error: ExportError = {
        code: "EXPORT_TEMPLATE_ERROR",
        message: "Template failed",
      };

      expect(getErrorCode(error)).toBe("EXPORT_TEMPLATE_ERROR");
    });
  });
});
