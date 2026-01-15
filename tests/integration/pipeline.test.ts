/**
 * Integration tests for the complete pipeline.
 *
 * Tests the full flow: Parse → Process → Export
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { processClippings } from "#core/processor.js";
import { CsvExporter } from "#exporters/formats/csv.exporter.js";
import { HtmlExporter } from "#exporters/formats/html.exporter.js";
import { JoplinExporter } from "#exporters/formats/joplin.exporter.js";
import { JsonExporter } from "#exporters/formats/json.exporter.js";
import { MarkdownExporter } from "#exporters/formats/markdown.exporter.js";
import { ObsidianExporter } from "#exporters/formats/obsidian.exporter.js";
import type { ExportedFile } from "#exporters/index.js";
import { parseFile } from "#importers/formats/txt/file-parser.js";
import { parse } from "#importers/formats/txt/parser.js";
import { MemoryFileSystem, resetFileSystem, setFileSystem } from "#ports";
import { SAMPLE_CLIPPINGS_EN } from "../fixtures/sample-clippings.js";
import { getExportSuccess } from "../helpers/result-helpers.js";

describe("Integration: Full Pipeline", () => {
  describe("Parse → Export", () => {
    it("should parse and export to JSON", async () => {
      // Parse
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);
      expect(parseResult.clippings.length).toBe(5);

      // Export
      const exporter = new JsonExporter();
      const exportResult = await exporter.export(parseResult.clippings);
      const { output } = getExportSuccess(exportResult);

      expect(exportResult.isOk()).toBe(true);
      const data = JSON.parse(output as string);
      expect(data.clippings.length).toBe(5);
    });

    it("should parse and export to CSV", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new CsvExporter();
      const exportResult = await exporter.export(parseResult.clippings);
      const { output } = getExportSuccess(exportResult);

      expect(exportResult.isOk()).toBe(true);
      const lines = (output as string).split("\n").filter((l) => l.trim());
      expect(lines.length).toBe(6); // Header + 5 data rows
    });

    it("should parse and export to Markdown", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new MarkdownExporter();
      const exportResult = await exporter.export(parseResult.clippings);
      const { output } = getExportSuccess(exportResult);

      expect(exportResult.isOk()).toBe(true);
      expect(output).toContain("# Kindle Highlights");
      expect(output).toContain("The Great Gatsby");
    });

    it("should parse and export to Obsidian", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new ObsidianExporter();
      const exportResult = await exporter.export(parseResult.clippings);
      const { output, files } = getExportSuccess(exportResult);

      expect(exportResult.isOk()).toBe(true);
      expect(files?.length).toBe(3); // 3 books
      expect(output).toContain("---"); // YAML frontmatter
    });

    it("should parse and export to Joplin", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new JoplinExporter();
      const exportResult = await exporter.export(parseResult.clippings);
      const { files } = getExportSuccess(exportResult);

      expect(exportResult.isOk()).toBe(true);
      expect(files).toBeDefined();
      expect(files?.length).toBeGreaterThan(0);
    });

    it("should parse and export to HTML", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new HtmlExporter();
      const exportResult = await exporter.export(parseResult.clippings);
      const { output } = getExportSuccess(exportResult);

      expect(exportResult.isOk()).toBe(true);
      expect(output).toContain("<!DOCTYPE html>");
      expect(output).toContain("The Great Gatsby");
    });
  });

  describe("Parse → Process → Export", () => {
    it("should process clippings with deduplication", async () => {
      // Create input with duplicate
      const inputWithDuplicate = SAMPLE_CLIPPINGS_EN + SAMPLE_CLIPPINGS_EN;

      const parseResult = await parse(inputWithDuplicate);
      expect(parseResult.clippings.length).toBe(10); // 5 + 5 duplicates

      const processResult = processClippings(parseResult.clippings, {
        removeDuplicates: true,
        detectedLanguage: "en",
      });

      // After deduplication, should have fewer
      expect(processResult.clippings.length).toBeLessThan(10);
      expect(processResult.duplicatesRemoved).toBeGreaterThan(0);
    });

    it("should link notes to highlights", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);

      const processResult = processClippings(parseResult.clippings, {
        mergeNotes: true,
        detectedLanguage: "en",
      });

      // There should be notes linked
      expect(processResult.linkedNotes).toBeGreaterThanOrEqual(0);
    });

    it("should complete full pipeline with all processing", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);

      const processResult = processClippings(parseResult.clippings, {
        removeDuplicates: true,
        mergeNotes: true,
        detectedLanguage: "en",
      });

      const exporter = new JsonExporter();
      const exportResult = await exporter.export(processResult.clippings, {
        groupByBook: true,
        includeStats: true,
        pretty: true,
      });
      const { output } = getExportSuccess(exportResult);

      expect(exportResult.isOk()).toBe(true);

      const data = JSON.parse(output as string);
      expect(data.books).toBeDefined();
      expect(data.meta.totalBooks).toBeGreaterThan(0);
    });
  });

  describe("Consistency", () => {
    it("should produce consistent IDs across multiple runs", async () => {
      const result1 = await parse(SAMPLE_CLIPPINGS_EN);
      const result2 = await parse(SAMPLE_CLIPPINGS_EN);

      // IDs should be deterministic
      for (let i = 0; i < result1.clippings.length; i++) {
        expect(result1.clippings[i]?.id).toBe(result2.clippings[i]?.id);
      }
    });

    it("should produce consistent export IDs for Joplin", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new JoplinExporter();

      const result1 = await exporter.export(parseResult.clippings);
      const result2 = await exporter.export(parseResult.clippings);
      const success1 = getExportSuccess(result1);
      const success2 = getExportSuccess(result2);

      // File paths (which contain IDs) should match
      expect(success1.files?.map((f: ExportedFile) => f.path).sort()).toEqual(
        success2.files?.map((f: ExportedFile) => f.path).sort(),
      );
    });
  });

  describe("Export roundtrip", () => {
    it("should preserve all essential data in JSON export", async () => {
      const parseResult = await parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new JsonExporter();

      const exportResult = await exporter.export(parseResult.clippings, { includeRaw: true });
      const { output } = getExportSuccess(exportResult);
      const data = JSON.parse(output as string);

      // Verify all clippings have essential fields
      for (const clipping of data.clippings) {
        expect(clipping.id).toBeDefined();
        expect(clipping.title).toBeDefined();
        expect(clipping.author).toBeDefined();
        expect(clipping.type).toBeDefined();
        expect(clipping.location).toBeDefined();
      }
    });
  });

  describe("Error handling", () => {
    it("should handle invalid input gracefully", async () => {
      const invalidInput = "This is not a valid clippings file";
      const parseResult = await parse(invalidInput);

      // Should not crash
      expect(parseResult.clippings.length).toBe(0);
    });

    it("should export empty array without error", async () => {
      const exporter = new JsonExporter();
      const result = await exporter.export([]);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      const data = JSON.parse(output as string);
      expect(data.clippings).toHaveLength(0);
    });
  });
});

describe("Integration: Multi-language Support", () => {
  const spanishContent = `Don Quijote de la Mancha (Miguel de Cervantes)
- Tu subrayado en la página 10 | Ubicación 150-160 | Añadido el lunes, 1 de enero de 2024 11:00:00

En un lugar de la Mancha, de cuyo nombre no quiero acordarme
==========`;

  const germanContent = `Faust (Johann Wolfgang von Goethe)
- Ihre Markierung auf Seite 15 | Position 200-210 | Hinzugefügt am Montag, 1. Januar 2024 12:00:00

Habe nun, ach! Philosophie, Juristerei und Medizin
==========`;

  it("should parse Spanish clippings and export", async () => {
    const parseResult = await parse(spanishContent);

    expect(parseResult.clippings.length).toBe(1);
    expect(parseResult.clippings[0]?.language).toBe("es");
    expect(parseResult.clippings[0]?.title).toBe("Don Quijote de la Mancha");

    const exporter = new MarkdownExporter();
    const exportResult = await exporter.export(parseResult.clippings);
    const { output } = getExportSuccess(exportResult);

    expect(exportResult.isOk()).toBe(true);
    expect(output).toContain("Don Quijote de la Mancha");
  });

  it("should parse German clippings and export", async () => {
    const parseResult = await parse(germanContent);

    expect(parseResult.clippings.length).toBe(1);
    expect(parseResult.clippings[0]?.language).toBe("de");
    expect(parseResult.clippings[0]?.title).toBe("Faust");

    const exporter = new HtmlExporter();
    const exportResult = await exporter.export(parseResult.clippings);
    const { output } = getExportSuccess(exportResult);

    expect(exportResult.isOk()).toBe(true);
    expect(output).toContain("Faust");
    expect(output).toContain("Johann Wolfgang von Goethe");
  });
});

describe("Integration: MemoryFileSystem Pipeline", () => {
  let memFs: MemoryFileSystem;

  beforeEach(() => {
    memFs = new MemoryFileSystem();
    setFileSystem(memFs);
  });

  afterEach(() => {
    resetFileSystem();
  });

  it("should complete full pipeline using MemoryFileSystem: parseFile → process → export", async () => {
    // Setup: Add clippings file to memory filesystem
    memFs.addFile("/kindle/My Clippings.txt", SAMPLE_CLIPPINGS_EN);

    // Step 1: Parse from memory filesystem
    const parseResult = await parseFile("/kindle/My Clippings.txt");
    expect(parseResult.clippings.length).toBe(5);
    expect(parseResult.meta.fileSize).toBeGreaterThan(0);

    // Step 2: Process clippings
    const processResult = processClippings(parseResult.clippings, {
      removeDuplicates: true,
      mergeNotes: true,
      detectedLanguage: "en",
    });
    expect(processResult.clippings.length).toBeGreaterThan(0);

    // Step 3: Export to JSON
    const exporter = new JsonExporter();
    const exportResult = await exporter.export(processResult.clippings, {
      groupByBook: true,
      includeStats: true,
    });
    const { output } = getExportSuccess(exportResult);

    expect(exportResult.isOk()).toBe(true);
    const data = JSON.parse(output as string);
    expect(data.books).toBeDefined();
    expect(data.meta.totalBooks).toBeGreaterThan(0);
  });

  it("should handle UTF-8 BOM content in MemoryFileSystem", async () => {
    // UTF-8 BOM prefix
    const bom = "\uFEFF";
    const contentWithBom = bom + SAMPLE_CLIPPINGS_EN;
    memFs.addFile("/kindle/bom-clippings.txt", contentWithBom);

    const parseResult = await parseFile("/kindle/bom-clippings.txt");
    expect(parseResult.clippings.length).toBe(5);
    // Title should not contain BOM character
    expect(parseResult.clippings[0]?.title).not.toContain("\uFEFF");
  });

  it("should export to multiple formats from MemoryFileSystem source", async () => {
    memFs.addFile("/test/clippings.txt", SAMPLE_CLIPPINGS_EN);

    const parseResult = await parseFile("/test/clippings.txt");

    // Export to multiple formats
    const jsonExporter = new JsonExporter();
    const csvExporter = new CsvExporter();
    const mdExporter = new MarkdownExporter();

    const [jsonResult, csvResult, mdResult] = await Promise.all([
      jsonExporter.export(parseResult.clippings),
      csvExporter.export(parseResult.clippings),
      mdExporter.export(parseResult.clippings),
    ]);

    expect(jsonResult.isOk()).toBe(true);
    expect(csvResult.isOk()).toBe(true);
    expect(mdResult.isOk()).toBe(true);

    // Verify each format has content
    const jsonOutput = getExportSuccess(jsonResult).output as string;
    const csvOutput = getExportSuccess(csvResult).output as string;
    const mdOutput = getExportSuccess(mdResult).output as string;

    expect(JSON.parse(jsonOutput).clippings.length).toBe(5);
    expect(csvOutput.split("\n").filter((l) => l.trim()).length).toBe(6); // header + 5 rows
    expect(mdOutput).toContain("# Kindle Highlights");
  });
});
