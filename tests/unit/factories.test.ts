import { CsvExporter } from "@exporters/csv.exporter.js";
import { ExporterFactory } from "@exporters/factory.js";
import { HtmlExporter } from "@exporters/html.exporter.js";
import { JoplinExporter } from "@exporters/joplin.exporter.js";
import { JsonExporter } from "@exporters/json.exporter.js";
import { MarkdownExporter } from "@exporters/markdown.exporter.js";
import { ObsidianExporter } from "@exporters/obsidian.exporter.js";
import { CsvImporter } from "@importers/csv.importer.js";
import { ImporterFactory } from "@importers/factory.js";
import { JsonImporter } from "@importers/json.importer.js";
import { TxtImporter } from "@importers/txt/index.js";
import { describe, expect, it } from "vitest";

describe("Factories", () => {
  describe("ExporterFactory", () => {
    it("should return JsonExporter for 'json'", () => {
      expect(ExporterFactory.getExporter("json")).toBeInstanceOf(JsonExporter);
    });

    it("should return CsvExporter for 'csv'", () => {
      expect(ExporterFactory.getExporter("csv")).toBeInstanceOf(CsvExporter);
    });

    it("should return MarkdownExporter for 'md' and 'markdown'", () => {
      expect(ExporterFactory.getExporter("md")).toBeInstanceOf(MarkdownExporter);
      expect(ExporterFactory.getExporter("markdown")).toBeInstanceOf(MarkdownExporter);
    });

    it("should return ObsidianExporter for 'obsidian'", () => {
      expect(ExporterFactory.getExporter("obsidian")).toBeInstanceOf(ObsidianExporter);
    });

    it("should return JoplinExporter for 'joplin'", () => {
      expect(ExporterFactory.getExporter("joplin")).toBeInstanceOf(JoplinExporter);
    });

    it("should return HtmlExporter for 'html'", () => {
      expect(ExporterFactory.getExporter("html")).toBeInstanceOf(HtmlExporter);
    });

    it("should be case insensitive", () => {
      expect(ExporterFactory.getExporter("JSON")).toBeInstanceOf(JsonExporter);
      expect(ExporterFactory.getExporter("Markdown")).toBeInstanceOf(MarkdownExporter);
    });

    it("should return null for unknown format", () => {
      expect(ExporterFactory.getExporter("unknown")).toBeNull();
    });
  });

  describe("ImporterFactory", () => {
    it("should return JsonImporter for .json files", () => {
      expect(ImporterFactory.getImporter("clippings.json")).toBeInstanceOf(JsonImporter);
      expect(ImporterFactory.getImporter("/path/to/MyClippings.JSON")).toBeInstanceOf(JsonImporter);
    });

    it("should return CsvImporter for .csv files", () => {
      expect(ImporterFactory.getImporter("clippings.csv")).toBeInstanceOf(CsvImporter);
      expect(ImporterFactory.getImporter("backup.CSV")).toBeInstanceOf(CsvImporter);
    });

    it("should return TxtImporter for .txt files", () => {
      expect(ImporterFactory.getImporter("My Clippings.txt")).toBeInstanceOf(TxtImporter);
      expect(ImporterFactory.getImporter("notes.TXT")).toBeInstanceOf(TxtImporter);
    });

    it("should default to TxtImporter for unknown extensions", () => {
      // Kindle clippings files sometimes have no extension or other names
      expect(ImporterFactory.getImporter("My Clippings")).toBeInstanceOf(TxtImporter);
      expect(ImporterFactory.getImporter("clippings.dat")).toBeInstanceOf(TxtImporter);
    });
  });
});
