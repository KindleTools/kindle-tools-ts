/**
 * Tests for all exporters (JSON, CSV, Markdown, Obsidian, Joplin, HTML).
 */

import { describe, expect, it } from "vitest";
import type { Clipping } from "#app-types/clipping.js";
import { CsvExporter } from "#exporters/formats/csv.exporter.js";
import { HtmlExporter } from "#exporters/formats/html.exporter.js";
import { JoplinExporter } from "#exporters/formats/joplin.exporter.js";
import { JsonExporter } from "#exporters/formats/json.exporter.js";
import { MarkdownExporter } from "#exporters/formats/markdown.exporter.js";
import { ObsidianExporter } from "#exporters/formats/obsidian.exporter.js";
import {
  EMPTY_CLIPPINGS,
  SAMPLE_CLIPPINGS,
  SINGLE_CLIPPING,
} from "../../fixtures/sample-clippings.js";
import { getExportSuccess, getFilesContent } from "../../helpers/result-helpers.js";

// =============================================================================
// JSON Exporter
// =============================================================================

describe("JsonExporter", () => {
  const exporter = new JsonExporter();

  describe("properties", () => {
    it("should have correct name and extension", () => {
      expect(exporter.name).toBe("json");
      expect(exporter.extension).toBe(".json");
    });
  });

  describe("export", () => {
    it("should export clippings as valid JSON", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      expect(() => JSON.parse(output as string)).not.toThrow();
    });

    it("should include clippings array and meta", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { includeStats: true });
      const { output } = getExportSuccess(result);
      const data = JSON.parse(output as string);

      expect(data.clippings).toBeDefined();
      expect(data.clippings.length).toBe(5);
      expect(data.meta.total).toBe(5);
    });

    it("should group by book when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        groupByBook: true,
        includeStats: true,
      });
      const { output } = getExportSuccess(result);
      const data = JSON.parse(output as string);

      expect(data.books).toBeDefined();
      expect(Object.keys(data.books).length).toBe(3); // 3 different books
      expect(data.meta.totalBooks).toBe(3);
      expect(data.meta.totalClippings).toBe(5);
    });

    it("should pretty print when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { pretty: true });
      const { output } = getExportSuccess(result);

      // Pretty printed JSON has newlines and indentation
      expect(output).toContain("\n");
      expect(output).toContain("  ");
    });

    it("should exclude raw fields by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);
      const data = JSON.parse(output as string);

      expect(data.clippings[0].titleRaw).toBeUndefined();
      expect(data.clippings[0].authorRaw).toBeUndefined();
      expect(data.clippings[0].contentRaw).toBeUndefined();
    });

    it("should include raw fields when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { includeRaw: true });
      const { output } = getExportSuccess(result);
      const data = JSON.parse(output as string);

      expect(data.clippings[0].titleRaw).toBeDefined();
    });

    it("should handle empty clippings array", async () => {
      const result = await exporter.export(EMPTY_CLIPPINGS, { includeStats: true });
      const { output } = getExportSuccess(result);
      const data = JSON.parse(output as string);

      expect(result.isOk()).toBe(true);
      expect(data.clippings).toHaveLength(0);
      expect(data.meta.total).toBe(0);
    });
  });
});

// =============================================================================
// CSV Exporter
// =============================================================================

