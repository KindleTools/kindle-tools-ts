import JSZip from "jszip";
import { ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { BaseExporter } from "../../../src/exporters/shared/base-exporter.js";
import type { Clipping } from "../../../src/types/clipping.js";

// Mock Exporter
class MockExporter extends BaseExporter {
  name = "mock-exporter";
  extension = ".txt";

  protected async doExport(clippings: Clipping[], options: any) {
    return this.success("Mock Content", [
      { path: "file1.txt", content: "Content 1" },
      { path: "file2.txt", content: "Content 2" },
    ]);
  }
}

class SingleFileMockExporter extends BaseExporter {
  name = "single-exporter";
  extension = ".txt";

  protected async doExport(clippings: Clipping[], options: any) {
    // correctly returns output without files array
    return this.success("Single Content");
  }
}

describe("BaseExporter Archiving", () => {
  it("should wrap multi-file export in zip", async () => {
    const exporter = new MockExporter();
    const result = await exporter.export([], { archive: "zip" });

    if (result.isErr()) throw result.error;

    expect(result.value.files).toHaveLength(1);
    expect(result.value.files![0].path).toBe("export.zip");

    const zipContent = result.value.output;
    const loadedZip = await JSZip.loadAsync(zipContent);

    expect(loadedZip.file("file1.txt")).not.toBeNull();
    expect(loadedZip.file("file2.txt")).not.toBeNull();
  });

  it("should wrap single-file export in zip", async () => {
    const exporter = new SingleFileMockExporter();
    const result = await exporter.export([], { archive: "zip" });

    if (result.isErr()) throw result.error;

    expect(result.value.files).toHaveLength(1);
    const zipContent = result.value.output;
    const loadedZip = await JSZip.loadAsync(zipContent);

    // Should create a file with default name based on exporter name
    expect(loadedZip.file("single-exporter-export.txt")).not.toBeNull();
    expect(await loadedZip.file("single-exporter-export.txt")?.async("string")).toBe(
      "Single Content",
    );
  });

  it("should attempt to use custom title for archive name", async () => {
    const exporter = new MockExporter();
    const result = await exporter.export([], { archive: "zip", title: "My Archive" });

    if (result.isErr()) throw result.error;

    // Filename in the files array should reflect the title
    expect(result.value.files![0].path).toBe("My Archive.zip");
  });
});
