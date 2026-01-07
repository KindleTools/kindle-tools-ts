/**
 * Handlebars helpers configuration.
 *
 * @packageDocumentation
 */

import Handlebars from "handlebars";
import type { ClippingContext } from "./types.js";

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
