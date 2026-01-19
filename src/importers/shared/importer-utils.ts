/**
 * Shared utilities for importers.
 *
 * These utilities are used by multiple importers to avoid code duplication.
 *
 * @packageDocumentation
 */

import type { Clipping, ClippingLocation } from "#app-types/clipping.js";
import { type ImportResult, type ImportSuccess, importSuccess, importUnknownError } from "#errors";
import { sha256Sync } from "#utils/security/hashing.js";

/**
 * Generate a deterministic ID for imported clippings that don't have one.
 *
 * Uses content hash + index for determinism. Re-importing the same file
 * will generate the same IDs, enabling consistent deduplication.
 *
 * @param content - Content to hash (e.g., clipping content or row data)
 * @param index - Row/item index for uniqueness within the same content
 * @returns Generated ID string (deterministic)
 */
export function generateImportId(content: string, index: number): string {
  const hash = sha256Sync(`${content}|${index}`).slice(0, 8);
  return `imp_${hash}_${index.toString(36)}`;
}

/**
 * Parse a location string into a ClippingLocation object.
 *
 * Handles formats like "123", "123-456", or empty strings.
 *
 * @param loc - Location string to parse
 * @returns Parsed ClippingLocation
 */
export function parseLocationString(loc: string | undefined | null): ClippingLocation {
  if (!loc) {
    return { raw: "", start: 0, end: null };
  }

  const parts = loc.split("-");
  const start = Number.parseInt(parts[0] ?? "0", 10) || 0;
  const end = parts[1] ? Number.parseInt(parts[1], 10) : null;
  return { raw: loc, start, end };
}

/**
 * Create a successful import result.
 *
 * @param clippings - Imported clippings
 * @param warnings - Optional warnings
 * @param meta - Optional metadata
 * @returns ImportResult
 */
export function createSuccessImport(
  clippings: Clipping[],
  warnings: string[] = [],
  meta?: { [key: string]: unknown },
): ImportResult {
  return importSuccess(clippings, warnings, meta as ImportSuccess["meta"]);
}

/**
 * Create a failed import result.
 *
 * @param error - The error that occurred
 * @param warnings - Optional warnings collected before failure
 * @returns ImportResult
 */
export function createErrorImport(error: unknown, warnings: string[] = []): ImportResult {
  return importUnknownError(error, warnings);
}
