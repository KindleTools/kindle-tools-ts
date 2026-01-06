/**
 * Shared utilities for exporters.
 *
 * These utilities are used by multiple exporters to avoid code duplication.
 * Following the composition-over-inheritance principle for maximum flexibility.
 *
 * @packageDocumentation
 */

import type { Clipping } from "../../types/clipping.js";
import type { AuthorCase, ExportedFile, ExportResult } from "../../types/exporter.js";
import { toError } from "../../utils/errors.js";

/**
 * Default value for unknown authors.
 */
export const DEFAULT_UNKNOWN_AUTHOR = "Unknown Author";

/**
 * Default title for export collections.
 */
export const DEFAULT_EXPORT_TITLE = "Kindle Highlights";

/**
 * Collect all unique tags from clippings and default tags.
 *
 * @param clippings - Array of clippings to extract tags from
 * @param defaultTags - Default tags to include
 * @param includeClippingTags - Whether to include tags from clippings
 * @returns Set of unique tags
 */
export function collectAllTags(
  clippings: Clipping[],
  defaultTags: string[] = [],
  includeClippingTags: boolean = true,
): Set<string> {
  const tags = new Set<string>(defaultTags);

  if (includeClippingTags) {
    for (const clipping of clippings) {
      if (clipping.tags) {
        for (const tag of clipping.tags) {
          tags.add(tag);
        }
      }
    }
  }

  return tags;
}

/**
 * Create a successful export result.
 *
 * @param output - The main output content
 * @param files - Optional array of exported files (for multi-file exports)
 * @returns A successful ExportResult
 */
export function createSuccessResult(
  output: string | Uint8Array,
  files?: ExportedFile[],
): ExportResult {
  const result: ExportResult = {
    success: true,
    output,
  };

  if (files !== undefined) {
    result.files = files;
  }

  return result;
}

/**
 * Create an error export result.
 *
 * @param error - The error that occurred
 * @returns A failed ExportResult
 */
export function createErrorResult(error: unknown): ExportResult {
  return {
    success: false,
    output: "",
    error: toError(error),
  };
}

/**
 * Sanitize a string for use as a filename.
 *
 * Removes invalid characters and limits length to avoid filesystem issues.
 *
 * @param name - The name to sanitize
 * @param maxLength - Maximum length (default: 100)
 * @returns Safe filename
 */
export function sanitizeFilename(name: string, maxLength = 100): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Apply case transformation to a string.
 *
 * @param str - The string to transform
 * @param authorCase - Case transformation to apply
 * @returns Transformed string
 */
export function applyCase(str: string, authorCase: AuthorCase): string {
  switch (authorCase) {
    case "uppercase":
      return str.toUpperCase();
    case "lowercase":
      return str.toLowerCase();
    default:
      return str;
  }
}

/**
 * Escape special characters for YAML strings.
 *
 * @param str - String to escape
 * @returns Escaped string safe for YAML
 */
export function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, " ");
}

/**
 * Escape HTML special characters.
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Escape a value for CSV format.
 *
 * Wraps in quotes and escapes internal quotes by doubling them.
 * Also replaces newlines with spaces.
 *
 * @param value - Value to escape
 * @returns Escaped string safe for CSV
 */
export function escapeCSV(value: string): string {
  if (!value) return '""';

  // Replace newlines with spaces
  const cleaned = value.replace(/[\r\n]+/g, " ");

  // Escape quotes by doubling them
  const escaped = cleaned.replace(/"/g, '""');

  // Wrap in quotes
  return `"${escaped}"`;
}

/**
 * Wrap an async operation with error handling to produce an ExportResult.
 *
 * @param operation - The async operation to execute
 * @returns ExportResult based on success or failure
 */
export async function withExportErrorHandling(
  operation: () => Promise<ExportResult>,
): Promise<ExportResult> {
  try {
    return await operation();
  } catch (error) {
    return createErrorResult(error);
  }
}

/**
 * Generate a file path based on folder structure.
 *
 * @param baseFolder - Base output folder (e.g., "books")
 * @param author - Sanitized author name
 * @param title - Sanitized book title
 * @param structure - Folder structure strategy
 * @param extension - File extension (default: .md)
 * @returns Relative file path
 */
export function generateFilePath(
  baseFolder: string,
  author: string,
  title: string,
  structure: import("../../types/exporter.js").FolderStructure,
  extension = ".md",
): string {
  // Ensure extension has dot
  const ext = extension.startsWith(".") ? extension : `.${extension}`;

  // Clean inputs just in case, though they should be sanitized by caller
  const cleanTitle = title.trim();
  const cleanAuthor = author.trim();

  // If baseFolder is ".", treat as empty (root)
  const prefix = baseFolder && baseFolder !== "." ? `${baseFolder}/` : "";

  switch (structure) {
    case "by-book":
      return `${prefix}${cleanTitle}/${cleanTitle}${ext}`;
    case "by-author":
      return `${prefix}${cleanAuthor}/${cleanTitle}${ext}`;
    case "by-author-book":
      return `${prefix}${cleanAuthor}/${cleanTitle}/${cleanTitle}${ext}`;
    default: // flat
      return `${prefix}${cleanTitle}${ext}`;
  }
}
