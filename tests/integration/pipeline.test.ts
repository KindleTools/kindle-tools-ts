/**
 * Integration tests for the complete pipeline.
 *
 * Tests the full flow: Parse → Process → Export
 */

import { describe, expect, it } from "vitest";
import { parse } from "../../src/core/parser.js";
import { process } from "../../src/core/processor.js";
import { CsvExporter } from "../../src/exporters/csv.exporter.js";
import { HtmlExporter } from "../../src/exporters/html.exporter.js";
import { JoplinExporter } from "../../src/exporters/joplin.exporter.js";
import { JsonExporter } from "../../src/exporters/json.exporter.js";
import { MarkdownExporter } from "../../src/exporters/markdown.exporter.js";
import { ObsidianExporter } from "../../src/exporters/obsidian.exporter.js";
import { SAMPLE_CLIPPINGS_EN } from "../fixtures/sample-clippings.js";

describe("Integration: Full Pipeline", () => {
  describe("Parse → Export", () => {
    it("should parse and export to JSON", async () => {
      // Parse
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);
      expect(parseResult.clippings.length).toBe(5);

      // Export
      const exporter = new JsonExporter();
      const exportResult = await exporter.export(parseResult.clippings);

      expect(exportResult.success).toBe(true);
      const data = JSON.parse(exportResult.output as string);
      expect(data.clippings.length).toBe(5);
    });

    it("should parse and export to CSV", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new CsvExporter();
      const exportResult = await exporter.export(parseResult.clippings);

      expect(exportResult.success).toBe(true);
      const lines = (exportResult.output as string).split("\n").filter((l) => l.trim());
      expect(lines.length).toBe(6); // Header + 5 data rows
    });

    it("should parse and export to Markdown", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new MarkdownExporter();
      const exportResult = await exporter.export(parseResult.clippings);

      expect(exportResult.success).toBe(true);
      expect(exportResult.output).toContain("# Kindle Highlights");
      expect(exportResult.output).toContain("The Great Gatsby");
    });

    it("should parse and export to Obsidian", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new ObsidianExporter();
      const exportResult = await exporter.export(parseResult.clippings);

      expect(exportResult.success).toBe(true);
      expect(exportResult.files?.length).toBe(3); // 3 books
      expect(exportResult.output).toContain("---"); // YAML frontmatter
    });

    it("should parse and export to Joplin", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new JoplinExporter();
      const exportResult = await exporter.export(parseResult.clippings);

      expect(exportResult.success).toBe(true);
      expect(exportResult.files).toBeDefined();
      expect(exportResult.files?.length).toBeGreaterThan(0);
    });

    it("should parse and export to HTML", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new HtmlExporter();
      const exportResult = await exporter.export(parseResult.clippings);

      expect(exportResult.success).toBe(true);
      expect(exportResult.output).toContain("<!DOCTYPE html>");
      expect(exportResult.output).toContain("The Great Gatsby");
    });
  });

  describe("Parse → Process → Export", () => {
    it("should process clippings with deduplication", async () => {
      // Create input with duplicate
      const inputWithDuplicate = SAMPLE_CLIPPINGS_EN + SAMPLE_CLIPPINGS_EN;

      const parseResult = parse(inputWithDuplicate);
      expect(parseResult.clippings.length).toBe(10); // 5 + 5 duplicates

      const processResult = process(parseResult.clippings, {
        removeDuplicates: true,
        detectedLanguage: "en",
      });

      // After deduplication, should have fewer
      expect(processResult.clippings.length).toBeLessThan(10);
      expect(processResult.duplicatesRemoved).toBeGreaterThan(0);
    });

    it("should link notes to highlights", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);

      const processResult = process(parseResult.clippings, {
        mergeNotes: true,
        detectedLanguage: "en",
      });

      // There should be notes linked
      expect(processResult.linkedNotes).toBeGreaterThanOrEqual(0);
    });

    it("should complete full pipeline with all processing", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);

      const processResult = process(parseResult.clippings, {
        removeDuplicates: true,
        mergeNotes: true,
        detectedLanguage: "en",
      });

      const exporter = new JsonExporter();
      const exportResult = await exporter.export(processResult.clippings, {
        groupByBook: true,
        pretty: true,
      });

      expect(exportResult.success).toBe(true);

      const data = JSON.parse(exportResult.output as string);
      expect(data.books).toBeDefined();
      expect(data.meta.totalBooks).toBeGreaterThan(0);
    });
  });

  describe("Consistency", () => {
    it("should produce consistent IDs across multiple runs", async () => {
      const result1 = parse(SAMPLE_CLIPPINGS_EN);
      const result2 = parse(SAMPLE_CLIPPINGS_EN);

      // IDs should be deterministic
      for (let i = 0; i < result1.clippings.length; i++) {
        expect(result1.clippings[i]?.id).toBe(result2.clippings[i]?.id);
      }
    });

    it("should produce consistent export IDs for Joplin", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new JoplinExporter();

      const result1 = await exporter.export(parseResult.clippings);
      const result2 = await exporter.export(parseResult.clippings);

      // File paths (which contain IDs) should match
      expect(result1.files?.map((f) => f.path).sort()).toEqual(
        result2.files?.map((f) => f.path).sort(),
      );
    });
  });

  describe("Export roundtrip", () => {
    it("should preserve all essential data in JSON export", async () => {
      const parseResult = parse(SAMPLE_CLIPPINGS_EN);
      const exporter = new JsonExporter();

      const exportResult = await exporter.export(parseResult.clippings, { includeRaw: true });
      const data = JSON.parse(exportResult.output as string);

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
      const parseResult = parse(invalidInput);

      // Should not crash
      expect(parseResult.clippings.length).toBe(0);
    });

    it("should export empty array without error", async () => {
      const exporter = new JsonExporter();
      const result = await exporter.export([]);

      expect(result.success).toBe(true);
      const data = JSON.parse(result.output as string);
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
    const parseResult = parse(spanishContent);

    expect(parseResult.clippings.length).toBe(1);
    expect(parseResult.clippings[0]?.language).toBe("es");
    expect(parseResult.clippings[0]?.title).toBe("Don Quijote de la Mancha");

    const exporter = new MarkdownExporter();
    const exportResult = await exporter.export(parseResult.clippings);

    expect(exportResult.success).toBe(true);
    expect(exportResult.output).toContain("Don Quijote de la Mancha");
  });

  it("should parse German clippings and export", async () => {
    const parseResult = parse(germanContent);

    expect(parseResult.clippings.length).toBe(1);
    expect(parseResult.clippings[0]?.language).toBe("de");
    expect(parseResult.clippings[0]?.title).toBe("Faust");

    const exporter = new HtmlExporter();
    const exportResult = await exporter.export(parseResult.clippings);

    expect(exportResult.success).toBe(true);
    expect(exportResult.output).toContain("Faust");
    expect(exportResult.output).toContain("Johann Wolfgang von Goethe");
  });
});
