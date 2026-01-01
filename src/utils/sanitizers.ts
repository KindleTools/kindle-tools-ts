/**
 * Sanitization utilities for cleaning metadata.
 *
 * @packageDocumentation
 */

import { DRM_LIMIT_MESSAGES, PATTERNS } from "../core/constants.js";
import { normalizeWhitespace } from "./normalizers.js";

/**
 * Result of title/author extraction.
 */
export interface TitleAuthorResult {
  title: string;
  author: string;
}

/**
 * Result of content sanitization.
 */
export interface SanitizedContent {
  content: string;
  isEmpty: boolean;
  isLimitReached: boolean;
}

/**
 * Clean a book title by removing extensions and suffixes.
 *
 * @param title - Raw title from the clippings file
 * @returns Clean title
 *
 * @example
 * sanitizeTitle("My Book.pdf") // "My Book"
 * sanitizeTitle("Another Book_EBOK") // "Another Book"
 */
export function sanitizeTitle(title: string): string {
  let clean = title;

  // Remove file extensions
  clean = clean.replace(PATTERNS.SIDELOAD_EXTENSIONS, "");

  // Remove _EBOK suffix
  clean = clean.replace(PATTERNS.EBOK_SUFFIX, "");

  // Normalize whitespace
  clean = normalizeWhitespace(clean);

  return clean;
}

/**
 * Extract author from title in format "Title (Author)".
 *
 * Handles complex cases like:
 * - "El Quijote (Miguel de Cervantes)" → { title: "El Quijote", author: "Miguel de Cervantes" }
 * - "Book (Author, Name)" → { title: "Book", author: "Author, Name" }
 * - "Book ((Nested) Author)" → { title: "Book", author: "(Nested) Author" }
 * - "Book Without Author" → { title: "Book Without Author", author: "Unknown" }
 *
 * @param rawTitle - Raw title line from the file
 * @returns Extracted title and author
 */
export function extractAuthor(rawTitle: string): TitleAuthorResult {
  const trimmed = rawTitle.trim();

  // Find the last occurrence of opening parenthesis that has a matching close
  let depth = 0;
  let authorStart = -1;

  for (let i = trimmed.length - 1; i >= 0; i--) {
    const char = trimmed[i];

    if (char === ")") {
      depth++;
      if (depth === 1) {
      }
    } else if (char === "(") {
      depth--;
      if (depth === 0) {
        // This is the matching opening paren
        authorStart = i;
        break;
      }
    }
  }

  if (authorStart === -1) {
    // No author found in parentheses
    return {
      title: sanitizeTitle(trimmed),
      author: "Unknown",
    };
  }

  const title = trimmed.substring(0, authorStart).trim();
  const author = trimmed.substring(authorStart + 1, trimmed.length - 1).trim();

  return {
    title: sanitizeTitle(title),
    author: normalizeWhitespace(author) || "Unknown",
  };
}

/**
 * Check if a title indicates a sideloaded book.
 *
 * @param title - Book title
 * @returns True if the book appears to be sideloaded
 */
export function isSideloaded(title: string): boolean {
  return PATTERNS.SIDELOAD_EXTENSIONS.test(title) || PATTERNS.EBOK_SUFFIX.test(title);
}

/**
 * Sanitize clipping content.
 *
 * @param content - Raw content from the file
 * @returns Sanitized content with flags
 */
export function sanitizeContent(content: string): SanitizedContent {
  const trimmed = content.trim();

  // Check if empty
  if (trimmed.length === 0) {
    return {
      content: "",
      isEmpty: true,
      isLimitReached: false,
    };
  }

  // Check for DRM limit messages
  const lowerContent = trimmed.toLowerCase();
  const isLimitReached = DRM_LIMIT_MESSAGES.some((msg) => lowerContent.includes(msg.toLowerCase()));

  return {
    content: normalizeWhitespace(trimmed),
    isEmpty: false,
    isLimitReached,
  };
}
