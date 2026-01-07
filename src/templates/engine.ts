/**
 * Template Engine for Markdown exports.
 *
 * Uses Handlebars for user-customizable templates with built-in helpers
 * for formatting clippings, dates, and other common transformations.
 *
 * @packageDocumentation
 */

import type Handlebars from "handlebars";
import type { Clipping } from "#app-types/clipping.js";
import { createHandlebarsInstance } from "./helpers.js";
import { BOOK_DEFAULT, CLIPPING_DEFAULT, EXPORT_DEFAULT } from "./presets.js";
import type {
  BookContext,
  ClippingContext,
  CustomTemplates,
  ExportContext,
  TemplateType,
} from "./types.js";

// Re-export types for convenience
export type { CustomTemplates, TemplateType } from "./types.js";

// ============================================================================
// Template Engine Class
// ============================================================================

/**
 * Template engine for rendering Markdown exports.
 *
 * Usage:
 * ```typescript
 * const engine = new TemplateEngine();
 *
 * // Use default templates
 * const markdown = engine.renderBook(clippings);
 *
 * // Use custom template
 * engine.setTemplate('clipping', '> {{content}} ({{page}})');
 * const customMarkdown = engine.renderBook(clippings);
 * ```
 */
export class TemplateEngine {
  private hbs: typeof Handlebars;
  private clippingTemplate: Handlebars.TemplateDelegate;
  private bookTemplate: Handlebars.TemplateDelegate;
  private exportTemplate: Handlebars.TemplateDelegate;

  constructor(customTemplates?: CustomTemplates) {
    this.hbs = createHandlebarsInstance();

    // Store raw template strings for partial registration
    const clippingTpl = customTemplates?.clipping ?? CLIPPING_DEFAULT;
    const bookTpl = customTemplates?.book ?? BOOK_DEFAULT;

    // Compile templates
    this.clippingTemplate = this.hbs.compile(clippingTpl);
    this.bookTemplate = this.hbs.compile(bookTpl);
    this.exportTemplate = this.hbs.compile(customTemplates?.export ?? EXPORT_DEFAULT);

    // Register partials for use in other templates ({{> partialName}})
    this.hbs.registerPartial("clipping", clippingTpl);
    this.hbs.registerPartial("book", bookTpl);
  }

  /**
   * Set a custom template at runtime.
   */
  setTemplate(type: TemplateType, template: string): void {
    const compiled = this.hbs.compile(template);

    switch (type) {
      case "clipping":
        this.clippingTemplate = compiled;
        this.hbs.registerPartial("clipping", template);
        break;
      case "book":
        this.bookTemplate = compiled;
        this.hbs.registerPartial("book", template);
        break;
      case "export":
        this.exportTemplate = compiled;
        break;
    }
  }

  /**
   * Convert a Clipping to a ClippingContext for template rendering.
   */
  toClippingContext(clipping: Clipping): ClippingContext {
    const tags = clipping.tags ?? [];
    const dateStr = clipping.date ? clipping.date.toISOString() : "";
    const formattedDate = clipping.date
      ? clipping.date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

    return {
      title: clipping.title,
      author: clipping.author,
      content: clipping.content,
      type: clipping.type,
      page: clipping.page?.toString() ?? "?",
      location: clipping.location.raw,
      locationStart: clipping.location.start,
      locationEnd: clipping.location.end ?? clipping.location.start,
      date: formattedDate,
      dateIso: dateStr,
      note: clipping.note ?? "",
      tags,
      tagsString: tags.join(", "),
      tagsHashtags: tags.map((t) => `#${t}`).join(" "),
      wordCount: clipping.wordCount,
      charCount: clipping.charCount,
      source: clipping.source,
      isLimitReached: clipping.isLimitReached,
      isEmpty: clipping.isEmpty,
      hasNote: !!clipping.note,
      hasTags: tags.length > 0,
    };
  }