describe("CsvExporter", () => {
  const exporter = new CsvExporter();

  describe("properties", () => {
    it("should have correct name and extension", () => {
      expect(exporter.name).toBe("csv");
      expect(exporter.extension).toBe(".csv");
    });
  });

  describe("export", () => {
    it("should export clippings as valid CSV", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      const lines = (output as string).split("\n").filter((l) => l.trim());

      // Header + 5 data lines
      expect(lines.length).toBe(6);
    });

    it("should include BOM for Excel compatibility", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      // UTF-8 BOM
      expect((output as string).charCodeAt(0)).toBe(0xfeff);
    });

    it("should have proper headers", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);
      const headerLine = (output as string).split("\n")[0];

      expect(headerLine).toContain("title");
      expect(headerLine).toContain("author");
      expect(headerLine).toContain("type");
      expect(headerLine).toContain("content");
    });

    it("should escape quotes in content", async () => {
      const clippingWithQuotes = [
        {
          ...(SINGLE_CLIPPING[0] as Clipping),
          content: 'He said "hello" to me',
        },
      ];
      const result = await exporter.export(clippingWithQuotes);
      const { output } = getExportSuccess(result);

      // CSV escapes quotes by doubling them
      expect(output).toContain('""hello""');
    });

    it("should handle empty clippings", async () => {
      const result = await exporter.export(EMPTY_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      // Should still have header
      const lines = (output as string).split("\n").filter((l) => l.trim());
      expect(lines.length).toBe(1);
    });

    it("should include tags column in header", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);
      const headerLine = (output as string).split("\n")[0];

      expect(headerLine).toContain("tags");
    });

    it("should include clipping tags in output", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["important", "review"] } : c,
      );
      const result = await exporter.export(clippingsWithTags);
      const { output } = getExportSuccess(result);

      // Tags should be semicolon-separated
      expect(output).toContain("important; review");
    });

    it("should exclude tags when includeClippingTags is false", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["secret-tag"] } : c,
      );
      const result = await exporter.export(clippingsWithTags, { includeClippingTags: false });
      const { output } = getExportSuccess(result);

      expect(output).not.toContain("secret-tag");
    });
  });
});

// =============================================================================
// Markdown Exporter
// =============================================================================

describe("MarkdownExporter", () => {
  const exporter = new MarkdownExporter();

  describe("properties", () => {
    it("should have correct name and extension", () => {
      expect(exporter.name).toBe("markdown");
      expect(exporter.extension).toBe(".md");
    });
  });

  describe("export", () => {
    it("should export clippings as Markdown", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      expect(output).toContain("# Kindle Highlights");
    });

    it("should include book titles as H2 headers", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("## The Great Gatsby");
      expect(output).toContain("## 1984");
      expect(output).toContain("## Clean Code");
    });

    it("should format highlights as blockquotes", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("> In my younger and more vulnerable years");
    });

    it("should include notes when present", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("**Note:**");
    });

    it("should generate separate files when groupByBook is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { groupByBook: true });
      const { files } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      expect(files).toBeDefined();
      expect(files?.length).toBe(3);
    });

    it("should handle empty clippings", async () => {
      const result = await exporter.export(EMPTY_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      expect(output).toContain("# Kindle Highlights");
    });
  });
});

// =============================================================================
// Obsidian Exporter
// =============================================================================

