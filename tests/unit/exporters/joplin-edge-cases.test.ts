import { describe, expect, it } from "vitest";
import { JoplinExporter } from "#exporters/formats/joplin.exporter.js";
import { createClipping } from "../../fixtures/clipping";

describe("JoplinExporter Edge Cases", () => {
  const exporter = new JoplinExporter();
  const defaultOptions = {
    template: "joplin",
    outputDir: "out",
    folderStructure: "by-author" as const,
  };

  it("should handle missing optional fields and defaults", async () => {
    const clipping = createClipping({
      author: "Author A",
      page: undefined,
      date: undefined, // Will default to Date.now()
      tags: undefined,
    });

    // Test non-default options
    const resultWrap = await exporter.export([clipping], {
      ...defaultOptions,
      notebookName: "My Notebook",
      estimatePages: false, // Explicitly false
      creator: "Me",
      geoLocation: { latitude: 10, longitude: 20, altitude: 5 },
      includeClippingTags: true,
    });

    expect(resultWrap.isOk()).toBe(true);
    if (resultWrap.isOk()) {
      const files = resultWrap.value.files || [];

      // Check for note file
      // Note ID hash
      const noteFile = files.find(
        (f) => typeof f.content === "string" && f.content.includes("type_: 1"),
      );
      expect(noteFile).toBeDefined();
      const noteContent = noteFile?.content as string;

      // Check metadata
      expect(noteContent).toContain("latitude: 10.00000000");
      expect(noteContent).toContain("author: Me");

      // Page estimation false, and page is missing -> Title should NOT have page ref
      expect(noteContent).not.toMatch(/^\d+/);

      // Date was undefined, so created_time should be roughy now
      // We can't strictly assert now, but it shouldn't be empty or 0 if logic uses Date.now()
    }
  });

  it("should handle null first clipping (empty array is handled by base)", async () => {
    // MultiFileExporter handles empty array before processBook.
    // But internal processBook check: if (!first) return [];
    // BaseExporter.export checks validation then calls doExport.
    // If we pass empty array, BaseExporter might catch it (if logic exists),
    // OR MultiFileExporter.doExport loops empty array.

    // Let's verify empty export returns valid result "No clippings" or just empty files?
    // BaseExporter implementation: "if (clippings.length === 0) return exportNoClippings()" via validation?
    // Actually BaseExporter checks? No, let's check validation.

    const resultWrap = await exporter.export([], defaultOptions);
    // Should return OK with just preamble (root notebook)
    expect(resultWrap.isOk()).toBe(true);
    if (resultWrap.isOk()) {
      // Preamble creates root notebook. Tags are 0 if no clippings.
      // So at least 1 file.
      expect(resultWrap.value.files?.length).toBeGreaterThan(0);
    }
  });

  it("should generate consistent IDs for accented tags regardless of Unicode form", async () => {
    // Tag in NFC form (composed) vs NFD form (decomposed)
    const nfcTag = "CREACIÓN".normalize("NFC");
    const nfdTag = "CREACIÓN".normalize("NFD");

    const clipping1 = createClipping({ tags: [nfcTag] });
    const clipping2 = createClipping({ tags: [nfdTag] });

    const result1 = await exporter.export([clipping1], {
      ...defaultOptions,
      includeClippingTags: true,
    });
    const result2 = await exporter.export([clipping2], {
      ...defaultOptions,
      includeClippingTags: true,
    });

    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);

    if (result1.isOk() && result2.isOk()) {
      // Find tag files (type_: 5)
      const tagFile1 = result1.value.files?.find(
        (f) => typeof f.content === "string" && f.content.includes("type_: 5"),
      );
      const tagFile2 = result2.value.files?.find(
        (f) => typeof f.content === "string" && f.content.includes("type_: 5"),
      );

      expect(tagFile1).toBeDefined();
      expect(tagFile2).toBeDefined();
      // Both should have the same path (ID) since they're normalized to NFC
      expect(tagFile1?.path).toBe(tagFile2?.path);
    }
  });
});
