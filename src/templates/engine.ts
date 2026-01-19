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
import { formatDateHuman } from "#utils/system/dates.js";
import { createHandlebarsInstance } from "./helpers.js";
import {
  BOOK_DEFAULT,
  BOOK_TITLE_DEFAULT,
  CLIPPING_DEFAULT,
  CLIPPING_TITLE_DEFAULT,
  EXPORT_DEFAULT,
  getTemplatePreset,
} from "./presets.js";
import type {
  BookContext,
  ClippingContext,
  CustomTemplates,
  ExportContext,
  TemplateOptions,
  TemplatePreset,
  TemplateType,
} from "./types.js";

// Re-export types for convenience
export type { CustomTemplates, TemplateOptions, TemplateType } from "./types.js";

// ============================================================================
// Template Engine Factory
// ============================================================================

const factoryInstances = new Map<string, TemplateEngine>();

/**
 * Factory for creating/caching TemplateEngine instances.
 */
export const TemplateEngineFactory = {
  /**
   * Get a TemplateEngine instance from cache or create a new one.
   *
   * **Note:** Cached instances are shared across all callers. If you call
   * `registerHelper()` on a cached instance, it affects all consumers using
   * the same preset. If you need isolated helpers, create a new `TemplateEngine`
   * instance directly instead of using the factory.
   *
   * @param config - Template preset name or custom templates object
   * @returns Cached or new TemplateEngine instance
   */
  getEngine(config: TemplatePreset | CustomTemplates = "default"): TemplateEngine {
    // If config is a string (preset name), resolve it to templates first
    // This ensures that "default" and getTemplatePreset("default") map to the same key
    let key: string;
    let templates: CustomTemplates | undefined;

    if (typeof config === "string") {
      // It's a preset name
      key = `preset:${config}`;
      // We don't need to resolve templates yet if it's cached
    } else {
      // It's a custom templates object
      // Stable stringify could be better but JSON.stringify is "good enough" for this
      // strict equality requirement on custom objects
      key = `custom:${JSON.stringify(config)}`;
      templates = config;
    }

    if (!factoryInstances.has(key)) {
      if (typeof config === "string") {
        const collection = getTemplatePreset(config);
        // Convert collection to CustomTemplates
        templates = {
          clipping: collection.clipping,
          book: collection.book,
          export: collection.export,
        };
      }

      if (!templates) {
        throw new Error(`Failed to resolve templates for config: ${config}`);
      }

      factoryInstances.set(key, new TemplateEngine(templates));
    }

    const instance = factoryInstances.get(key);
    if (!instance) {
      throw new Error(`Failed to retrieve TemplateEngine instance for key: ${key}`);
    }

    return instance;
  },

  /**
   * Clear the template engine cache.
   */
  clearCache(): void {
    factoryInstances.clear();
  },
};

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
  private clippingTitleTemplate: Handlebars.TemplateDelegate;
  private bookTitleTemplate: Handlebars.TemplateDelegate;
  private exportTemplate: Handlebars.TemplateDelegate;

  constructor(customTemplates?: CustomTemplates) {
    this.hbs = createHandlebarsInstance();

    // Store raw template strings for partial registration
    const clippingTpl = customTemplates?.clipping ?? CLIPPING_DEFAULT;
    const bookTpl = customTemplates?.book ?? BOOK_DEFAULT;

    // Compile content templates
    this.clippingTemplate = this.hbs.compile(clippingTpl);
    this.bookTemplate = this.hbs.compile(bookTpl);
    this.exportTemplate = this.hbs.compile(customTemplates?.export ?? EXPORT_DEFAULT);

    // Compile title templates
    this.clippingTitleTemplate = this.hbs.compile(
      customTemplates?.clippingTitle ?? CLIPPING_TITLE_DEFAULT,
    );
    this.bookTitleTemplate = this.hbs.compile(customTemplates?.bookTitle ?? BOOK_TITLE_DEFAULT);

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
   * Register a custom helper.
   */
  registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    this.hbs.registerHelper(name, helper);
  }

  /**
   * Convert a Clipping to a ClippingContext for template rendering.
   */
  toClippingContext(clipping: Clipping): ClippingContext {
    const tags = clipping.tags ?? [];
    const dateStr = clipping.date ? clipping.date.toISOString() : "";
    const formattedDate = clipping.date ? formatDateHuman(clipping.date) : "";

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
   * @param clippings - Array of clippings from the same book
   * @param options - Template options for the opt helper
   */
  toBookContext(clippings: Clipping[], options?: TemplateOptions): BookContext {
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
      exportDate: formatDateHuman(now),
      exportDateIso: now.toISOString(),
      tags,
      hasTags: tags.length > 0,
      ...(options !== undefined && { options }),
    };
  }

  /**
   * Create an ExportContext from a grouped map of clippings.
   * @param grouped - Map of book title to clippings
   * @param title - Custom export title
   * @param options - Template options for the opt helper
   */
  toExportContext(
    grouped: Map<string, Clipping[]>,
    title?: string,
    options?: TemplateOptions,
  ): ExportContext {
    const books: BookContext[] = [];
    let totalClippings = 0;
    let totalHighlights = 0;
    let totalNotes = 0;
    let totalBookmarks = 0;

    for (const [, clippings] of grouped) {
      const bookCtx = this.toBookContext(clippings, options);
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
      exportDate: formatDateHuman(now),
      exportDateIso: now.toISOString(),
      ...(title !== undefined && { title }),
      ...(options !== undefined && { options }),
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
   * @param clippings - Clippings from the same book
   * @param options - Template options for the opt helper
   */
  renderBook(clippings: Clipping[], options?: TemplateOptions): string {
    if (clippings.length === 0) return "";
    const context = this.toBookContext(clippings, options);
    return this.bookTemplate(context).trim();
  }

  /**
   * Render a book directly from a context object.
   * Useful when context needs to be modified before rendering.
   */
  renderBookContext(context: BookContext): string {
    return this.bookTemplate(context).trim();
  }

  /**
   * Render a title for a single clipping note.
   * Uses the clippingTitle template (default: "{{page}} {{snippet}}").
   *
   * @param clipping - The clipping to generate a title for
   * @param formattedPage - Pre-formatted page number (e.g., "[0042]")
   * @returns Rendered title string
   */
  renderClippingTitle(clipping: Clipping, formattedPage: string): string {
    const snippet = clipping.content.slice(0, 50).replace(/\n/g, " ").trim();
    const context = {
      ...this.toClippingContext(clipping),
      page: formattedPage,
      pageNumber: clipping.page ?? 0,
      snippet,
    };
    return this.clippingTitleTemplate(context).trim();
  }

  /**
   * Render a title for a book note.
   * Uses the bookTitle template (default: "{{title}}").
   *
   * @param clippings - All clippings from the book
   * @returns Rendered title string
   */
  renderBookTitle(clippings: Clipping[]): string {
    if (clippings.length === 0) return "";
    const context = this.toBookContext(clippings);
    return this.bookTitleTemplate(context).trim();
  }

  /**
   * Render a full export (all books).
   * @param grouped - Map of book title to clippings
   * @param title - Custom export title
   * @param options - Template options for the opt helper
   */
  renderExport(
    grouped: Map<string, Clipping[]>,
    title?: string,
    options?: TemplateOptions,
  ): string {
    const context = this.toExportContext(grouped, title, options);
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
      "noteConsumedAsTags",
      // Options
      "opt",
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
      clippingTitle: ["page", "pageNumber", "snippet", "title", "author", "type", "location"],
      bookTitle: ["title", "author", "highlightCount", "noteCount", "totalClippings"],
    };
  }
}