describe("ObsidianExporter", () => {
  const exporter = new ObsidianExporter();

  describe("properties", () => {
    it("should have correct name and extension", () => {
      expect(exporter.name).toBe("obsidian");
      expect(exporter.extension).toBe(".md");
    });
  });

  describe("export", () => {
    it("should export clippings with YAML frontmatter", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);

      // Check YAML frontmatter delimiters
      expect(output).toContain("---");
      expect(output).toContain("title:");
      expect(output).toContain("author:");
      expect(output).toContain("tags:");
    });

    it("should generate separate files per book", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { files } = getExportSuccess(result);

      expect(files).toBeDefined();
      expect(files?.length).toBe(3);
    });

    it("should put files in books folder by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { files } = getExportSuccess(result);

      expect(files?.[0]?.path).toMatch(/^books\//);
    });

    it("should use custom folder when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { folder: "kindle" });
      const { files } = getExportSuccess(result);

      expect(files?.[0]?.path).toMatch(/^kindle\//);
    });

    it("should use callouts by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("> [!quote]");
    });

    it("should disable callouts when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { useCallouts: false });
      const { output } = getExportSuccess(result);

      expect(output).not.toContain("> [!quote]");
    });

    it("should use wikilinks for authors by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("[[F. Scott Fitzgerald]]");
    });

    it("should disable wikilinks when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { wikilinks: false });
      const { output } = getExportSuccess(result);

      expect(output).not.toContain("[[");
    });

    it("should include custom tags in frontmatter", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        tags: ["books", "reading", "notes"],
      });
      const { output } = getExportSuccess(result);

      expect(output).toContain("- books");
      expect(output).toContain("- reading");
      expect(output).toContain("- notes");
    });

    it("should include summary section", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("## 📊 Summary");
      expect(output).toContain("Highlights");
      expect(output).toContain("Notes");
      expect(output).toContain("| Metric | Count |");
    });

    it("should use by-author folder structure by default (Root > Author > Book)", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { files } = getExportSuccess(result);

      // Path should be books/Author/Title.md
      expect(files?.[0]?.path).toMatch(/^books\/[^/]+\/[^/]+\.md$/);
    });

    it("should use by-author folder structure when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { folderStructure: "by-author" });
      const { files } = getExportSuccess(result);

      // Path should be books/Author/Title.md
      expect(files?.[0]?.path).toMatch(/^books\/[^/]+\/[^/]+\.md$/);
    });

    it("should use by-author-book folder structure when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { folderStructure: "by-author-book" });
      const { files } = getExportSuccess(result);

      // Path should be books/Author/Title/Title.md
      expect(files?.[0]?.path).toMatch(/^books\/[^/]+\/[^/]+\/[^/]+\.md$/);
    });

    it("should apply uppercase to author folder names", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folderStructure: "by-author",
        authorCase: "uppercase",
      });
      const { files } = getExportSuccess(result);

      // Author name should be uppercase in the path
      expect(files?.[0]?.path).toMatch(/^books\/[A-Z\s.]+\//);
    });

    it("should apply lowercase to author folder names", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folderStructure: "by-author",
        authorCase: "lowercase",
      });
      const { files } = getExportSuccess(result);

      // Author name should be lowercase in the path
      expect(files?.[0]?.path).toMatch(/^books\/[a-z\s.]+\//);
    });

    it("should include clipping tags in frontmatter by default", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["important", "review"] } : c,
      );
      const result = await exporter.export(clippingsWithTags);
      const { output } = getExportSuccess(result);

      expect(output).toContain("- important");
      expect(output).toContain("- review");
    });

    it("should exclude clipping tags when includeClippingTags is false", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["secret-tag"] } : c,
      );
      const result = await exporter.export(clippingsWithTags, { includeClippingTags: false });
      const { output } = getExportSuccess(result);

      expect(output).not.toContain("- secret-tag");
    });

    it("should prevent path traversal in base folder", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folder: "../../unsafe",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Path traversal detected");
      }
    });

    it("should sanitize dangerous filenames", async () => {
      const dangerousClipping = [
        {
          ...(SAMPLE_CLIPPINGS[0] as Clipping),
          title: "../../etc/passwd",
          author: "Cool/Author",
        },
      ];
      const result = await exporter.export(dangerousClipping);
      const { files } = getExportSuccess(result);

      // Should sanitize slashes and dots to prevent traversal
      // ../../etc/passwd -> ..-..-etc-passwd
      // Cool/Author -> COOL-AUTHOR (default uppercase)
      const path = files?.[0]?.path;
      expect(path).toBeDefined();
      expect(path).not.toContain("../");
      expect(path).toContain("..-..-etc-passwd");
      expect(path).toContain("COOL-AUTHOR");
    });
  });
});

// =============================================================================
// Joplin Exporter
// =============================================================================

