import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createJexArchive, createTarArchive } from "#utils/fs/tar.js";
import { createZipArchive } from "#utils/fs/zip.js";

describe("fs", () => {
  describe("tar", () => {
    it("should create a valid USTAR header", () => {
      const entries = [{ name: "test.txt", content: "hello world" }];
      const tar = createTarArchive(entries);

      // Header (512) + Content (padded to 512) + 2x End blocks (1024)
      // content "hello world" is < 512, so it occupies 512 bytes with padding.
      // Total = 512 + 512 + 1024 = 2048
      expect(tar.length).toBe(2048);

      // Check file name at offset 0
      const name = new TextDecoder().decode(tar.subarray(0, 8));
      expect(name.startsWith("test.txt")).toBe(true);

      // Check signature "ustar" at 257
      const signature = new TextDecoder().decode(tar.subarray(257, 262));
      expect(signature).toBe("ustar");
    });

    it("should handle multiple files and padding", () => {
      const entries = [
        { name: "test1.txt", content: "a" },
        { name: "test2.txt", content: "b" },
      ];
      const tar = createTarArchive(entries);

      // 512 header + 512 content (padded) -> for test1
      // 512 header + 512 content (padded) -> for test2
      // + 2 * 512 end
      // Total = 1024 + 1024 + 1024 = 3072
      expect(tar.length).toBe(3072);
    });

    it("should create JEX archive wrapper", () => {
      const files = { "test.md": "content" };
      const tar = createJexArchive(files);
      expect(tar.length).toBeGreaterThan(0);
    });

    it("should handle buffer content correctly", () => {
      const entries = [{ name: "test.bin", content: new Uint8Array([1, 2, 3]) }];
      const tar = createTarArchive(entries);
      expect(tar.length).toBeGreaterThan(0);
    });
  });

  describe("zip", () => {
    it("should create a zip archive", async () => {
      const entries = [{ name: "test.txt", content: "hello" }];
      const zipBuffer = await createZipArchive(entries);

      expect(zipBuffer).toBeInstanceOf(Uint8Array);
      expect(zipBuffer.length).toBeGreaterThan(0);

      // Verification via JSZip load
      const loaded = await JSZip.loadAsync(zipBuffer);
      const fileContent = await loaded.file("test.txt")?.async("string");
      expect(fileContent).toBe("hello");
    });
  });
});
