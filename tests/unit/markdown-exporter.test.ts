import type { Clipping } from "@app-types/clipping.js";
import { MarkdownExporter } from "@exporters/markdown.exporter.js";
import { describe, expect, it } from "vitest";

// Helper to create a mock clipping
function createMockClipping(overrides: Partial<Clipping> = {}): Clipping {
  return {
    id: "abc123def456",
    title: "Test Book",
    titleRaw: "Test Book",
    author: "Test Author",
    authorRaw: "Test Author",
    content: "This is a test highlight content.",
    contentRaw: "This is a test highlight content.",
    type: "highlight",
    page: 42,
    location: { raw: "100-105", start: 100, end: 105 },
    date: new Date("2024-01-15T10:30:00Z"),
    dateRaw: "Monday, January 15, 2024 10:30 AM",
    isLimitReached: false,
    isEmpty: false,
    language: "en",
    source: "kindle",
    wordCount: 6,
    charCount: 34,
    blockIndex: 0,
    ...overrides,
  };
}

describe("MarkdownExporter", () => {
  describe("basic export", () => {
    it("should export single clipping", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Test Book");
      expect(result.output).toContain("Test Author");
      expect(result.output).toContain("This is a test highlight content");
    });

    it("should have correct name and extension", () => {
      const exporter = new MarkdownExporter();

      expect(exporter.name).toBe("markdown");
      expect(exporter.extension).toBe(".md");
    });

    it("should handle empty clippings array", async () => {
      const exporter = new MarkdownExporter();

      const result = await exporter.export([]);

      expect(result.success).toBe(true);
    });

    it("should export multiple clippings from same book", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [
        createMockClipping({ content: "First highlight" }),
        createMockClipping({ content: "Second highlight" }),
        createMockClipping({ type: "note", content: "A note" }),
      ];

      const result = await exporter.export(clippings);

      expect(result.success).toBe(true);
      expect(result.output).toContain("First highlight");
      expect(result.output).toContain("Second highlight");
      expect(result.output).toContain("A note");
    });
  });

  describe("grouped export", () => {
    it("should create separate files when groupByBook is true", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [
        createMockClipping({ title: "Book One", content: "Content from book one" }),
        createMockClipping({ title: "Book Two", content: "Content from book two" }),
      ];

      const result = await exporter.export(clippings, { groupByBook: true });

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files?.length).toBe(2);

      const filePaths = result.files?.map((f) => f.path);
      expect(filePaths).toContain("Book One.md");
      expect(filePaths).toContain("Book Two.md");
    });

    it("should sanitize filenames with special characters", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping({ title: 'Book: A <Test> "Title"' })];

      const result = await exporter.export(clippings, { groupByBook: true });

      expect(result.success).toBe(true);
      expect(result.files?.[0].path).not.toContain(":");
      expect(result.files?.[0].path).not.toContain("<");
      expect(result.files?.[0].path).not.toContain(">");
      expect(result.files?.[0].path).not.toContain('"');
    });
  });

  describe("template presets", () => {
    it("should use default template by default", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings);

      expect(result.success).toBe(true);
      expect(result.output).toContain(">"); // Default uses blockquote
    });

    it("should use minimal preset", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings, { templatePreset: "minimal" });

      expect(result.success).toBe(true);
      expect(result.output).toContain("This is a test highlight content");
    });

    it("should use obsidian preset with YAML frontmatter", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings, {
        templatePreset: "obsidian",
        groupByBook: true,
      });

      expect(result.success).toBe(true);
      expect(result.files?.[0].content).toContain("---");
      expect(result.files?.[0].content).toContain("title:");
      expect(result.files?.[0].content).toContain("author:");
    });

    it("should use notion preset", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings, {
        templatePreset: "notion",
        groupByBook: true,
      });

      expect(result.success).toBe(true);
      expect(result.files?.[0].content).toContain("📚");
      expect(result.files?.[0].content).toContain("Property");
      expect(result.files?.[0].content).toContain("Value");
    });

    it("should use academic preset", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings, {
        templatePreset: "academic",
        groupByBook: true,
      });

      expect(result.success).toBe(true);
      expect(result.files?.[0].content).toContain("Annotated Passages");
      expect(result.files?.[0].content).toContain("References");
    });
  });

  describe("custom templates", () => {
    it("should use custom clipping template", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings, {
        customTemplates: {
          clipping: "CUSTOM: {{content}} by {{author}}",
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("CUSTOM:");
      expect(result.output).toContain("This is a test highlight content");
      expect(result.output).toContain("by Test Author");
    });

    it("should use custom book template", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings, {
        groupByBook: true,
        customTemplates: {
          clipping: "- {{content}}",
          book: "BOOK: {{title}}\n{{#each clippings}}{{> clipping this}}\n{{/each}}",
        },
      });

      expect(result.success).toBe(true);
      expect(result.files?.[0].content).toContain("BOOK: Test Book");
    });

    it("should handle notes and tags in custom templates", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [
        createMockClipping({
          note: "An important note",
          tags: ["important", "review"],
        }),
      ];

      const result = await exporter.export(clippings, {
        customTemplates: {
          clipping: "{{content}} | Note: {{note}} | Tags: {{tagsString}}",
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("An important note");
      expect(result.output).toContain("important, review");
    });

    it("should prefer customTemplates over templatePreset", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings, {
        templatePreset: "obsidian", // This should be ignored for clipping template
        customTemplates: {
          clipping: "CUSTOM_WINS: {{content}}",
        },
      });

      expect(result.success).toBe(true);
      // Custom clipping template should be used
      expect(result.output).toContain("CUSTOM_WINS:");
      // Default export template uses --- as separators, that's expected
      // What matters is that our custom clipping template was used
      expect(result.output).toContain("CUSTOM_WINS: This is a test highlight content");
    });
  });

  describe("template validation", () => {
    it("should validate valid template", () => {
      const exporter = new MarkdownExporter();

      expect(exporter.validateTemplate("{{content}}")).toBeNull();
      expect(exporter.validateTemplate("{{#if hasNote}}yes{{/if}}")).toBeNull();
    });

    it("should return error for invalid template", () => {
      const exporter = new MarkdownExporter();

      const error = exporter.validateTemplate("{{#if unclosed");
      expect(error).not.toBeNull();
    });
  });

  describe("static methods", () => {
    it("should list available presets", () => {
      const presets = MarkdownExporter.getAvailablePresets();

      expect(presets).toContain("default");
      expect(presets).toContain("obsidian");
      expect(presets).toContain("notion");
    });

    it("should list available helpers", () => {
      const helpers = MarkdownExporter.getAvailableHelpers();

      expect(helpers).toContain("eq");
      expect(helpers).toContain("upper");
      expect(helpers).toContain("blockquote");
    });

    it("should list available variables", () => {
      const variables = MarkdownExporter.getAvailableVariables();

      expect(variables.clipping).toContain("content");
      expect(variables.book).toContain("highlightCount");
    });
  });

  describe("error handling", () => {
    it("should return error result for invalid template in options", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [createMockClipping()];

      const result = await exporter.export(clippings, {
        customTemplates: {
          clipping: "{{#if}}broken template{{/if}}",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("real-world scenarios", () => {
    it("should export book with mixed clipping types", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [
        createMockClipping({ type: "highlight", content: "Highlight 1" }),
        createMockClipping({ type: "highlight", content: "Highlight 2", note: "My thought" }),
        createMockClipping({ type: "note", content: "Standalone note" }),
        createMockClipping({ type: "bookmark" }),
      ];

      const result = await exporter.export(clippings, { groupByBook: true });

      expect(result.success).toBe(true);
      const content = result.files?.[0].content ?? "";
      expect(content).toContain("Highlight 1");
      expect(content).toContain("Highlight 2");
      expect(content).toContain("My thought");
      expect(content).toContain("Standalone note");
      expect(content).toContain("Bookmark");
    });

    it("should export multiple books", async () => {
      const exporter = new MarkdownExporter();
      const clippings = [
        createMockClipping({ title: "Book A", author: "Author 1", content: "From A" }),
        createMockClipping({ title: "Book A", author: "Author 1", content: "Also from A" }),
        createMockClipping({ title: "Book B", author: "Author 2", content: "From B" }),
      ];

      const result = await exporter.export(clippings, { groupByBook: true });

      expect(result.success).toBe(true);
      expect(result.files?.length).toBe(2);

      const bookA = result.files?.find((f) => f.path === "Book A.md");
      const bookB = result.files?.find((f) => f.path === "Book B.md");

      expect(bookA?.content).toContain("From A");
      expect(bookA?.content).toContain("Also from A");
      expect(bookB?.content).toContain("From B");
    });
  });
});
