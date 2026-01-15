/**
 * User-friendly error formatting.
 *
 * Converts technical error codes into human-readable messages
 * suitable for display to end users.
 *
 * @packageDocumentation
 */

import type {
  AppError,
  ConfigError,
  ExportError,
  FileSystemError,
  ImportError,
  ValidationError,
} from "./types.js";

/**
 * Format an ImportError for user display.
 */
function formatImportError(error: ImportError): string {
  switch (error.code) {
    case "IMPORT_PARSE_ERROR":
      return `Could not parse file: ${error.message}${error.line ? ` (line ${error.line})` : ""}`;
    case "IMPORT_EMPTY_FILE":
      return "The file appears to be empty or contains no valid content.";
    case "IMPORT_INVALID_FORMAT":
      return `Invalid file format: ${error.message}`;
    case "IMPORT_VALIDATION_ERROR":
      return `Validation error: ${error.message}`;
    case "IMPORT_UNKNOWN":
      return `An unexpected error occurred during import: ${error.message}`;
    default: {
      const _exhaustiveCheck: never = error;
      return `Unknown import error: ${(_exhaustiveCheck as ImportError).message}`;
    }
  }
}

/**
 * Format an ExportError for user display.
 */
function formatExportError(error: ExportError): string {
  switch (error.code) {
    case "EXPORT_UNKNOWN_FORMAT":
      return `Unsupported export format${error.format ? `: "${error.format}"` : ""}. Use --help to see available formats.`;
    case "EXPORT_WRITE_FAILED":
      return `Could not write to ${error.path ?? "output file"}: ${error.message}`;
    case "EXPORT_INVALID_OPTIONS":
      return `Invalid export options: ${error.message}`;
    case "EXPORT_NO_CLIPPINGS":
      return "No clippings to export. Please import a file first.";
    case "EXPORT_TEMPLATE_ERROR":
      return `Template error${error.template ? ` in "${error.template}"` : ""}: ${error.message}`;
    case "EXPORT_UNKNOWN":
      return `An unexpected error occurred during export: ${error.message}`;
  }
}

/**
 * Format a ConfigError for user display.
 */
function formatConfigError(error: ConfigError): string {
  switch (error.code) {
    case "CONFIG_NOT_FOUND":
      return `Configuration file not found${error.path ? ` at "${error.path}"` : ""}. Using defaults.`;
    case "CONFIG_INVALID":
      return `Invalid configuration${error.path ? ` in "${error.path}"` : ""}: ${error.message}`;
    case "CONFIG_PARSE_ERROR":
      return `Could not parse configuration${error.path ? ` from "${error.path}"` : ""}: ${error.message}`;
  }
}

/**
 * Format a ValidationError for user display.
 */
function formatValidationError(error: ValidationError): string {
  switch (error.code) {
    case "VALIDATION_SCHEMA":
      return `Validation failed${error.schema ? ` for "${error.schema}"` : ""}: ${error.message}`;
    case "VALIDATION_ARGS":
      return `Invalid arguments: ${error.message}`;
    case "VALIDATION_REQUIRED":
      return `Required ${error.field ? `"${error.field}"` : "field"} is missing.`;
  }
}

/**
 * Format a FileSystemError for user display.
 */
function formatFileSystemError(error: FileSystemError): string {
  switch (error.code) {
    case "FS_NOT_FOUND":
      return `File not found${error.path ? `: "${error.path}"` : ""}`;
    case "FS_PERMISSION_DENIED":
      return `Permission denied${error.path ? ` for "${error.path}"` : ""}. Check file permissions.`;
    case "FS_READ_ERROR":
      return `Could not read ${error.path ?? "file"}: ${error.message}`;
    case "FS_WRITE_ERROR":
      return `Could not write to ${error.path ?? "file"}: ${error.message}`;
  }
}

/**
 * Format any AppError for user display.
 *
 * Converts technical error codes into human-readable messages.
 *
 * @example
 * ```typescript
 * import { formatUserMessage } from '#errors';
 *
 * result.mapErr((error) => {
 *   console.error(formatUserMessage(error));
 *   return error;
 * });
 * ```
 */
export function formatUserMessage(error: AppError): string {
  // Use type guard based on code prefix
  const code = error.code;

  if (code.startsWith("IMPORT_")) {
    return formatImportError(error as ImportError);
  }
  if (code.startsWith("EXPORT_")) {
    return formatExportError(error as ExportError);
  }
  if (code.startsWith("CONFIG_")) {
    return formatConfigError(error as ConfigError);
  }
  if (code.startsWith("VALIDATION_")) {
    return formatValidationError(error as ValidationError);
  }
  if (code.startsWith("FS_")) {
    return formatFileSystemError(error as FileSystemError);
  }

  // Fallback for unknown errors
  return error.message;
}

/**
 * Format error with details for debugging (shows code + message).
 *
 * Useful for log files where you need both the code and message.
 *
 * @param error - The error to format
 * @returns A string in the format `[CODE] message`
 *
 * @example
 * ```typescript
 * import { formatErrorDetail } from '#errors';
 *
 * console.error(formatErrorDetail(error));
 * // Output: [IMPORT_PARSE_ERROR] Invalid JSON syntax
 * ```
 */
export function formatErrorDetail(error: AppError): string {
  return `[${error.code}] ${error.message}`;
}

/**
 * Get the error code from an AppError.
 *
 * Useful for programmatic error handling or logging.
 *
 * @param error - The error to get the code from
 * @returns The error code string
 *
 * @example
 * ```typescript
 * import { getErrorCode } from '#errors';
 *
 * switch (getErrorCode(error)) {
 *   case 'IMPORT_PARSE_ERROR':
 *     // Handle parse error
 *     break;
 *   case 'IMPORT_EMPTY_FILE':
 *     // Handle empty file
 *     break;
 * }
 * ```
 */
export function getErrorCode(error: AppError): string {
  return error.code;
}