  /**
   * Create a BookContext from an array of clippings.
   */
  toBookContext(clippings: Clipping[]): BookContext {
    const first = clippings[0];
    const contexts = clippings.map((c) => this.toClippingContext(c));
    const now = new Date();

    // Aggregate unique tags from all clippings
    const allTags = new Set<string>();
    for (const clipping of clippings) {
      if (clipping.tags) {
        for (const tag of clipping.tags) {
          allTags.add(tag);
        }
      }
    }
    const tags = Array.from(allTags).sort();

    return {
      title: first?.title ?? "Unknown",
      author: first?.author ?? "Unknown",
      clippings: contexts,
      highlights: contexts.filter((c) => c.type === "highlight"),
      notes: contexts.filter((c) => c.type === "note"),
      bookmarks: contexts.filter((c) => c.type === "bookmark"),
      totalClippings: contexts.length,
      highlightCount: contexts.filter((c) => c.type === "highlight").length,
      noteCount: contexts.filter((c) => c.type === "note").length,
      bookmarkCount: contexts.filter((c) => c.type === "bookmark").length,
      exportDate: now.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      exportDateIso: now.toISOString(),
      tags,
      hasTags: tags.length > 0,
    };
  }

  /**
   * Create an ExportContext from a grouped map of clippings.
   */
  toExportContext(grouped: Map<string, Clipping[]>, title?: string): ExportContext {
    const books: BookContext[] = [];
    let totalClippings = 0;
    let totalHighlights = 0;
    let totalNotes = 0;
    let totalBookmarks = 0;

    for (const [, clippings] of grouped) {
      const bookCtx = this.toBookContext(clippings);
      books.push(bookCtx);
      totalClippings += bookCtx.totalClippings;
      totalHighlights += bookCtx.highlightCount;
      totalNotes += bookCtx.noteCount;
      totalBookmarks += bookCtx.bookmarkCount;
    }

    const now = new Date();

    return {
      books,
      bookCount: books.length,
      totalClippings,
      totalHighlights,
      totalNotes,
      totalBookmarks,
      exportDate: now.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      exportDateIso: now.toISOString(),
      ...(title !== undefined && { title }),
    };
  }

  /**
   * Render a single clipping.
   */
  renderClipping(clipping: Clipping): string {
    const context = this.toClippingContext(clipping);
    return this.clippingTemplate(context).trim();
  }

  /**
   * Render a book (collection of clippings from the same book).
   */
  renderBook(clippings: Clipping[]): string {
    if (clippings.length === 0) return "";
    const context = this.toBookContext(clippings);
    return this.bookTemplate(context).trim();
  }

  /**
   * Render a full export (all books).
   */
  renderExport(grouped: Map<string, Clipping[]>, title?: string): string {
    const context = this.toExportContext(grouped, title);
    return this.exportTemplate(context).trim();
  }

  /**
   * Validate a template string.
   * Returns null if valid, error message if invalid.
   */
  validateTemplate(template: string): string | null {
    try {
      this.hbs.precompile(template);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid template";
    }
  }

  /**
   * Get a list of available helpers.
   */
  static getAvailableHelpers(): string[] {
    return [
      // Comparison
      "eq",
      "neq",
      "gt",
      "lt",
      "gte",
      "lte",
      // Logical
      "and",
      "or",
      "not",
      // String
      "upper",
      "lower",
      "capitalize",
      "truncate",
      "replace",
      "join",
      // Date
      "formatDate",
      // Number
      "add",
      "sub",
      "mul",
      "div",
      "round",
      // Content
      "blockquote",
      "emphasis",
      "strong",
      "hashtags",
      "yamlTags",
      // Block
      "isHighlight",
      "isNote",
      "isBookmark",
    ];
  }

  /**
   * Get available template variables for each context type.
   */
  static getAvailableVariables(): Record<TemplateType, string[]> {
    return {
      clipping: [
        "title",
        "author",
        "content",
        "type",
        "page",
        "location",
        "locationStart",
        "locationEnd",
        "date",
        "dateIso",
        "note",
        "tags",
        "tagsString",
        "tagsHashtags",
        "wordCount",
        "charCount",
        "source",
        "isLimitReached",
        "isEmpty",
        "hasNote",
        "hasTags",
      ],
      book: [
        "title",
        "author",
        "clippings",
        "highlights",
        "notes",
        "bookmarks",
        "totalClippings",
        "highlightCount",
        "noteCount",
        "bookmarkCount",
        "exportDate",
        "exportDateIso",
        "tags",
        "hasTags",
      ],
      export: [
        "books",
        "bookCount",
        "totalClippings",
        "totalHighlights",
        "totalNotes",
        "totalBookmarks",
        "exportDate",
        "exportDateIso",
        "title",
      ],
    };
  }
}
