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
});
