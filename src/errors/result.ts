/**
 * Result types for the application using neverthrow.
 *
 * This module provides unified Result types that integrate neverthrow
 * with our centralized error types for consistent error handling
 * across the entire application.
 *
 * @packageDocumentation
 */

import { err, errAsync, ok, okAsync, type Result, type ResultAsync } from "neverthrow";
import type { Clipping } from "#app-types/clipping.js";
import type {
  AppError,
  ExportError,
  ImportError,
  ImportErrorDetail,
  ValidationIssue,
} from "./types.js";

// =============================================================================
// Re-export neverthrow utilities
// =============================================================================

export { err, errAsync, ok, okAsync };
export type { Result, ResultAsync };

// =============================================================================
// Application Result Types
// =============================================================================

/**
 * Generic application result.
 *
 * Use this for operations that can fail with any AppError.
 */
export type AppResult<T> = Result<T, AppError>;

/**
 * Generic async application result.
 */
export type AppResultAsync<T> = ResultAsync<T, AppError>;

// =============================================================================
// Import Results
// =============================================================================

/**
 * Successful import data.
 */
export interface ImportSuccess {
  /** Imported clippings */
  clippings: Clipping[];
  /** Warnings generated during import */
  warnings: string[];
  /** Additional metadata */
  meta?: {
    /** Detected language code */
    detectedLanguage?: string;
    /** Source format */
    format?: string;
    /** Any additional metadata */
    [key: string]: unknown;
  };
}

/**
 * Result of an import operation.
 */
export type ImportResult = Result<ImportSuccess, ImportError>;

/**
 * Async result of an import operation.
 */
export type ImportResultAsync = ResultAsync<ImportSuccess, ImportError>;

// =============================================================================
// Export Results
// =============================================================================

/**
 * A single exported file.
 */
export interface ExportedFile {
  /** Relative path of the file */
  path: string;
  /** File content (string for text, Uint8Array for binary) */
  content: string | Uint8Array;
}

/**
 * Successful export data.
 */
export interface ExportSuccess {
  /** Main output content */
  output: string | Uint8Array;
  /** Individual files for multi-file exports (Obsidian, Joplin) */
  files?: ExportedFile[];
}

/**
 * Result of an export operation.
 */
export type ExportResult = Result<ExportSuccess, ExportError>;

/**
 * Async result of an export operation.
 */
export type ExportResultAsync = ResultAsync<ExportSuccess, ExportError>;

// =============================================================================
// Factory Functions - Import Errors
// =============================================================================

/**
 * Create a successful import result.
 */
export function importSuccess(
  clippings: Clipping[],
  warnings: string[] = [],
  meta?: ImportSuccess["meta"],
): ImportResult {
  const result: ImportSuccess = { clippings, warnings };
  if (meta !== undefined) {
    result.meta = meta;
  }
  return ok(result);
}

/**
 * Create a parse error import result.
 */
export function importParseError(
  message: string,
  options?: { path?: string; line?: number; cause?: unknown; warnings?: string[] },
): ImportResult {
  const error: ImportError = {
    code: "IMPORT_PARSE_ERROR",
    message,
  };
  if (options?.path !== undefined) (error as { path?: string }).path = options.path;
  if (options?.line !== undefined) (error as { line?: number }).line = options.line;
  if (options?.cause !== undefined) (error as { cause?: unknown }).cause = options.cause;
  if (options?.warnings !== undefined)
    (error as { warnings?: string[] }).warnings = options.warnings;
  return err(error);
}

/**
 * Create an empty file import error.
 */
export function importEmptyFile(message = "File is empty", warnings?: string[]): ImportResult {
  const error: ImportError = {
    code: "IMPORT_EMPTY_FILE",
    message,
  };
  if (warnings !== undefined) {
    (error as { warnings?: string[] }).warnings = warnings;
  }
  return err(error);
}

/**
 * Create an invalid format import error.
 */
export function importInvalidFormat(
  message: string,
  options?: { issues?: ValidationIssue[]; warnings?: string[] },
): ImportResult {
  const error: ImportError = {
    code: "IMPORT_INVALID_FORMAT",
    message,
  };
  if (options?.issues !== undefined)
    (error as { issues?: ValidationIssue[] }).issues = options.issues;
  if (options?.warnings !== undefined)
    (error as { warnings?: string[] }).warnings = options.warnings;
  return err(error);
}