describe("JoplinExporter", () => {
  const exporter = new JoplinExporter();

  describe("properties", () => {
    it("should have correct name and extension", () => {
      expect(exporter.name).toBe("joplin");
      expect(exporter.extension).toBe(".jex");
    });
  });

  describe("export", () => {
    it("should export clippings with JEX metadata", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { files } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      expect(files).toBeDefined();
      expect(files?.length).toBeGreaterThan(0);
    });

    it("should create root notebook", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const content = getFilesContent(result);

      expect(content).toContain("type_: 2"); // TYPE_FOLDER
      expect(content).toContain("Kindle Highlights");
    });

    it("should use custom notebook name when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { notebookName: "My Notes" });
      const content = getFilesContent(result);

      expect(content).toContain("My Notes");
    });

    it("should create deterministic IDs", async () => {
      // Export twice with same data
      const result1 = await exporter.export(SAMPLE_CLIPPINGS);
      const result2 = await exporter.export(SAMPLE_CLIPPINGS);
      const success1 = getExportSuccess(result1);
      const success2 = getExportSuccess(result2);

      // IDs should be the same
      expect(success1.files?.[0]?.path).toBe(success2.files?.[0]?.path);
    });

    it("should include note metadata", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const content = getFilesContent(result);

      expect(content).toContain("type_: 1"); // TYPE_NOTE
      expect(content).toContain("created_time:");
      expect(content).toContain("updated_time:");
      expect(content).toContain("source_application: kindle-tools-ts");
    });

    it("should create tags", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { tags: ["kindle", "reading"] });
      const content = getFilesContent(result);

      expect(content).toContain("type_: 5"); // TYPE_TAG
    });

    it("should create note-tag associations", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { tags: ["kindle"] });
      const content = getFilesContent(result);

      expect(content).toContain("type_: 6"); // TYPE_NOTE_TAG
      expect(content).toContain("note_id:");
      expect(content).toContain("tag_id:");
    });

    it("should include creator when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { creator: "John Doe" });
      const content = getFilesContent(result);

      // Creator appears as author field in Joplin note metadata (not in body footer)
      // Body footer contains book author (e.g., "- author: F. Scott Fitzgerald")
      expect(content).toContain("author: John Doe"); // Joplin metadata field
      expect(content).toContain("- author: F. Scott Fitzgerald"); // Body footer
    });

    it("should format note titles with page number", async () => {
      const result = await exporter.export([SAMPLE_CLIPPINGS[0] as Clipping]);
      const content = getFilesContent(result);

      // Python-compatible format: [0005] without emojis
      expect(content).toContain("[0005]"); // Page 5 padded
    });

    it("should use 3-level hierarchy by default (Root > Author > Book)", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const content = getFilesContent(result);

      // Count type_: 2 (folders) - should be 1 root + 3 authors + 3 books = 7
      // (may be less if authors are shared)
      const folderMatches = content.match(/type_: 2/g);
      expect(folderMatches?.length).toBeGreaterThan(4);
    });

    it("should use 3-level hierarchy when folderStructure is by-author", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { folderStructure: "by-author" });
      const content = getFilesContent(result);

      // Count type_: 2 (folders) - should be 1 root + 3 authors + 3 books = 7
      // (may be less if authors are shared)
      const folderMatches = content.match(/type_: 2/g);
      expect(folderMatches?.length).toBeGreaterThan(4);
    });

    it("should apply uppercase to author notebook names", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folderStructure: "by-author",
        authorCase: "uppercase",
      });
      const content = getFilesContent(result);

      // Should have uppercase author names
      expect(content).toContain("F. SCOTT FITZGERALD");
    });

    it("should apply lowercase to author notebook names", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folderStructure: "by-author",
        authorCase: "lowercase",
      });
      const content = getFilesContent(result);

      // Should have lowercase author names
      expect(content).toContain("f. scott fitzgerald");
    });

    it("should include clipping tags as Joplin tags by default", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["important", "review"] } : c,
      );
      const result = await exporter.export(clippingsWithTags);
      const content = getFilesContent(result);

      // Should create tag entries (Joplin format: title on first line, then metadata)
      // The tag title appears as a standalone line followed by id:
      expect(content).toMatch(/\nimportant\n\nid:/);
      expect(content).toMatch(/\nreview\n\nid:/);
    });

    it("should not create tag entries when includeClippingTags is false", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["secret-tag"] } : c,
      );
      const result = await exporter.export(clippingsWithTags, { includeClippingTags: false });
      const content = getFilesContent(result);

      // Should not contain the clipping tag as a tag entry
      expect(content).not.toMatch(/\nsecret-tag\n\nid:/);
    });

    it("should reset context between consecutive exports", async () => {
      // First export with custom notebook name
      const result1 = await exporter.export(SAMPLE_CLIPPINGS, { notebookName: "First Export" });
      const content1 = getFilesContent(result1);

      // Second export with different notebook name
      const result2 = await exporter.export(SAMPLE_CLIPPINGS, { notebookName: "Second Export" });
      const content2 = getFilesContent(result2);

      // Each export should have its own notebook name, not carry over state
      expect(content1).toContain("First Export");
      expect(content1).not.toContain("Second Export");
      expect(content2).toContain("Second Export");
      expect(content2).not.toContain("First Export");

      // File counts should be identical (same clippings)
      const { files: files1 } = getExportSuccess(result1);
      const { files: files2 } = getExportSuccess(result2);
      expect(files1?.length).toBe(files2?.length);
    });
  });
});

