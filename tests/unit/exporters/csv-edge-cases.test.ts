import { describe, expect, it } from "vitest";
import { CsvExporter } from "#exporters/formats/csv.exporter.js";
import { createClipping } from "../../fixtures/clipping";

describe("CsvExporter Edge Cases", () => {
  const exporter = new CsvExporter();
  const defaultOptions = {
    template: "default",
    outputDir: "out",
  };

  it("should handle missing optional fields", async () => {
    const clipping = createClipping({
      id: "1",
      title: "Book",
      content: "Content",
      author: undefined, // Missing author
      page: undefined, // Missing page
      date: undefined, // Missing date
      tags: undefined, // Missing tags
    });

    const resultWrap = await exporter.export([clipping], {
      ...defaultOptions,
      includeClippingTags: true,
    });

    expect(resultWrap.isOk()).toBe(true);
    if (resultWrap.isOk()) {
      const output = resultWrap.value.output as string;
      // Check replacement values
      expect(output).toContain("Unknown Author"); // Default author
      // Page column is empty
      // Date column is empty
      // Tags column is empty
      const rows = output.split("\n");
      // Header + 1 row
      const dataRow = rows[1];
      // CSV columns: id,title,author,type,page,location,date,content,wordCount,tags
      //             0  1     2      3    4    5        6    7       8         9

      // We need to parse CSV properly or rely on simplistic split if values are simple
      // clipping.location.raw is "100-200" usually.
      // Let's assume simple contents so split(",") is safe-ish for test.
      const cols = dataRow.split(",");
      expect(cols[2]).toContain("Unknown Author");
      expect(cols[4]).toBe(""); // Page is not escaped in code
      expect(cols[6]).toBe(""); // Date is not escaped in code
      expect(cols[9]).toBe('""'); // Tags IS escaped, returns "" for empty
    }
  });

  it("should exclude tags when includeClippingTags is false", async () => {
    const clipping = createClipping({
      tags: ["tag1", "tag2"],
    });

    const resultWrap = await exporter.export([clipping], {
      ...defaultOptions,
      includeClippingTags: false,
    });

    expect(resultWrap.isOk()).toBe(true);
    if (resultWrap.isOk()) {
      const output = resultWrap.value.output as string;
      const rows = output.split("\n");
      const dataRow = rows[1];
      const cols = dataRow.split(",");
      expect(cols[9]).toBe('""'); // Tags column escaped empty
      // Should NOT contain "tag1"
      expect(output).not.toContain("tag1");
    }
  });
});