/**
 * Create a validation error import result (for multiple row errors).
 */
export function importValidationError(
  message: string,
  errors: ImportErrorDetail[],
  warnings?: string[],
): ImportResult {
  const error: ImportError = {
    code: "IMPORT_VALIDATION_ERROR",
    message,
    errors,
  };
  if (warnings !== undefined) {
    (error as { warnings?: string[] }).warnings = warnings;
  }
  return err(error);
}

/**
 * Create an unknown import error.
 */
export function importUnknownError(error: unknown, warnings?: string[]): ImportResult {
  const message = error instanceof Error ? error.message : String(error);
  const errorObj: ImportError = {
    code: "IMPORT_UNKNOWN",
    message,
    cause: error,
  };
  if (warnings !== undefined) {
    (errorObj as { warnings?: string[] }).warnings = warnings;
  }
  return err(errorObj);
}

// =============================================================================
// Factory Functions - Export Errors
// =============================================================================

/**
 * Create a successful export result.
 */
export function exportSuccess(output: string | Uint8Array, files?: ExportedFile[]): ExportResult {
  const result: ExportSuccess = { output };
  if (files !== undefined) {
    result.files = files;
  }
  return ok(result);
}

/**
 * Create an unknown format export error.
 */
export function exportUnknownFormat(format: string): ExportResult {
  return err({
    code: "EXPORT_UNKNOWN_FORMAT",
    message: `Unknown export format: ${format}`,
    format,
  });
}

/**
 * Create an invalid options export error.
 */
export function exportInvalidOptions(message: string, issues?: ValidationIssue[]): ExportResult {
  const error: ExportError = {
    code: "EXPORT_INVALID_OPTIONS",
    message,
  };
  if (issues !== undefined) {
    (error as { issues?: ValidationIssue[] }).issues = issues;
  }
  return err(error);
}

/**
 * Create a no clippings export error.
 */
export function exportNoClippings(): ExportResult {
  return err({
    code: "EXPORT_NO_CLIPPINGS",
    message: "No clippings to export",
  });
}

/**
 * Create a template error export result.
 */
export function exportTemplateError(
  message: string,
  options?: { template?: string; cause?: unknown },
): ExportResult {
  const error: ExportError = {
    code: "EXPORT_TEMPLATE_ERROR",
    message,
  };
  if (options?.template !== undefined) (error as { template?: string }).template = options.template;
  if (options?.cause !== undefined) (error as { cause?: unknown }).cause = options.cause;
  return err(error);
}

/**
 * Create a write failed export error.
 */
export function exportWriteFailed(
  message: string,
  options?: { path?: string; cause?: unknown },
): ExportResult {
  const error: ExportError = {
    code: "EXPORT_WRITE_FAILED",
    message,
  };
  if (options?.path !== undefined) (error as { path?: string }).path = options.path;
  if (options?.cause !== undefined) (error as { cause?: unknown }).cause = options.cause;
  return err(error);
}

/**
 * Create an unknown export error.
 */
export function exportUnknownError(error: unknown): ExportResult {
  const message = error instanceof Error ? error.message : String(error);
  return err({
    code: "EXPORT_UNKNOWN",
    message,
    cause: error,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert Zod issues to ValidationIssue format.
 * Filters out symbol paths since ValidationIssue only supports string | number.
 */
export function zodIssuesToValidationIssues(
  zodIssues: ReadonlyArray<{ path: PropertyKey[]; message: string; code: string }>,
): ValidationIssue[] {
  return zodIssues.map((issue) => ({
    path: issue.path.filter((p): p is string | number => typeof p !== "symbol"),
    message: issue.message,
    code: String(issue.code),
  }));
}

/**
 * Wrap an unknown error as an AppError.
 */
export function toAppError(error: unknown): AppError {
  if (typeof error === "object" && error !== null && "code" in error) {
    // Already an AppError-like structure
    return error as AppError;
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    code: "UNKNOWN",
    message,
    cause: error,
  };
}
