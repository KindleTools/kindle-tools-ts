/**
 * Tests for all exporters (JSON, CSV, Markdown, Obsidian, Joplin, HTML).
 */

import type { Clipping } from "@app-types/clipping.js";
import { CsvExporter } from "@exporters/csv.exporter.js";
import { HtmlExporter } from "@exporters/html.exporter.js";
import { JoplinExporter } from "@exporters/joplin.exporter.js";
import { JsonExporter } from "@exporters/json.exporter.js";
import { MarkdownExporter } from "@exporters/markdown.exporter.js";
import { ObsidianExporter } from "@exporters/obsidian.exporter.js";
import { describe, expect, it } from "vitest";
import {
  EMPTY_CLIPPINGS,
  SAMPLE_CLIPPINGS,
  SINGLE_CLIPPING,
} from "../fixtures/sample-clippings.js";

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

      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.output as string)).not.toThrow();
    });

    it("should include clippings array and meta", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const data = JSON.parse(result.output as string);

      expect(data.clippings).toBeDefined();
      expect(data.clippings.length).toBe(5);
      expect(data.meta.total).toBe(5);
    });

    it("should group by book when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { groupByBook: true });
      const data = JSON.parse(result.output as string);

      expect(data.books).toBeDefined();
      expect(Object.keys(data.books).length).toBe(3); // 3 different books
      expect(data.meta.totalBooks).toBe(3);
      expect(data.meta.totalClippings).toBe(5);
    });

    it("should pretty print when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { pretty: true });
      const output = result.output as string;

      // Pretty printed JSON has newlines and indentation
      expect(output).toContain("\n");
      expect(output).toContain("  ");
    });

    it("should exclude raw fields by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const data = JSON.parse(result.output as string);

      expect(data.clippings[0].titleRaw).toBeUndefined();
      expect(data.clippings[0].authorRaw).toBeUndefined();
      expect(data.clippings[0].contentRaw).toBeUndefined();
    });

    it("should include raw fields when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { includeRaw: true });
      const data = JSON.parse(result.output as string);

      expect(data.clippings[0].titleRaw).toBeDefined();
    });

    it("should handle empty clippings array", async () => {
      const result = await exporter.export(EMPTY_CLIPPINGS);
      const data = JSON.parse(result.output as string);

      expect(result.success).toBe(true);
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

      expect(result.success).toBe(true);
      const output = result.output as string;
      const lines = output.split("\n").filter((l) => l.trim());

      // Header + 5 data lines
      expect(lines.length).toBe(6);
    });

    it("should include BOM for Excel compatibility", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      // UTF-8 BOM
      expect(output.charCodeAt(0)).toBe(0xfeff);
    });

    it("should have proper headers", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;
      const headerLine = output.split("\n")[0];

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
      const output = result.output as string;

      // CSV escapes quotes by doubling them
      expect(output).toContain('""hello""');
    });

    it("should handle empty clippings", async () => {
      const result = await exporter.export(EMPTY_CLIPPINGS);

      expect(result.success).toBe(true);
      // Should still have header
      const lines = (result.output as string).split("\n").filter((l) => l.trim());
      expect(lines.length).toBe(1);
    });

    it("should include tags column in header", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;
      const headerLine = output.split("\n")[0];

      expect(headerLine).toContain("tags");
    });

    it("should include clipping tags in output", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["important", "review"] } : c,
      );
      const result = await exporter.export(clippingsWithTags);
      const output = result.output as string;

      // Tags should be semicolon-separated
      expect(output).toContain("important; review");
    });

    it("should exclude tags when includeClippingTags is false", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["secret-tag"] } : c,
      );
      const result = await exporter.export(clippingsWithTags, { includeClippingTags: false });
      const output = result.output as string;

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

      expect(result.success).toBe(true);
      const output = result.output as string;
      expect(output).toContain("# Kindle Highlights");
    });

    it("should include book titles as H2 headers", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("## The Great Gatsby");
      expect(output).toContain("## 1984");
      expect(output).toContain("## Clean Code");
    });

    it("should format highlights as blockquotes", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("> In my younger and more vulnerable years");
    });

    it("should include notes when present", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("**Note:**");
    });

    it("should generate separate files when groupByBook is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { groupByBook: true });

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files?.length).toBe(3);
    });

    it("should handle empty clippings", async () => {
      const result = await exporter.export(EMPTY_CLIPPINGS);

      expect(result.success).toBe(true);
      expect(result.output).toContain("# Kindle Highlights");
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

      expect(result.success).toBe(true);
      const output = result.output as string;

      // Check YAML frontmatter delimiters
      expect(output).toContain("---");
      expect(output).toContain("title:");
      expect(output).toContain("author:");
      expect(output).toContain("tags:");
    });

    it("should generate separate files per book", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);

      expect(result.files).toBeDefined();
      expect(result.files?.length).toBe(3);
    });

    it("should put files in books folder by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);

      expect(result.files?.[0]?.path).toMatch(/^books\//);
    });

    it("should use custom folder when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { folder: "kindle" });

      expect(result.files?.[0]?.path).toMatch(/^kindle\//);
    });

    it("should use callouts by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("> [!quote]");
    });

    it("should disable callouts when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { useCallouts: false });
      const output = result.output as string;

      expect(output).not.toContain("> [!quote]");
    });

    it("should use wikilinks for authors by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("[[F. Scott Fitzgerald]]");
    });

    it("should disable wikilinks when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { wikilinks: false });
      const output = result.output as string;

      expect(output).not.toContain("[[");
    });

    it("should include custom tags in frontmatter", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        tags: ["books", "reading", "notes"],
      });
      const output = result.output as string;

      expect(output).toContain("- books");
      expect(output).toContain("- reading");
      expect(output).toContain("- notes");
    });

    it("should include summary section", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("## 📊 Summary");
      expect(output).toContain("**Highlights:**");
      expect(output).toContain("**Notes:**");
    });

    it("should use by-author folder structure by default (Root > Author > Book)", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);

      // Path should be books/Author/Title.md
      expect(result.files?.[0]?.path).toMatch(/^books\/[^/]+\/[^/]+\.md$/);
    });

    it("should use by-author folder structure when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { folderStructure: "by-author" });

      // Path should be books/Author/Title.md
      expect(result.files?.[0]?.path).toMatch(/^books\/[^/]+\/[^/]+\.md$/);
    });

    it("should use by-author-book folder structure when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { folderStructure: "by-author-book" });

      // Path should be books/Author/Title/Title.md
      expect(result.files?.[0]?.path).toMatch(/^books\/[^/]+\/[^/]+\/[^/]+\.md$/);
    });

    it("should apply uppercase to author folder names", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folderStructure: "by-author",
        authorCase: "uppercase",
      });

      // Author name should be uppercase in the path
      expect(result.files?.[0]?.path).toMatch(/^books\/[A-Z\s.]+\//);
    });

    it("should apply lowercase to author folder names", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folderStructure: "by-author",
        authorCase: "lowercase",
      });

      // Author name should be lowercase in the path
      expect(result.files?.[0]?.path).toMatch(/^books\/[a-z\s.]+\//);
    });

    it("should include clipping tags in frontmatter by default", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["important", "review"] } : c,
      );
      const result = await exporter.export(clippingsWithTags);
      const output = result.output as string;

      expect(output).toContain("- important");
      expect(output).toContain("- review");
    });

    it("should exclude clipping tags when includeClippingTags is false", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["secret-tag"] } : c,
      );
      const result = await exporter.export(clippingsWithTags, { includeClippingTags: false });
      const output = result.output as string;

      expect(output).not.toContain("- secret-tag");
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

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files?.length).toBeGreaterThan(0);
    });

    it("should create root notebook", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("type_: 2"); // TYPE_FOLDER
      expect(output).toContain("Kindle Highlights");
    });

    it("should use custom notebook name when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { notebookName: "My Notes" });
      const output = result.output as string;

      expect(output).toContain("My Notes");
    });

    it("should create deterministic IDs", async () => {
      // Export twice with same data
      const result1 = await exporter.export(SAMPLE_CLIPPINGS);
      const result2 = await exporter.export(SAMPLE_CLIPPINGS);

      // IDs should be the same
      expect(result1.files?.[0]?.path).toBe(result2.files?.[0]?.path);
    });

    it("should include note metadata", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("type_: 1"); // TYPE_NOTE
      expect(output).toContain("created_time:");
      expect(output).toContain("updated_time:");
      expect(output).toContain("source_application: kindle-tools-ts");
    });

    it("should create tags", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { tags: ["kindle", "reading"] });
      const output = result.output as string;

      expect(output).toContain("type_: 5"); // TYPE_TAG
    });

    it("should create note-tag associations", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { tags: ["kindle"] });
      const output = result.output as string;

      expect(output).toContain("type_: 6"); // TYPE_NOTE_TAG
      expect(output).toContain("note_id:");
      expect(output).toContain("tag_id:");
    });

    it("should include creator when specified", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { creator: "John Doe" });
      const output = result.output as string;

      // Creator appears as author field in Joplin note metadata (not in body footer)
      // Body footer contains book author (e.g., "- author: F. Scott Fitzgerald")
      expect(output).toContain("author: John Doe"); // Joplin metadata field
      expect(output).toContain("- author: F. Scott Fitzgerald"); // Body footer
    });

    it("should format note titles with page number", async () => {
      const result = await exporter.export([SAMPLE_CLIPPINGS[0] as Clipping]);
      const output = result.output as string;

      // Python-compatible format: [0005] without emojis
      expect(output).toContain("[0005]"); // Page 5 padded
    });

    it("should use 3-level hierarchy by default (Root > Author > Book)", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      // Count type_: 2 (folders) - should be 1 root + 3 authors + 3 books = 7
      // (may be less if authors are shared)
      const folderMatches = output.match(/type_: 2/g);
      expect(folderMatches?.length).toBeGreaterThan(4);
    });

    it("should use 3-level hierarchy when folderStructure is by-author", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { folderStructure: "by-author" });
      const output = result.output as string;

      // Count type_: 2 (folders) - should be 1 root + 3 authors + 3 books = 7
      // (may be less if authors are shared)
      const folderMatches = output.match(/type_: 2/g);
      expect(folderMatches?.length).toBeGreaterThan(4);
    });

    it("should apply uppercase to author notebook names", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folderStructure: "by-author",
        authorCase: "uppercase",
      });
      const output = result.output as string;

      // Should have uppercase author names
      expect(output).toContain("F. SCOTT FITZGERALD");
    });

    it("should apply lowercase to author notebook names", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        folderStructure: "by-author",
        authorCase: "lowercase",
      });
      const output = result.output as string;

      // Should have lowercase author names
      expect(output).toContain("f. scott fitzgerald");
    });

    it("should include clipping tags as Joplin tags by default", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["important", "review"] } : c,
      );
      const result = await exporter.export(clippingsWithTags);
      const output = result.output as string;

      // Should create tag entries (Joplin format: title on first line, then metadata)
      // The tag title appears as a standalone line followed by id:
      expect(output).toMatch(/\nimportant\n\nid:/);
      expect(output).toMatch(/\nreview\n\nid:/);
    });

    it("should not create tag entries when includeClippingTags is false", async () => {
      const clippingsWithTags = SAMPLE_CLIPPINGS.map((c, i) =>
        i === 0 ? { ...c, tags: ["secret-tag"] } : c,
      );
      const result = await exporter.export(clippingsWithTags, { includeClippingTags: false });
      const output = result.output as string;

      // Should not contain the clipping tag as a tag entry
      expect(output).not.toMatch(/\nsecret-tag\n\nid:/);
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

      expect(result.success).toBe(true);
      const output = result.output as string;
      expect(output).toContain("<!DOCTYPE html>");
      expect(output).toContain("<html");
      expect(output).toContain("</html>");
    });

    it("should include embedded CSS", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("<style>");
      expect(output).toContain(":root");
      expect(output).toContain("--bg-primary:");
    });

    it("should include dark mode styles", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain(".dark");
      expect(output).toContain("theme-toggle");
    });

    it("should include search functionality by default", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain("search-input");
      expect(output).toContain('id="search"');
    });

    it("should disable search when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { includeSearch: false });
      const output = result.output as string;

      // The search input element should not be present
      expect(output).not.toContain('id="search"');
    });

    it("should disable dark mode when option is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { includeDarkMode: false });
      const output = result.output as string;

      // The theme toggle button should not be present
      expect(output).not.toContain('id="theme-toggle"');
    });

    it("should include book cards", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      expect(output).toContain('class="book"');
      expect(output).toContain("The Great Gatsby");
      expect(output).toContain("F. Scott Fitzgerald");
    });

    it("should include clippings with proper types", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

      // Clipping types become CSS classes: clipping-highlight, clipping-note, clipping-bookmark
      expect(output).toContain("clipping clipping-highlight");
      expect(output).toContain("clipping clipping-note");
      expect(output).toContain("clipping clipping-bookmark");
    });

    it("should include custom title", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { title: "My Reading Notes" });
      const output = result.output as string;

      expect(output).toContain("<title>My Reading Notes</title>");
      expect(output).toContain("<h1>My Reading Notes</h1>");
    });

    it("should include custom CSS when provided", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, {
        customCss: ".custom-class { color: red; }",
      });
      const output = result.output as string;

      expect(output).toContain(".custom-class { color: red; }");
    });

    it("should generate separate files when groupByBook is set", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS, { groupByBook: true });

      expect(result.files).toBeDefined();
      expect(result.files?.length).toBe(3);
    });

    it("should include footer with generation date", async () => {
      const result = await exporter.export(SAMPLE_CLIPPINGS);
      const output = result.output as string;

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
      const output = result.output as string;

      // The malicious content should be escaped (there may be legitimate <script> tags for interactivity)
      expect(output).toContain("&lt;script&gt;alert");
      expect(output).toContain("&lt;/script&gt;");
    });

    it("should handle empty clippings", async () => {
      const result = await exporter.export(EMPTY_CLIPPINGS);

      expect(result.success).toBe(true);
      const output = result.output as string;
      expect(output).toContain("0 books");
      expect(output).toContain("0 highlights");
    });
  });
});