// =============================================================================
// HTML Exporter
// =============================================================================

describe("HtmlExporter", () => {
  const exporter = new HtmlExporter();

  describe("properties", () => {
    it("should have correct name and extension", () => {
      expect(exporter.name).toBe("html");
      expect(exporter.extension).toBe(".html");
    });
  });

  describe("export", () => {
    it("should export valid HTML document", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      expect(output).toContain("<!DOCTYPE html>");
      expect(output).toContain("<html");
      expect(output).toContain("</html>");
    });

    it("should include embedded CSS", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("<style>");
      expect(output).toContain(":root");
      expect(output).toContain("--bg-primary:");
    });

    it("should include dark mode styles", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain(".dark");
      expect(output).toContain("theme-toggle");
    });

    it("should include search functionality by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("search-input");
      expect(output).toContain('id="search"');
    });

    it("should disable search when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { includeSearch: false });
      const { output } = getExportSuccess(result);

      // The search input element should not be present
      expect(output).not.toContain('id="search"');
    });

    it("should disable dark mode when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { includeDarkMode: false });
      const { output } = getExportSuccess(result);

      // The theme toggle button should not be present
      expect(output).not.toContain('id="theme-toggle"');
    });

    it("should include book cards", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain('class="book"');
      expect(output).toContain("The Great Gatsby");
      expect(output).toContain("F. Scott Fitzgerald");
    });

    it("should include clippings with proper types", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      // Clipping types become CSS classes: clipping-highlight, clipping-note, clipping-bookmark
      expect(output).toContain("clipping clipping-highlight");
      expect(output).toContain("clipping clipping-note");
      expect(output).toContain("clipping clipping-bookmark");
    });

    it("should include custom title", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { title: "My Reading Notes" });
      const { output } = getExportSuccess(result);

      expect(output).toContain("<title>My Reading Notes</title>");
      expect(output).toContain("<h1>My Reading Notes</h1>");
    });

    it("should include custom CSS when provided", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        customCss: ".custom-class { color: red; }",
      });
      const { output } = getExportSuccess(result);

      expect(output).toContain(".custom-class { color: red; }");
    });

    it("should generate separate files when groupByBook is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { groupByBook: true });
      const { files } = getExportSuccess(result);

      expect(files).toBeDefined();
      expect(files?.length).toBe(3);
    });

    it("should include footer with generation date", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(output).toContain("kindle-tools-ts");
      expect(output).toContain('class="footer"');
    });

    it("should escape HTML in content", async () => {
      const maliciousClipping = [
        {
          ...(SINGLE_CLIPPING[0] as Clipping),
          content: '<script>alert("xss")</script>',
        },
      ];
      const result = await exporter.export(maliciousClipping);
      const { output } = getExportSuccess(result);

      // The malicious content should be escaped (there may be legitimate <script> tags for interactivity)
      expect(output).toContain("&lt;script&gt;alert");
      expect(output).toContain("&lt;/script&gt;");
    });

    it("should handle empty clippings", async () => {
      const result = await exporter.export(EMPTY_CLIPPINGS);
      const { output } = getExportSuccess(result);

      expect(result.isOk()).toBe(true);
      expect(output).toContain("0 books");
      expect(output).toContain("0 highlights");
    });
  });
});
