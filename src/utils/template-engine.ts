/**
 * Template Engine for Markdown exports.
 *
 * Uses Handlebars for user-customizable templates with built-in helpers
 * for formatting clippings, dates, and other common transformations.
 *
 * @packageDocumentation
 */

import Handlebars from "handlebars";
import type { Clipping } from "../types/clipping.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Context for rendering a single clipping.
 */
export interface ClippingContext {
  /** Book title */
  title: string;
  /** Author name */
  author: string;
  /** Clipping content text */
  content: string;
  /** Clipping type: highlight, note, bookmark */
  type: string;
  /** Page number (or "?" if unknown) */
  page: string;
  /** Location raw string (e.g., "105-106") */
  location: string;
  /** Location start number */
  locationStart: number;
  /** Location end number (same as start if single) */
  locationEnd: number;
  /** Formatted date string */
  date: string;
  /** ISO date string */
  dateIso: string;
  /** Linked note content (if any) */
  note: string;
  /** Tags array */
  tags: string[];
  /** Tags as comma-separated string */
  tagsString: string;
  /** Tags as hashtags (e.g., "#tag1 #tag2") */
  tagsHashtags: string;
  /** Word count */
  wordCount: number;
  /** Character count */
  charCount: number;
  /** Book source: kindle or sideload */
  source: string;
  /** True if DRM limit was reached */
  isLimitReached: boolean;
  /** True if content is empty */
  isEmpty: boolean;
  /** True if has a linked note */
  hasNote: boolean;
  /** True if has tags */
  hasTags: boolean;
}

/**
 * Context for rendering a book (group of clippings).
 */
export interface BookContext {
  /** Book title */
  title: string;
  /** Author name */
  author: string;
  /** All clippings for this book */
  clippings: ClippingContext[];
  /** Only highlights */
  highlights: ClippingContext[];
  /** Only notes */
  notes: ClippingContext[];
  /** Only bookmarks */
  bookmarks: ClippingContext[];
  /** Total clipping count */
  totalClippings: number;
  /** Highlight count */
  highlightCount: number;
  /** Note count */
  noteCount: number;
  /** Bookmark count */
  bookmarkCount: number;
  /** Current date (formatted) */
  exportDate: string;
  /** Current date (ISO) */
  exportDateIso: string;
  /** All unique tags from clippings */
  tags: string[];
  /** True if book has any tags */
  hasTags: boolean;
}

/**
 * Context for rendering a full export (all books).
 */
export interface ExportContext {
  /** All books */
  books: BookContext[];
  /** Total book count */
  bookCount: number;
  /** Total clipping count */
  totalClippings: number;
  /** Total highlight count */
  totalHighlights: number;
  /** Total note count */
  totalNotes: number;
  /** Total bookmark count */
  totalBookmarks: number;
  /** Export date (formatted) */
  exportDate: string;
  /** Export date (ISO) */
  exportDateIso: string;
  /** Custom title provided by user */
  title?: string;
}

// Import shared types (re-export for backwards compatibility)
export type { CustomTemplates, TemplateType } from "../types/template.js";

import type { CustomTemplates, TemplateType } from "../types/template.js";

// ============================================================================
// Default Templates
// ============================================================================

/**
 * Default template for a single clipping.
 * Uses Handlebars syntax with built-in helpers.
 */
export const DEFAULT_CLIPPING_TEMPLATE = `{{#if (eq type "highlight")}}
> {{content}}
> — Page {{page}}, Location {{location}}
{{#if hasNote}}

**Note:** {{note}}
{{/if}}
{{#if hasTags}}
**Tags:** {{tagsHashtags}}
{{/if}}
{{else if (eq type "note")}}
📝 **Note (Location {{location}}):**
{{content}}
{{else if (eq type "bookmark")}}
🔖 Bookmark at Location {{location}}{{#if (neq page "?")}} (Page {{page}}){{/if}}
{{/if}}
`;

/**
 * Default template for a book.
 */
export const DEFAULT_BOOK_TEMPLATE = `# {{title}}

*by {{author}}*

---

**📊 Summary:**
- Highlights: {{highlightCount}}
- Notes: {{noteCount}}
- Bookmarks: {{bookmarkCount}}

---

{{#each clippings}}
{{> clipping this}}

{{/each}}
`;

/**
 * Default template for a full export.
 */
export const DEFAULT_EXPORT_TEMPLATE = `# {{#if title}}{{title}}{{else}}Kindle Highlights{{/if}}

*{{totalClippings}} clippings from {{bookCount}} books*
*Exported on {{exportDate}}*

---

{{#each books}}
## {{title}}
*{{author}}*

{{#each clippings}}
{{> clipping this}}

{{/each}}
---

{{/each}}
`;

// ============================================================================
// Handlebars Instance & Helpers
// ============================================================================

/**
 * Create a new Handlebars instance with all custom helpers registered.
 */
