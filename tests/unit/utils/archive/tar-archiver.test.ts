import { describe, expect, it } from "vitest";
import { TarArchiver } from "#utils/archive/tar-archiver.js";

describe("TarArchiver", () => {
  it("should add files and finalize to a TAR archive", async () => {
    const archiver = new TarArchiver();
    archiver.addFile("test.txt", "Hello, World!");
    archiver.addFile("folder/nested.md", "# Title\n\nContent here");

    const result = await archiver.finalize();

    // TAR archives have a specific structure
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);

    // TAR headers are 512 bytes, content is padded to 512-byte blocks
    // Minimum size: 2 headers (1024) + padded content + 1024 end marker
    expect(result.length).toBeGreaterThanOrEqual(1024);
  });

  it("should handle empty archive", async () => {
    const archiver = new TarArchiver();
    const result = await archiver.finalize();

    // Empty TAR still has end-of-archive marker (1024 bytes of zeros)
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(1024);
  });

  it("should handle binary content", async () => {
    const archiver = new TarArchiver();
    const binaryContent = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe]);
    archiver.addFile("binary.bin", binaryContent);

    const result = await archiver.finalize();

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("addDirectory should not throw (no-op for TAR)", () => {
    const archiver = new TarArchiver();
    // addDirectory is a no-op for TAR - directories are implicit in paths
    expect(() => archiver.addDirectory("folder")).not.toThrow();
  });
});
