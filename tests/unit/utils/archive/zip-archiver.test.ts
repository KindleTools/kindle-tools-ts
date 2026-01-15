import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { ZipArchiver } from "../../../../src/utils/archive/zip-archiver.js";

describe("ZipArchiver", () => {
  it("should create a valid zip file", async () => {
    const archiver = new ZipArchiver();
    archiver.addFile("test.txt", "Hello World");
    archiver.addFile("folder/nested.txt", "Nested Content");

    const zipContent = await archiver.finalize();
    expect(zipContent).toBeInstanceOf(Uint8Array);
    expect(zipContent.length).toBeGreaterThan(0);

    // Verify content using JSZip
    const loadedZip = await JSZip.loadAsync(zipContent);
    const file1 = loadedZip.file("test.txt");
    const file2 = loadedZip.file("folder/nested.txt");

    expect(file1).not.toBeNull();
    expect(await file1?.async("string")).toBe("Hello World");

    expect(file2).not.toBeNull();
    expect(await file2?.async("string")).toBe("Nested Content");
  });

  it("should handle empty directories", async () => {
    const archiver = new ZipArchiver();
    archiver.addDirectory("empty_folder");

    const zipContent = await archiver.finalize();
    const loadedZip = await JSZip.loadAsync(zipContent);

    const folder = loadedZip.folder("empty_folder");
    expect(folder).not.toBeNull();
  });
});
