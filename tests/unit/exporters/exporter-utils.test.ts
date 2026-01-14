import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "../../../src/exporters/shared/exporter-utils.js";

describe("sanitizeFilename", () => {
  it("should remove invalid characters", () => {
    const input = 'File: "Name" *With* <Invalid> |Chars?';
    const expected = "File- -Name- -With- -Invalid- -Chars-";
    // Current implementation checks
    expect(sanitizeFilename(input)).toBe(expected);
  });

  it("should trim whitespace", () => {
    expect(sanitizeFilename("  test  ")).toBe("test");
  });

  it("should replace multiple spaces with single space", () => {
    expect(sanitizeFilename("file   name")).toBe("file name");
  });

  it("should prefix Windows reserved names with underscore", () => {
    const reserved = ["CON", "PRN", "AUX", "NUL", "COM1", "LPT1"];

    // Windows reserved names should be prefixed with _
    reserved.forEach((name) => {
      expect(sanitizeFilename(name)).toBe(`_${name}`);
    });
  });

  it("should handle Windows reserved names with extensions", () => {
    expect(sanitizeFilename("CON.txt")).toBe("_CON.txt");
    expect(sanitizeFilename("NUL.md")).toBe("_NUL.md");
  });

  it("should be case-insensitive for Windows reserved names", () => {
    expect(sanitizeFilename("con")).toBe("_con");
    expect(sanitizeFilename("Con")).toBe("_Con");
    expect(sanitizeFilename("nul")).toBe("_nul");
  });

  it("should not prefix similar but valid names", () => {
    // "CONSOLE" is not reserved, only "CON"
    expect(sanitizeFilename("CONSOLE")).toBe("CONSOLE");
    expect(sanitizeFilename("AUXILIARY")).toBe("AUXILIARY");
  });

  // New tests for COM0/LPT0
  it("should handle COM0 and LPT0 as reserved names", () => {
    expect(sanitizeFilename("COM0")).toBe("_COM0");
    expect(sanitizeFilename("LPT0")).toBe("_LPT0");
    expect(sanitizeFilename("com0.txt")).toBe("_com0.txt");
  });

  // Control characters (ASCII 0-31)
  it("should replace control characters with dash", () => {
    expect(sanitizeFilename("hello\x00world")).toBe("hello-world");
    expect(sanitizeFilename("test\x1ffile")).toBe("test-file");
    expect(sanitizeFilename("tab\there")).toBe("tab-here");
  });

  // Trailing dots
  it("should remove trailing dots", () => {
    expect(sanitizeFilename("file...")).toBe("file");
    expect(sanitizeFilename("document.")).toBe("document");
    expect(sanitizeFilename("test.txt.")).toBe("test.txt");
  });

  // Empty result handling
  it("should return underscore for empty or all-dots input", () => {
    expect(sanitizeFilename("")).toBe("_");
    expect(sanitizeFilename("...")).toBe("_"); // All dots are stripped as trailing
    expect(sanitizeFilename("   ")).toBe("_"); // All spaces trim to empty
  });

  it("should convert invalid chars to dashes (not remove them)", () => {
    // ::: becomes --- because : is replaced with -
    expect(sanitizeFilename(":::")).toBe("---");
  });

  // Cross-platform: Linux/macOS path separators
  it("should handle forward slashes (Linux/macOS path separator)", () => {
    expect(sanitizeFilename("path/to/file")).toBe("path-to-file");
  });

  it("should handle backslashes (Windows path separator)", () => {
    expect(sanitizeFilename("path\\to\\file")).toBe("path-to-file");
  });

  // Combined edge cases
  it("should handle complex filenames with multiple issues", () => {
    const input = '  CON: "Test" file...\x00  ';
    // Trims, removes control char (becomes -), replaces invalid chars
    // The null char at the end becomes -, so dots are not trailing
    // Base name "CON-" is NOT reserved (contains dash)
    expect(sanitizeFilename(input)).toBe("CON- -Test- file...-");
  });

  // Length limiting
  it("should respect maxLength parameter", () => {
    const longName = "a".repeat(200);
    expect(sanitizeFilename(longName, 50).length).toBe(50);
  });
});
