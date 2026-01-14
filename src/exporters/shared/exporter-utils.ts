/**
 * Shared utilities for exporters.
 *
 * These utilities are used by multiple exporters to avoid code duplication.
 * Following the composition-over-inheritance principle for maximum flexibility.
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import {
  AppException,
  type ExportedFile,
  type ExportResult,
  exportSuccess,
  exportUnknownError,
} from "#errors";
import { DEFAULTS } from "../../config/defaults.js";
import { SYSTEM_LIMITS } from "../../core/limits.js";
import { sanitizeCSVField } from "../../utils/security/csv-sanitizer.js";
import type { AuthorCase, FolderStructure } from "../core/types.js";

/**
 * Default value for unknown authors.
 */
export const DEFAULT_UNKNOWN_AUTHOR = DEFAULTS.UNKNOWN_AUTHOR;

/**
 * Default title for export collections.
 */
export const DEFAULT_EXPORT_TITLE = DEFAULTS.EXPORT_TITLE;

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
  return exportSuccess(output, files);
}

/**
 * Create an error export result.
 *
 * @param error - The error that occurred
 * @returns A failed ExportResult
 */
export function createErrorResult(error: unknown): ExportResult {
  return exportUnknownError(error);
}

/**
 * Windows reserved filenames that cannot be used directly.
 * These names are reserved by the operating system and will cause issues
 * if used as filenames on Windows systems.
 *
 * Includes COM0-9 and LPT0-9 as per official Microsoft documentation.
 *
 * @see https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
 */
const WINDOWS_RESERVED_NAMES = [
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM0",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT0",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
];

/**
 * Sanitize a string for use as a filename across all major operating systems.
 *
 * This function handles:
 * - **Windows**: Reserved names (CON, PRN, AUX, NUL, COM0-9, LPT0-9), invalid chars (<>:"/\|?*)
 * - **macOS**: Colon (:) is replaced (used as path separator in HFS+)
 * - **Linux**: Forward slash (/) is replaced (path separator)
 * - **All OS**: Control characters (ASCII 0-31), trailing dots/spaces, length limits
 *
 * @param name - The name to sanitize
 * @param maxLength - Maximum length (default: 100)
 * @returns Safe filename compatible with Windows, macOS, and Linux
 *
 * @example
 * ```typescript
 * sanitizeFilename('File: "Name"') // Returns "File- -Name-"
 * sanitizeFilename('CON') // Returns "_CON"
 * sanitizeFilename('NUL.txt') // Returns "_NUL.txt"
 * sanitizeFilename('file...') // Returns "file"
 * sanitizeFilename('hello\x00world') // Returns "hello-world"
 * ```
 */
export function sanitizeFilename(
  name: string,
  maxLength: number = SYSTEM_LIMITS.MAX_FILENAME_LENGTH,
): string {
  let safe = name
    // Remove control characters (ASCII 0-31) - problematic on all OS
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally matching control chars for sanitization
    .replace(/[\x00-\x1f]/g, "-")
    // Replace Windows/macOS/Linux invalid characters
    // Windows: < > : " / \ | ? *
    // macOS: : (path separator in HFS+)
    // Linux: / (path separator)
    .replace(/[<>:"/\\|?*]/g, "-")
    // Normalize multiple spaces to single space
    .replace(/\s+/g, " ")
    // Trim leading/trailing whitespace
    .trim()
    // Remove trailing dots (Windows doesn't handle these well)
    .replace(/\.+$/, "");

  // Check if the base name (without extension) is a Windows reserved name
  const dotIndex = safe.indexOf(".");
  const baseName = dotIndex > 0 ? safe.slice(0, dotIndex) : safe;

  if (WINDOWS_RESERVED_NAMES.includes(baseName.toUpperCase())) {
    safe = `_${safe}`;
  }

  // Handle empty result after sanitization
  if (safe.length === 0) {
    safe = "_";
  }

  return safe.slice(0, maxLength);
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
 * **Security:** This function applies CSV injection protection by prefixing
 * potentially dangerous formula characters (=, +, -, @, tab, CR) with a
 * single quote to prevent spreadsheet applications from executing them.
 *
 * @param value - Value to escape
 * @returns Escaped string safe for CSV
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */
export function escapeCSV(value: string): string {
  if (!value) return '""';

  // First, sanitize against CSV injection attacks
  const sanitized = sanitizeCSVField(value);

  // Replace newlines with spaces
  const cleaned = sanitized.replace(/[\r\n]+/g, " ");

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
  structure: FolderStructure,
  extension = ".md",
): string {
  // Ensure extension has dot
  const ext = extension.startsWith(".") ? extension : `.${extension}`;

  // Clean inputs to prevent slash injection and filesystem issues
  const cleanTitle = sanitizeFilename(title.trim());
  const cleanAuthor = sanitizeFilename(author.trim());

  // Prevent "." or ".." as filenames which could cause traversal
  if (cleanTitle === "." || cleanTitle === "..") {
    throw new AppException({
      code: "VALIDATION_ARGS",
      message: `Invalid title: '${cleanTitle}' is reserved`,
      args: { title: cleanTitle },
    });
  }
  if (cleanAuthor === "." || cleanAuthor === "..") {
    throw new AppException({
      code: "VALIDATION_ARGS",
      message: `Invalid author: '${cleanAuthor}' is reserved`,
      args: { author: cleanAuthor },
    });
  }

  // Check baseFolder for traversal
  if (baseFolder && baseFolder !== ".") {
    const parts = baseFolder.split(/[/\\]/);
    if (parts.includes("..")) {
      throw new AppException({
        code: "VALIDATION_ARGS",
        message: `Path traversal detected in base folder: '${baseFolder}'`,
        args: { baseFolder },
      });
    }
  }

  // If baseFolder is ".", treat as empty (root)
  const prefix = baseFolder && baseFolder !== "." ? `${baseFolder}/` : "";

  switch (structure) {
    case "by-book":
      return `${prefix}${cleanTitle}/${cleanTitle}${ext}`;
    case "by-author":
      return `${prefix}${cleanAuthor}/${cleanTitle}${ext}`;
    case "by-author-book":
      // Author is a folder here, ensure it's not empty if something went wrong with sanitization
      // (sanitizeFilename can return empty string if input was all bad chars)
      // but assuming reasonable input or default "Unknown"
      return `${prefix}${cleanAuthor}/${cleanTitle}/${cleanTitle}${ext}`;
    default: // flat
      return `${prefix}${cleanTitle}${ext}`;
  }
}
