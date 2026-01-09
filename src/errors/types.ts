/**
 * Centralized error types using discriminated unions.
 *
 * This module defines all application error types as discriminated unions,
 * providing type-safe error handling with compile-time guarantees.
 *
 * Design decisions:
 * - Discriminated unions over class hierarchy (more idiomatic TypeScript)
 * - Codes as discriminant for exhaustive pattern matching
 * - Context object for additional error metadata
 * - Integration with neverthrow Result pattern
 *
 * @packageDocumentation
 */

import type {
  ConfigErrorCode,
  ExportErrorCode,
  FileSystemErrorCode,
  ImportErrorCode,
  ValidationErrorCode,
} from "./codes.js";

// =============================================================================
// Common Error Context
// =============================================================================

/**
 * Zod validation issue representation.
 * Mirrors Zod's issue structure without hard dependency.
 */
export interface ValidationIssue {
  /** Path to the invalid field */
  path: (string | number)[];
  /** Human-readable error message */
  message: string;
  /** Validation error code */
  code: string;
}

/**
 * Base context shared by all errors.
 */
export interface BaseErrorContext {
  /** Warnings collected before the error occurred */
  warnings?: string[];
  /** Original error if this wraps another error */
  cause?: unknown;
}

// =============================================================================
// Domain-Specific Error Types
// =============================================================================

/**
 * Import operation error.
 *
 * Returned when importing clippings from various formats fails.
 */
export type ImportError =
  | {
      code: "IMPORT_PARSE_ERROR";
      message: string;
      /** File path if available */
      path?: string;
      /** Line number where parsing failed */
      line?: number;
      cause?: unknown;
      warnings?: string[];
    }
  | {
      code: "IMPORT_EMPTY_FILE";
      message: string;
      warnings?: string[];
    }
  | {
      code: "IMPORT_INVALID_FORMAT";
      message: string;
      /** Validation issues from schema */
      issues?: ValidationIssue[];
      warnings?: string[];
    }
  | {
      code: "IMPORT_UNKNOWN";
      message: string;
      cause?: unknown;
      warnings?: string[];
    };

/**
 * Export operation error.
 *
 * Returned when exporting clippings to various formats fails.
 */
export type ExportError =
  | {
      code: "EXPORT_UNKNOWN_FORMAT";
      message: string;
      /** The unsupported format requested */
      format?: string;
    }
  | {
      code: "EXPORT_WRITE_FAILED";
      message: string;
      /** Output path that failed */
      path?: string;
      cause?: unknown;
    }
  | {
      code: "EXPORT_INVALID_OPTIONS";
      message: string;
      /** Validation issues */
      issues?: ValidationIssue[];
    }
  | {
      code: "EXPORT_NO_CLIPPINGS";
      message: string;
    }
  | {
      code: "EXPORT_TEMPLATE_ERROR";
      message: string;
      /** Template that failed */
      template?: string;
      cause?: unknown;
    }
  | {
      code: "EXPORT_UNKNOWN";
      message: string;
      cause?: unknown;
    };

/**
 * Configuration error.
 *
 * Returned when loading or parsing configuration fails.
 */
export type ConfigError =
  | {
      code: "CONFIG_NOT_FOUND";
      message: string;
      /** Path that was searched */
      path?: string;
    }
  | {
      code: "CONFIG_INVALID";
      message: string;
      /** Config file path */
      path?: string;
      /** Validation issues */
      issues?: ValidationIssue[];
    }
  | {
      code: "CONFIG_PARSE_ERROR";
      message: string;
      /** Config file path */
      path?: string;
      cause?: unknown;
    };

/**
 * Validation error.
 *
 * Returned when input validation fails (CLI args, API input, etc.).
 */
export type ValidationError =
  | {
      code: "VALIDATION_SCHEMA";
      message: string;
      /** Schema that failed */
      schema?: string;
      /** Validation issues */
      issues?: ValidationIssue[];
    }
  | {
      code: "VALIDATION_ARGS";
      message: string;
      /** Invalid arguments */
      args?: Record<string, unknown>;
      /** Validation issues */
      issues?: ValidationIssue[];
    }
  | {
      code: "VALIDATION_REQUIRED";
      message: string;
      /** Field that is required */
      field?: string;
    };

/**
 * File system error.
 *
 * Returned when file system operations fail.
 */
export type FileSystemError =
  | {
      code: "FS_NOT_FOUND";
      message: string;
      path?: string;
    }
  | {
      code: "FS_PERMISSION_DENIED";
      message: string;
      path?: string;
    }
  | {
      code: "FS_READ_ERROR";
      message: string;
      path?: string;
      cause?: unknown;
    }
  | {
      code: "FS_WRITE_ERROR";
      message: string;
      path?: string;
      cause?: unknown;
    };

// =============================================================================
// Unified Application Error
// =============================================================================

/**
 * Application error - union of all domain errors.
 *
 * This is the main error type used throughout the application.
 * Use the type guards from ./codes.ts to narrow down to specific domains.
 *
 * @example
 * ```typescript
 * import { isImportError, isExportError } from './codes.js';
 *
 * function handleError(error: AppError): void {
 *   if (isImportError(error.code)) {
 *     console.error('Import failed:', error.message);
 *   } else if (isExportError(error.code)) {
 *     console.error('Export failed:', error.message);
 *   }
 * }
 * ```
 */
export type AppError =
  | ImportError
  | ExportError
  | ConfigError
  | ValidationError
  | FileSystemError
  | {
      code: "UNKNOWN";
      message: string;
      cause?: unknown;
    };

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an error has a cause.
 */
export function hasCause(error: AppError): error is AppError & { cause: unknown } {
  return "cause" in error && error.cause !== undefined;
}

/**
 * Type guard to check if an error has validation issues.
 */
export function hasIssues(error: AppError): error is AppError & { issues: ValidationIssue[] } {
  return "issues" in error && Array.isArray(error.issues);
}

/**
 * Type guard to check if an error has warnings.
 */
export function hasWarnings(error: AppError): error is AppError & { warnings: string[] } {
  return "warnings" in error && Array.isArray(error.warnings);
}

// =============================================================================
// Code Type Exports
// =============================================================================

export type {
  ConfigErrorCode,
  ExportErrorCode,
  FileSystemErrorCode,
  ImportErrorCode,
  ValidationErrorCode,
};