export function createHandlebarsInstance(): typeof Handlebars {
  const hbs = Handlebars.create();

  // ========== Comparison Helpers ==========

  /**
   * Check equality: {{#if (eq a b)}}
   */
  hbs.registerHelper("eq", (a: unknown, b: unknown) => a === b);

  /**
   * Check inequality: {{#if (neq a b)}}
   */
  hbs.registerHelper("neq", (a: unknown, b: unknown) => a !== b);

  /**
   * Greater than: {{#if (gt a b)}}
   */
  hbs.registerHelper("gt", (a: number, b: number) => a > b);

  /**
   * Less than: {{#if (lt a b)}}
   */
  hbs.registerHelper("lt", (a: number, b: number) => a < b);

  /**
   * Greater or equal: {{#if (gte a b)}}
   */
  hbs.registerHelper("gte", (a: number, b: number) => a >= b);

  /**
   * Less or equal: {{#if (lte a b)}}
   */
  hbs.registerHelper("lte", (a: number, b: number) => a <= b);

  // ========== Logical Helpers ==========

  /**
   * Logical AND: {{#if (and a b)}}
   */
  hbs.registerHelper("and", (a: unknown, b: unknown) => a && b);

  /**
   * Logical OR: {{#if (or a b)}}
   */
  hbs.registerHelper("or", (a: unknown, b: unknown) => a || b);

  /**
   * Logical NOT: {{#if (not a)}}
   */
  hbs.registerHelper("not", (a: unknown) => !a);

  // ========== String Helpers ==========

  /**
   * Uppercase: {{upper text}}
   */
  hbs.registerHelper("upper", (str: string) => (str ? str.toUpperCase() : ""));

  /**
   * Lowercase: {{lower text}}
   */
  hbs.registerHelper("lower", (str: string) => (str ? str.toLowerCase() : ""));

  /**
   * Capitalize first letter: {{capitalize text}}
   */
  hbs.registerHelper("capitalize", (str: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "",
  );

  /**
   * Truncate text: {{truncate text 100}}
   */
  hbs.registerHelper("truncate", (str: string, length: number) => {
    if (!str) return "";
    if (str.length <= length) return str;
    return `${str.slice(0, length)}…`;
  });

  /**
   * Replace text: {{replace text "old" "new"}}
   */
  hbs.registerHelper("replace", (str: string, search: string, replacement: string) =>
    str ? str.replace(new RegExp(search, "g"), replacement) : "",
  );

  /**
   * Join array: {{join tags ", "}}
   */
  hbs.registerHelper("join", (arr: string[], separator: string) =>
    Array.isArray(arr) ? arr.join(separator) : "",
  );

  // ========== Date Helpers ==========

  /**
   * Format date: {{formatDate date "short"}}
   * Options: "short", "long", "iso", "relative"
   */
  hbs.registerHelper("formatDate", (dateStr: string, format: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    switch (format) {
      case "short":
        return date.toLocaleDateString();
      case "long":
        return date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "iso":
        return date.toISOString();
      case "relative": {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "today";
        if (diffDays === 1) return "yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
      }
      default:
        return date.toISOString().split("T")[0];
    }
  });

  // ========== Number Helpers ==========

  /**
   * Add: {{add a b}}
   */
  hbs.registerHelper("add", (a: number, b: number) => a + b);

  /**
   * Subtract: {{sub a b}}
   */
  hbs.registerHelper("sub", (a: number, b: number) => a - b);

  /**
   * Multiply: {{mul a b}}
   */
  hbs.registerHelper("mul", (a: number, b: number) => a * b);

  /**
   * Divide: {{div a b}}
   */
  hbs.registerHelper("div", (a: number, b: number) => (b !== 0 ? a / b : 0));

  /**
   * Round: {{round num}}
   */
  hbs.registerHelper("round", (num: number) => Math.round(num));

  // ========== Content Helpers ==========

  /**
   * Format as blockquote: {{blockquote text}}
   */
  hbs.registerHelper("blockquote", (str: string) => {
    if (!str) return "";
    return str
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  });

  /**
   * Wrap with emphasis: {{emphasis text}}
   */
  hbs.registerHelper("emphasis", (str: string) => (str ? `*${str}*` : ""));

  /**
   * Wrap with strong: {{strong text}}
   */
  hbs.registerHelper("strong", (str: string) => (str ? `**${str}**` : ""));

  /**
   * Format tags as hashtags: {{hashtags tags}}
   */
  hbs.registerHelper("hashtags", (tags: string[]) =>
    Array.isArray(tags) ? tags.map((t) => `#${t}`).join(" ") : "",
  );

  /**
   * Format tags for YAML frontmatter: {{yamlTags tags}}
   */
  hbs.registerHelper("yamlTags", (tags: string[]) => {
    if (!Array.isArray(tags) || tags.length === 0) return "[]";
    return `\n${tags.map((t) => `  - ${t}`).join("\n")}`;
  });

  // ========== Conditional Block Helpers ==========

  /**
   * Include block only for highlights: {{#isHighlight}}...{{/isHighlight}}
   */
  hbs.registerHelper(
    "isHighlight",
    function (this: ClippingContext, options: Handlebars.HelperOptions) {
      return this.type === "highlight" ? options.fn(this) : options.inverse(this);
    },
  );

  /**
   * Include block only for notes: {{#isNote}}...{{/isNote}}
   */
  hbs.registerHelper("isNote", function (this: ClippingContext, options: Handlebars.HelperOptions) {
    return this.type === "note" ? options.fn(this) : options.inverse(this);
  });

  /**
   * Include block only for bookmarks: {{#isBookmark}}...{{/isBookmark}}
   */
  hbs.registerHelper(
    "isBookmark",
    function (this: ClippingContext, options: Handlebars.HelperOptions) {
      return this.type === "bookmark" ? options.fn(this) : options.inverse(this);
    },
  );

  return hbs;
}

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
    const clippingTpl = customTemplates?.clipping ?? DEFAULT_CLIPPING_TEMPLATE;
    const bookTpl = customTemplates?.book ?? DEFAULT_BOOK_TEMPLATE;

    // Compile templates
    this.clippingTemplate = this.hbs.compile(clippingTpl);
    this.bookTemplate = this.hbs.compile(bookTpl);
    this.exportTemplate = this.hbs.compile(customTemplates?.export ?? DEFAULT_EXPORT_TEMPLATE);

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
