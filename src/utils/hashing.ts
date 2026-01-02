/**
 * Hashing utilities for generating deterministic IDs.
 *
 * @packageDocumentation
 */

import type { ClippingType } from "../types/clipping.js";

/**
 * Simple hash function that works in both Node.js and browser.
 * Uses node:crypto in Node.js, fast hash in browser.
 * @param input - String to hash
 * @returns 64-character hex string
 */
export function sha256Sync(input: string): string {
  // Check if we're in Node.js
  if (typeof globalThis.process !== "undefined" && globalThis.process.versions?.node) {
    // Node.js environment - use crypto module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("node:crypto");
    return crypto.createHash("sha256").update(input, "utf8").digest("hex");
  }

  // Browser environment - use simple hash (djb2 + fnv1a combined for better distribution)
  // Note: This is NOT cryptographically secure, but sufficient for ID generation
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Combine into a hex string (16 chars from each hash = 32 chars total, pad to 64)
  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");

  // Repeat to get 64 chars like SHA-256
  return (part1 + part2).repeat(4);
}

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

  const hash = sha256Sync(input);

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
 * @returns Hash string (64 characters)
 */
export function generateDuplicateHash(title: string, location: string, content: string): string {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedLocation = location.trim();
  const normalizedContent = content.toLowerCase().trim();

  const input = `${normalizedTitle}|${normalizedLocation}|${normalizedContent}`;

  return sha256Sync(input);
}
