import { describe, expect, it } from "vitest";
import { createHandlebarsInstance } from "#templates/helpers.js";

describe("template-helpers", () => {
  const hbs = createHandlebarsInstance();

  // Helper to run a helper function directly
  // This assumes we know the internal registry structure or we compile strings.
  // Compiling strings is safer API usage.
  const run = (template: string, context: any) => hbs.compile(template)(context);

  describe("Comparison Helpers", () => {
    it("eq", () => {
      expect(run("{{eq a b}}", { a: 1, b: 1 })).toBe("true");
      expect(run("{{eq a b}}", { a: 1, b: 2 })).toBe("false");
    });
    it("neq", () => {
      expect(run("{{neq a b}}", { a: 1, b: 2 })).toBe("true");
      expect(run("{{neq a b}}", { a: 1, b: 1 })).toBe("false");
    });
    it("gt", () => {
      expect(run("{{gt a b}}", { a: 2, b: 1 })).toBe("true");
      expect(run("{{gt a b}}", { a: 1, b: 2 })).toBe("false");
    });
    it("lt", () => {
      expect(run("{{lt a b}}", { a: 1, b: 2 })).toBe("true");
      expect(run("{{lt a b}}", { a: 2, b: 1 })).toBe("false");
    });
    it("gte", () => {
      expect(run("{{gte a b}}", { a: 2, b: 1 })).toBe("true");
      expect(run("{{gte a b}}", { a: 1, b: 1 })).toBe("true");
      expect(run("{{gte a b}}", { a: 1, b: 2 })).toBe("false");
    });
    it("lte", () => {
      expect(run("{{lte a b}}", { a: 1, b: 2 })).toBe("true");
      expect(run("{{lte a b}}", { a: 1, b: 1 })).toBe("true");
      expect(run("{{lte a b}}", { a: 2, b: 1 })).toBe("false");
    });
  });

  describe("Logical Helpers", () => {
    it("and", () => {
      expect(run("{{and a b}}", { a: true, b: true })).toBe("true");
      expect(run("{{and a b}}", { a: true, b: false })).toBe("false");
    });
    it("or", () => {
      expect(run("{{or a b}}", { a: true, b: false })).toBe("true");
      expect(run("{{or a b}}", { a: false, b: false })).toBe("false");
    });
    it("not", () => {
      expect(run("{{not a}}", { a: false })).toBe("true");
      expect(run("{{not a}}", { a: true })).toBe("false");
    });
  });

  describe("String Helpers", () => {
    it("upper", () => {
      expect(run("{{upper s}}", { s: "abc" })).toBe("ABC");
      expect(run("{{upper s}}", { s: "" })).toBe("");
    });
    it("lower", () => {
      expect(run("{{lower s}}", { s: "ABC" })).toBe("abc");
      expect(run("{{lower s}}", { s: "" })).toBe("");
    });
    it("capitalize", () => {
      expect(run("{{capitalize s}}", { s: "abc" })).toBe("Abc");
      expect(run("{{capitalize s}}", { s: "" })).toBe("");
    });
    it("truncate", () => {
      expect(run("{{truncate s 5}}", { s: "hello world" })).toBe("hello…");
      expect(run("{{truncate s 5}}", { s: "hey" })).toBe("hey");
      expect(run("{{truncate s 5}}", { s: "" })).toBe("");
    });
    it("replace", () => {
      expect(run("{{replace s 'l' 'x'}}", { s: "hello" })).toBe("hexxo");
      expect(run("{{replace s 'l' 'x'}}", { s: "" })).toBe("");
    });
    it("join", () => {
      expect(run("{{join a ', '}}", { a: ["a", "b"] })).toBe("a, b");
      expect(run("{{join a ', '}}", { a: "not-array" })).toBe("");
    });
  });

  describe("Date Helpers", () => {
    it("formatDate", () => {
      const d = "2024-01-01T00:00:00Z";
      expect(run("{{formatDate d 'short'}}", { d })).not.toBe("");
      expect(run("{{formatDate d 'long'}}", { d })).not.toBe("");
      expect(run("{{formatDate d 'iso'}}", { d })).toBe("2024-01-01T00:00:00.000Z");
      expect(run("{{formatDate d 'unknown'}}", { d })).toBe("2024-01-01"); // default
      expect(run("{{formatDate d ''}}", { d: "" })).toBe("");
      expect(run("{{formatDate d ''}}", { d: "invalid" })).toBe("invalid");
    });

    it("formatDate relative", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      expect(run("{{formatDate d 'relative'}}", { d: now.toISOString() })).toBe("today");
      expect(run("{{formatDate d 'relative'}}", { d: yesterday.toISOString() })).toBe("yesterday");
      expect(run("{{formatDate d 'relative'}}", { d: weekAgo.toISOString() })).toMatch(
        /weeks ago|7 days ago/,
      );
    });
  });

  describe("Number Helpers", () => {
    it("math operations", () => {
      expect(run("{{add 1 2}}", {})).toBe("3");
      expect(run("{{sub 5 2}}", {})).toBe("3");
      expect(run("{{mul 2 3}}", {})).toBe("6");
      expect(run("{{div 6 2}}", {})).toBe("3");
      expect(run("{{div 6 0}}", {})).toBe("0"); // safe divide
      expect(run("{{round 1.6}}", {})).toBe("2");
    });
  });

  describe("Content Helpers", () => {
    it("blockquote", () => {
      expect(run("{{blockquote s}}", { s: "a\nb" })).toBe("&gt; a\n&gt; b"); // Handlebars escapes > chars
      expect(run("{{{blockquote s}}}", { s: "a\nb" })).toBe("> a\n> b");
      expect(run("{{blockquote s}}", { s: "" })).toBe("");
    });
    it("emphasis", () => {
      expect(run("{{emphasis s}}", { s: "text" })).toBe("*text*");
      expect(run("{{emphasis s}}", { s: "" })).toBe("");
    });
    it("strong", () => {
      expect(run("{{strong s}}", { s: "text" })).toBe("**text**");
      expect(run("{{strong s}}", { s: "" })).toBe("");
    });
    it("hashtags", () => {
      expect(run("{{hashtags t}}", { t: ["a", "b"] })).toBe("#a #b");
      expect(run("{{hashtags t}}", { t: "not-array" })).toBe("");
    });
    it("yamlTags", () => {
      expect(run("{{yamlTags t}}", { t: ["a", "b"] })).toBe("\n  - a\n  - b");
      expect(run("{{yamlTags t}}", { t: [] })).toBe("[]");
      expect(run("{{yamlTags t}}", { t: "not-array" })).toBe("[]");
    });
  });

  describe("Conditional Block Helpers", () => {
    it("isHighlight", () => {
      expect(run("{{#isHighlight}}yes{{else}}no{{/isHighlight}}", { type: "highlight" })).toBe(
        "yes",
      );
      expect(run("{{#isHighlight}}yes{{else}}no{{/isHighlight}}", { type: "note" })).toBe("no");
    });
    it("isNote", () => {
      expect(run("{{#isNote}}yes{{else}}no{{/isNote}}", { type: "note" })).toBe("yes");
      expect(run("{{#isNote}}yes{{else}}no{{/isNote}}", { type: "highlight" })).toBe("no");
    });
    it("isBookmark", () => {
      expect(run("{{#isBookmark}}yes{{else}}no{{/isBookmark}}", { type: "bookmark" })).toBe("yes");
      expect(run("{{#isBookmark}}yes{{else}}no{{/isBookmark}}", { type: "highlight" })).toBe("no");
    });
  });
});
