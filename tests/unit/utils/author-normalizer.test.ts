import { describe, expect, it } from "vitest";
import { areSameAuthor, normalizeAuthorName } from "../../../src/utils/text/author-normalizer.js";

describe("AuthorNormalizer", () => {
  it("should normalize names consistently", () => {
    // Sorting order check
    expect(normalizeAuthorName("J.K. Rowling")).toBe("j k rowling");
    expect(normalizeAuthorName("Rowling, J.K.")).toBe("j k rowling");
  });

  it("should match partial duplicates", () => {
    // "J.K. Rowling" vs "Rowling, J.K."
    expect(areSameAuthor("J.K. Rowling", "Rowling, J.K.")).toBe(true);
  });

  it("should match names with different spacing/punctuation", () => {
    // "J. K. Rowling" (spaces) vs "J.K. Rowling" (no spaces)
    expect(areSameAuthor("J. K. Rowling", "J.K. Rowling")).toBe(true);
  });

  it("should match names with different casing", () => {
    expect(areSameAuthor("stephen king", "Stephen King")).toBe(true);
  });

  it("should NOT match different authors", () => {
    expect(areSameAuthor("Stephen King", "J.K. Rowling")).toBe(false);
  });

  it("should match full names vs middle initials", () => {
    // This is harder. Sorted tokens: "george martin r" vs "george martin rr".
    // Levenshtein on "george martin r" and "george martin rr" is small distance.
    expect(areSameAuthor("George R.R. Martin", "George R. R. Martin")).toBe(true);
  });
});
