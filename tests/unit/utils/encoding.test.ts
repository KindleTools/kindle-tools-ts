import { describe, expect, it } from "vitest";
import { decodeWithFallback, detectEncoding } from "#utils/text/encoding.js";

describe("encoding", () => {
  describe("detectEncoding", () => {
    it("should detect UTF-8 BOM", () => {
      const buffer = Buffer.from([0xef, 0xbb, 0xbf, 0x61]); // BOM + 'a'
      expect(detectEncoding(buffer)).toBe("utf-8");
    });

    it("should detect UTF-16 LE BOM", () => {
      const buffer = Buffer.from([0xff, 0xfe, 0x61, 0x00]); // BOM + 'a'
      expect(detectEncoding(buffer)).toBe("utf-16le");
    });

    it("should return utf16le for UTF-16 BE BOM (per current implementation)", () => {
      const buffer = Buffer.from([0xfe, 0xff, 0x00, 0x61]);
      expect(detectEncoding(buffer)).toBe("utf-16le");
    });

    it("should default to utf-8", () => {
      const buffer = Buffer.from("hello world");
      expect(detectEncoding(buffer)).toBe("utf-8");
    });
  });

  describe("decodeWithFallback", () => {
    it("should decode with primary encoding if valid", () => {
      const buffer = Buffer.from("hello world");
      expect(decodeWithFallback(buffer, "utf-8")).toBe("hello world");
    });

    it("should fallback to latin1 if primary encoding results in replacement characters", () => {
      const buffer = Buffer.from([0xe9]); // é in Latin-1, invalid in UTF-8
      const decoded = decodeWithFallback(buffer, "utf-8");
      expect(decoded).toBe("é");
    });
  });
});
