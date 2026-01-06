import { describe, expect, it } from "vitest";
import type { Clipping } from "#app-types/clipping.js";
import {
  createHandlebarsInstance,
  DEFAULT_BOOK_TEMPLATE,
  DEFAULT_CLIPPING_TEMPLATE,
  DEFAULT_EXPORT_TEMPLATE,
  TemplateEngine,
} from "#templates/engine.js";
import { getAvailablePresets, getTemplatePreset } from "#templates/index.js";

// Helper to create a mock clipping
function createMockClipping(overrides: Partial<Clipping> = {}): Clipping {
  return {
    id: "abc123def456",
    title: "The Great Gatsby",
    titleRaw: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    authorRaw: "F. Scott Fitzgerald",
    content: "So we beat on, boats against the current, borne back ceaselessly into the past.",
    contentRaw: "So we beat on, boats against the current, borne back ceaselessly into the past.",
    type: "highlight",
    page: 180,
    location: { raw: "2842-2843", start: 2842, end: 2843 },
    date: new Date("2024-01-15T10:30:00Z"),
    dateRaw: "Monday, January 15, 2024 10:30 AM",
    isLimitReached: false,
    isEmpty: false,
    language: "en",
    source: "kindle",
    wordCount: 14,
    charCount: 80,
    blockIndex: 0,
    ...overrides,
  };
}

