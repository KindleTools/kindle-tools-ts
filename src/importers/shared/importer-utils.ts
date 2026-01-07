/**
 * Shared utilities for importers.
 *
 * These utilities are used by multiple importers to avoid code duplication.
 *
 * @packageDocumentation
 */

import type { Clipping, ClippingLocation } from "#app-types/clipping.js";
import { toError } from "#utils/system/errors.js";
import type { ImportResult } from "../importer.types.js";

/**
 * Generate a unique ID for imported clippings that don't have one.
 *
 * Uses timestamp + index for uniqueness.
 *
 * @param index - Row/item index
 * @returns Generated ID string
 */
export function generateImportId(index: number): string {
  return `imp_${Date.now().toString(36)}_${index.toString(36)}`;
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
  if (meta) {
    return {
      success: true,
      clippings,
      warnings,
      meta,
    };
  }
  return {
    success: true,
    clippings,
    warnings,
  };
}

/**
 * Create a failed import result.
 *
 * @param error - The error that occurred
 * @param warnings - Optional warnings collected before failure
 * @returns ImportResult
 */
export function createErrorImport(error: unknown, warnings: string[] = []): ImportResult {
  return {
    success: false,
    clippings: [],
    warnings,
    error: toError(error),
  };
}
