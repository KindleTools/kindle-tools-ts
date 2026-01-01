/**
 * Hashing utilities for generating deterministic IDs.
 *
 * @packageDocumentation
 */

import { createHash } from "node:crypto";
import type { ClippingType } from "../types/clipping.js";

/**
 * Generate a unique, deterministic ID for a clipping.
 *
 * The ID is deterministic: same input = same output ALWAYS.
 * This enables re-importing without creating duplicates.
 *
 * Components of the hash:
 * - Book title (normalized)
 * - Location
 * - Type (highlight/note/bookmark)
 * - First N characters of content
 *
 * NOT included: date (format varies), full content (too long)
 *
 * @param title - Book title (normalized)
 * @param location - Location string (e.g., "123-456")
 * @param type - Clipping type
 * @param contentPrefix - First characters of content (default: 50)
 * @returns 12-character alphanumeric ID
 *
 * @example
 * generateClippingId("The Book", "123-456", "highlight", "This is the content")
 * // Returns: "a1b2c3d4e5f6"
 */
export function generateClippingId(
  title: string,
  location: string,
  type: ClippingType,
  contentPrefix: string,
): string {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedLocation = location.trim();
  const prefix = contentPrefix.slice(0, 50).toLowerCase().trim();

  const input = `${normalizedTitle}|${normalizedLocation}|${type}|${prefix}`;

  const hash = createHash("sha256").update(input, "utf8").digest("hex");

  // Return first 12 characters for a shorter, URL-safe ID
  return hash.slice(0, 12);
}

/**
 * Generate a hash for duplicate detection.
 *
 * More strict than the ID: includes full content.
 *
 * @param title - Book title
 * @param location - Location string
 * @param content - Full content
 * @returns SHA-256 hash (64 characters)
 */
export function generateDuplicateHash(title: string, location: string, content: string): string {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedLocation = location.trim();
  const normalizedContent = content.toLowerCase().trim();

  const input = `${normalizedTitle}|${normalizedLocation}|${normalizedContent}`;

  return createHash("sha256").update(input, "utf8").digest("hex");
}