describe("TemplateEngine", () => {
  describe("createHandlebarsInstance", () => {
    it("should create a Handlebars instance with helpers", () => {
      const hbs = createHandlebarsInstance();
      expect(hbs).toBeDefined();
      expect(typeof hbs.compile).toBe("function");
    });

    it("should register comparison helpers", () => {
      const hbs = createHandlebarsInstance();
      const template = hbs.compile("{{#if (eq a b)}}equal{{else}}not equal{{/if}}");

      expect(template({ a: 1, b: 1 })).toBe("equal");
      expect(template({ a: 1, b: 2 })).toBe("not equal");
    });

    it("should register string helpers", () => {
      const hbs = createHandlebarsInstance();

      expect(hbs.compile("{{upper text}}")({ text: "hello" })).toBe("HELLO");
      expect(hbs.compile("{{lower text}}")({ text: "HELLO" })).toBe("hello");
      expect(hbs.compile("{{capitalize text}}")({ text: "hello" })).toBe("Hello");
      expect(hbs.compile("{{truncate text 5}}")({ text: "hello world" })).toBe("hello…");
    });

    it("should register join helper", () => {
      const hbs = createHandlebarsInstance();
      const template = hbs.compile("{{join tags ', '}}");

      expect(template({ tags: ["one", "two", "three"] })).toBe("one, two, three");
    });

    it("should handle blockquote helper", () => {
      const hbs = createHandlebarsInstance();
      const template = hbs.compile("{{{blockquote text}}}");

      expect(template({ text: "line1\nline2" })).toBe("> line1\n> line2");
    });
  });

  describe("TemplateEngine class", () => {
    it("should create with default templates", () => {
      const engine = new TemplateEngine();
      expect(engine).toBeDefined();
    });

    it("should create with custom templates", () => {
      const engine = new TemplateEngine({
        clipping: "Custom: {{content}}",
      });
      expect(engine).toBeDefined();
    });

    it("should convert Clipping to ClippingContext", () => {
      const engine = new TemplateEngine();
      const clipping = createMockClipping();
      const context = engine.toClippingContext(clipping);

      expect(context.title).toBe("The Great Gatsby");
      expect(context.author).toBe("F. Scott Fitzgerald");
      expect(context.content).toBe(
        "So we beat on, boats against the current, borne back ceaselessly into the past.",
      );
      expect(context.type).toBe("highlight");
      expect(context.page).toBe("180");
      expect(context.location).toBe("2842-2843");
      expect(context.wordCount).toBe(14);
      expect(context.hasNote).toBe(false);
      expect(context.hasTags).toBe(false);
    });

    it("should handle clipping with note and tags", () => {
      const engine = new TemplateEngine();
      const clipping = createMockClipping({
        note: "This is profound",
        tags: ["philosophy", "quote"],
      });
      const context = engine.toClippingContext(clipping);

      expect(context.hasNote).toBe(true);
      expect(context.note).toBe("This is profound");
      expect(context.hasTags).toBe(true);
      expect(context.tags).toEqual(["philosophy", "quote"]);
      expect(context.tagsString).toBe("philosophy, quote");
      expect(context.tagsHashtags).toBe("#philosophy #quote");
    });

    it("should handle missing page number", () => {
      const engine = new TemplateEngine();
      const clipping = createMockClipping({ page: null });
      const context = engine.toClippingContext(clipping);

      expect(context.page).toBe("?");
    });

    it("should create BookContext correctly", () => {
      const engine = new TemplateEngine();
      const clippings = [
        createMockClipping({ type: "highlight" }),
        createMockClipping({ type: "highlight", content: "Another highlight" }),
        createMockClipping({ type: "note", content: "A note" }),
        createMockClipping({ type: "bookmark", content: "" }),
      ];
      const context = engine.toBookContext(clippings);

      expect(context.title).toBe("The Great Gatsby");
      expect(context.author).toBe("F. Scott Fitzgerald");
      expect(context.totalClippings).toBe(4);
      expect(context.highlightCount).toBe(2);
      expect(context.noteCount).toBe(1);
      expect(context.bookmarkCount).toBe(1);
      expect(context.highlights.length).toBe(2);
      expect(context.notes.length).toBe(1);
      expect(context.bookmarks.length).toBe(1);
    });

    it("should render a single clipping", () => {
      const engine = new TemplateEngine({
        clipping: "> {{content}}\n— {{author}}",
      });
      const clipping = createMockClipping();
      const output = engine.renderClipping(clipping);

      expect(output).toContain("So we beat on");
      expect(output).toContain("F. Scott Fitzgerald");
    });

    it("should render a book", () => {
      const engine = new TemplateEngine({
        clipping: "- {{content}}",
        book: "# {{title}}\n{{#each clippings}}{{> clipping this}}\n{{/each}}",
      });
      const clippings = [createMockClipping(), createMockClipping({ content: "Second highlight" })];
      const output = engine.renderBook(clippings);

      expect(output).toContain("# The Great Gatsby");
      expect(output).toContain("So we beat on");
      expect(output).toContain("Second highlight");
    });

    it("should render a full export", () => {
      const engine = new TemplateEngine({
        clipping: "- {{content}}",
        book: "## {{title}}\n{{#each clippings}}{{> clipping this}}\n{{/each}}",
        export: "# Export\n{{#each books}}{{> book this}}{{/each}}",
      });

      // Create grouped map
      const grouped = new Map<string, Clipping[]>();
      grouped.set("The Great Gatsby", [createMockClipping()]);
      grouped.set("1984", [
        createMockClipping({ title: "1984", author: "George Orwell", content: "Big Brother" }),
      ]);

      const output = engine.renderExport(grouped);

      expect(output).toContain("# Export");
      expect(output).toContain("## The Great Gatsby");
      expect(output).toContain("## 1984");
    });

    it("should validate templates", () => {
      const engine = new TemplateEngine();

      expect(engine.validateTemplate("{{content}}")).toBeNull();
      expect(engine.validateTemplate("{{#if valid}}ok{{/if}}")).toBeNull();
      // Unclosed block is a real syntax error
      expect(engine.validateTemplate("{{#if valid}}unclosed")).not.toBeNull();
    });

    it("should set template at runtime", () => {
      const engine = new TemplateEngine();
      engine.setTemplate("clipping", "NEW: {{content}}");

      const output = engine.renderClipping(createMockClipping());
      expect(output).toContain("NEW:");
    });
  });

  describe("Default templates", () => {
    it("should have valid default clipping template", () => {
      const engine = new TemplateEngine();
      expect(engine.validateTemplate(DEFAULT_CLIPPING_TEMPLATE)).toBeNull();
    });

    it("should have valid default book template", () => {
      const engine = new TemplateEngine();
      expect(engine.validateTemplate(DEFAULT_BOOK_TEMPLATE)).toBeNull();
    });

    it("should have valid default export template", () => {
      const engine = new TemplateEngine();
      expect(engine.validateTemplate(DEFAULT_EXPORT_TEMPLATE)).toBeNull();
    });

    it("should render highlight correctly with default template", () => {
      const engine = new TemplateEngine();
      const clipping = createMockClipping({ type: "highlight" });
      const output = engine.renderClipping(clipping);

      expect(output).toContain(">");
      expect(output).toContain("So we beat on");
      expect(output).toContain("Page 180");
      expect(output).toContain("Location 2842-2843");
    });

    it("should render note correctly with default template", () => {
      const engine = new TemplateEngine();
      const clipping = createMockClipping({ type: "note", content: "My note" });
      const output = engine.renderClipping(clipping);

      expect(output).toContain("📝");
      expect(output).toContain("Note");
      expect(output).toContain("My note");
    });

    it("should render bookmark correctly with default template", () => {
      const engine = new TemplateEngine();
      const clipping = createMockClipping({ type: "bookmark" });
      const output = engine.renderClipping(clipping);

      expect(output).toContain("🔖");
      expect(output).toContain("Bookmark");
    });
  });

  describe("Template presets", () => {
    it("should have available presets", () => {
      const presets = getAvailablePresets();

      expect(presets).toContain("default");
      expect(presets).toContain("minimal");
      expect(presets).toContain("obsidian");
      expect(presets).toContain("notion");
      expect(presets).toContain("academic");
      expect(presets).toContain("compact");
      expect(presets).toContain("verbose");
    });

    it("should return valid preset collections", () => {
      const preset = getTemplatePreset("obsidian");

      expect(preset.clipping).toBeDefined();
      expect(preset.book).toBeDefined();
      expect(preset.export).toBeDefined();
    });

    it("should validate all preset templates", () => {
      const engine = new TemplateEngine();
      const presets = getAvailablePresets();

      for (const presetName of presets) {
        const preset = getTemplatePreset(presetName);

        expect(engine.validateTemplate(preset.clipping)).toBeNull();
        expect(engine.validateTemplate(preset.book)).toBeNull();
        expect(engine.validateTemplate(preset.export)).toBeNull();
      }
    });

    it("should render with minimal preset", () => {
      const preset = getTemplatePreset("minimal");
      const engine = new TemplateEngine(preset);

      const output = engine.renderClipping(createMockClipping());
      expect(output).toContain("So we beat on");
      // Minimal should be shorter than default
      expect(output.length).toBeLessThan(200);
    });

    it("should render with obsidian preset (YAML frontmatter)", () => {
      const preset = getTemplatePreset("obsidian");
      const engine = new TemplateEngine(preset);

      const output = engine.renderBook([createMockClipping()]);
      expect(output).toContain("---");
      expect(output).toContain("title:");
      expect(output).toContain("author:");
      expect(output).toContain("tags:");
    });
  });

  describe("Static methods", () => {
    it("should list available helpers", () => {
      const helpers = TemplateEngine.getAvailableHelpers();

      expect(helpers).toContain("eq");
      expect(helpers).toContain("upper");
      expect(helpers).toContain("blockquote");
      expect(helpers).toContain("isHighlight");
    });

    it("should list available variables", () => {
      const variables = TemplateEngine.getAvailableVariables();

      expect(variables.clipping).toContain("content");
      expect(variables.clipping).toContain("author");
      expect(variables.book).toContain("highlightCount");
      expect(variables.export).toContain("bookCount");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty clippings array for book", () => {
      const engine = new TemplateEngine();
      const output = engine.renderBook([]);

      expect(output).toBe("");
    });

    it("should handle clipping without date", () => {
      const engine = new TemplateEngine();
      const clipping = createMockClipping({ date: null });
      const context = engine.toClippingContext(clipping);

      expect(context.date).toBe("");
      expect(context.dateIso).toBe("");
    });

    it("should handle special characters in content", () => {
      const engine = new TemplateEngine({ clipping: "{{content}}" });
      const clipping = createMockClipping({
        content: 'He said "hello" & goodbye <script>',
      });
      const output = engine.renderClipping(clipping);

      // Handlebars should escape HTML by default
      expect(output).toContain("&amp;");
      expect(output).toContain("&lt;");
    });

    it("should handle triple braces for unescaped output", () => {
      const engine = new TemplateEngine({ clipping: "{{{content}}}" });
      const clipping = createMockClipping({
        content: "<b>bold</b>",
      });
      const output = engine.renderClipping(clipping);

      // Triple braces should NOT escape
      expect(output).toContain("<b>bold</b>");
    });
  });
});
