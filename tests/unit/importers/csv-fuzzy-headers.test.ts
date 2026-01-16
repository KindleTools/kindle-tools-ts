import { describe, expect, it } from "vitest";
import { CsvImporter } from "../../../src/importers/formats/csv.importer";

describe("CsvImporter Fuzzy Headers", () => {
  it("should map fuzzy headers to expected columns", async () => {
    const csvContent = `Titl,Authr,Contnt,Typ
Book Title,John Doe,Some content,highlight`;

    const importer = new CsvImporter();
    const result = await importer.import(csvContent);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const data = result.value;
    expect(data.clippings).toHaveLength(1);

    // Check that we got warnings for the fuzzy matches
    expect(data.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Fuzzy matched header 'titl' to 'title'"),
        expect.stringContaining("Fuzzy matched header 'authr' to 'author'"),
        expect.stringContaining("Fuzzy matched header 'contnt' to 'content'"),
        expect.stringContaining("Fuzzy matched header 'typ' to 'type'"),
      ]),
    );

    const clipping = data.clippings[0];

    expect(clipping.title).toBe("Book Title");
    expect(clipping.author).toBe("John Doe");
    expect(clipping.content).toBe("Some content");
    expect(clipping.type).toBe("highlight");
  });

  it("should still respect exact matches", async () => {
    const csvContent = `Title,Author,Content,Type
Book Title,John Doe,Some content,highlight`;

    const importer = new CsvImporter();
    const result = await importer.import(csvContent);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.clippings).toHaveLength(1);
    expect(result.value.clippings[0].title).toBe("Book Title");
  });

  it("should not map very distinct headers", async () => {
    // "Random" is too far from "Title" or any other field
    const csvContent = `Random,Author,Content
Book Title,John Doe,Some content`;

    const importer = new CsvImporter();
    const result = await importer.import(csvContent);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    // "Random" should not be mapped to "Title"
    expect(result.value.clippings[0].content).toBe("Some content");
    expect(result.value.clippings[0].title).toBe("Unknown"); // Default when title is missing
  });
});
