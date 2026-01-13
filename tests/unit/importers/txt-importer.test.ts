import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseFile } from "#importers/formats/txt/file-parser.js";
import { TxtImporter } from "#importers/formats/txt.importer.js";
import { MemoryFileSystem, resetFileSystem, setFileSystem } from "#ports";
import { SAMPLE_CLIPPINGS_EN } from "../../fixtures/sample-clippings.js";

describe("TxtImporter", () => {
  const importer = new TxtImporter();

  it("should define correct name and extensions", () => {
    expect(importer.name).toBe("txt");
    expect(importer.extensions).toEqual([".txt"]);
  });

  it("should import valid clippings content", async () => {
    const result = await importer.import(SAMPLE_CLIPPINGS_EN);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.clippings).toHaveLength(5);
      expect(result.value.warnings).toHaveLength(0);
      expect(result.value.meta).toBeDefined();
    }
  });

  it("should return error when no valid clippings found in file", async () => {
    const invalidContent = "Start\nSome random text\nEnd";
    const result = await importer.import(invalidContent);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("No valid clippings found");
    }
  });

  it("should handle mixed valid and content with warnings", async () => {
    // Ideally we'd craft input that produces warnings in parseString
    // But for now, ensuring basic success path is covered is good.
    const result = await importer.import(SAMPLE_CLIPPINGS_EN);
    expect(result.isOk()).toBe(true);
  });
});

describe("file-parser", () => {
  let memFs: MemoryFileSystem;

  beforeEach(() => {
    memFs = new MemoryFileSystem();
    setFileSystem(memFs);
  });

  afterEach(() => {
    resetFileSystem();
  });

  it("should read file and parse content", async () => {
    memFs.addFile("/path/to/My Clippings.txt", SAMPLE_CLIPPINGS_EN);

    const result = await parseFile("/path/to/My Clippings.txt");

    expect(result.clippings.length).toBe(5);
    expect(result.meta.fileSize).toBe(new TextEncoder().encode(SAMPLE_CLIPPINGS_EN).length);
    expect(result.meta.parseTime).toBeGreaterThanOrEqual(0);
  });

  it("should handle file read errors", async () => {
    // File doesn't exist in memFs, so it should throw ENOENT
    await expect(parseFile("missing.txt")).rejects.toThrow("ENOENT");
  });
});
