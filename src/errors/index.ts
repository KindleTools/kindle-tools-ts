/**
 * Centralized error handling module.
 *
 * This module provides:
 * - Centralized error codes (codes.ts)
 * - Discriminated union error types (types.ts)
 * - neverthrow Result integration (result.ts)
 *
 * @example
 * ```typescript
 * import {
 *   // Error codes
 *   ErrorCode,
 *   isImportError,
 *   isExportError,
 *
 *   // Types
 *   type AppError,
 *   type ImportError,
 *   type ExportError,
 *
 *   // Results
 *   type ImportResult,
 *   type ExportResult,
 *   ok,
 *   err,
 *
 *   // Factories
 *   importSuccess,
 *   importParseError,
 *   exportSuccess,
 *   exportUnknownError,
 * } from '#errors';
 * ```
 *
 * @packageDocumentation
 */

export type {
  ConfigErrorCode,
  ErrorCodeType,
  ExportErrorCode,
  FileSystemErrorCode,
  ImportErrorCode,
  ValidationErrorCode,
} from "./codes.js";
// Error codes
export {
  ConfigErrorCodes,
  ErrorCode,
  ExportErrorCodes,
  FileSystemErrorCodes,
  ImportErrorCodes,
  isConfigError,
  isExportError,
  isFileSystemError,
  isImportError,
  isValidationError,
  ValidationErrorCodes,
} from "./codes.js";
// Formatting utilities
export { formatErrorDetail, formatUserMessage, getErrorCode } from "./formatting.js";
// Logging utilities
export type { ErrorLogContext } from "./logger.js";
export { logError, logWarning } from "./logger.js";
export type {
  AppResult,
  AppResultAsync,
  ExportedFile,
  ExportResult,
  ExportResultAsync,
  ExportSuccess,
  ImportResult,
  ImportResultAsync,
  ImportSuccess,
  Result,
  ResultAsync,
} from "./result.js";
// Results and factories
export {
  err,
  errAsync,
  exportInvalidOptions,
  exportNoClippings,
  // Export factories
  exportSuccess,
  exportTemplateError,
  exportUnknownError,
  exportUnknownFormat,
  exportWriteFailed,
  importEmptyFile,
  importInvalidFormat,
  importParseError,
  // Import factories
  importSuccess,
  importUnknownError,
  // Re-exports from neverthrow
  ok,
  okAsync,
  toAppError,
  // Utilities
  zodIssuesToValidationIssues,
} from "./result.js";
// Error types
export type {
  AppError,
  BaseErrorContext,
  ConfigError,
  ExportError,
  FileSystemError,
  ImportError,
  ValidationError,
  ValidationIssue,
} from "./types.js";
export { AppException, hasCause, hasIssues, hasWarnings } from "./types.js";
