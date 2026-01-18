/**
 * Hashing utilities for generating deterministic IDs.
 *
 * @packageDocumentation
 */

import type { ClippingType } from "#app-types/clipping.js";
import { PROCESSING_THRESHOLDS } from "#domain/rules.js";
import { sha256Sync } from "#utils/security/hashing.js";

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
  const prefix = contentPrefix
    .slice(0, PROCESSING_THRESHOLDS.IDENTITY_CONTENT_PREFIX_LENGTH)
    .toLowerCase()
    .trim();

  const input = `${normalizedTitle}|${normalizedLocation}|${type}|${prefix}`;

  const hash = sha256Sync(input);

  // Return first 12 characters for a shorter, URL-safe ID
  return hash.slice(0, PROCESSING_THRESHOLDS.IDENTITY_ID_LENGTH);
}

/**
 * Generate a hash for duplicate detection.
 *
 * More strict than the ID: includes full content.
 *
 * @param title - Book title
 * @param location - Location string
 * @param content - Full content
 * @returns Hash string (64 characters)
 */
export function generateDuplicateHash(title: string, location: string, content: string): string {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedLocation = location.trim();
  const normalizedContent = content.toLowerCase().trim();

  const input = `${normalizedTitle}|${normalizedLocation}|${normalizedContent}`;

  return sha256Sync(input);
}
