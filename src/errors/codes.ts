/**
 * Centralized error codes for the application.
 *
 * All error codes follow the pattern: DOMAIN_ERROR_TYPE
 * This enables easy filtering and categorization of errors.
 *
 * @packageDocumentation
 */

// =============================================================================
// Error Code Definitions
// =============================================================================

/**
 * Import-related error codes.
 */
export const ImportErrorCodes = {
  /** Failed to parse the input content */
  PARSE_ERROR: "IMPORT_PARSE_ERROR",
  /** Input file/content is empty */
  EMPTY_FILE: "IMPORT_EMPTY_FILE",
  /** Input format is invalid or corrupted */
  INVALID_FORMAT: "IMPORT_INVALID_FORMAT",
  /** Unknown import error */
  UNKNOWN: "IMPORT_UNKNOWN",
} as const;

/**
 * Export-related error codes.
 */
export const ExportErrorCodes = {
  /** Requested format is not supported */
  UNKNOWN_FORMAT: "EXPORT_UNKNOWN_FORMAT",
  /** Failed to write output file */
  WRITE_FAILED: "EXPORT_WRITE_FAILED",
  /** Export options are invalid */
  INVALID_OPTIONS: "EXPORT_INVALID_OPTIONS",
  /** No clippings provided for export */
  NO_CLIPPINGS: "EXPORT_NO_CLIPPINGS",
  /** Template rendering failed */
  TEMPLATE_ERROR: "EXPORT_TEMPLATE_ERROR",
  /** Unknown export error */
  UNKNOWN: "EXPORT_UNKNOWN",
} as const;

/**
 * Configuration-related error codes.
 */
export const ConfigErrorCodes = {
  /** Configuration file not found */
  NOT_FOUND: "CONFIG_NOT_FOUND",
  /** Configuration is invalid */
  INVALID: "CONFIG_INVALID",
  /** Failed to parse configuration file */
  PARSE_ERROR: "CONFIG_PARSE_ERROR",
} as const;

/**
 * Validation-related error codes.
 */
export const ValidationErrorCodes = {
  /** Schema validation failed */
  SCHEMA: "VALIDATION_SCHEMA",
  /** CLI arguments validation failed */
  ARGS: "VALIDATION_ARGS",
  /** Required field is missing */
  REQUIRED: "VALIDATION_REQUIRED",
} as const;

/**
 * File system-related error codes.
 */
export const FileSystemErrorCodes = {
  /** File not found */
  NOT_FOUND: "FS_NOT_FOUND",
  /** Permission denied */
  PERMISSION_DENIED: "FS_PERMISSION_DENIED",
  /** Failed to read file */
  READ_ERROR: "FS_READ_ERROR",
  /** Failed to write file */
  WRITE_ERROR: "FS_WRITE_ERROR",
} as const;

/**
 * All error codes combined.
 */
export const ErrorCode = {
  ...ImportErrorCodes,
  ...ExportErrorCodes,
  ...ConfigErrorCodes,
  ...ValidationErrorCodes,
  ...FileSystemErrorCodes,
  /** Unknown error (catch-all) */
  UNKNOWN: "UNKNOWN",
} as const;

// =============================================================================
// Type Definitions
// =============================================================================

/** Type for import error codes */
export type ImportErrorCode = (typeof ImportErrorCodes)[keyof typeof ImportErrorCodes];

/** Type for export error codes */
export type ExportErrorCode = (typeof ExportErrorCodes)[keyof typeof ExportErrorCodes];

/** Type for config error codes */
export type ConfigErrorCode = (typeof ConfigErrorCodes)[keyof typeof ConfigErrorCodes];

/** Type for validation error codes */
export type ValidationErrorCode = (typeof ValidationErrorCodes)[keyof typeof ValidationErrorCodes];

/** Type for filesystem error codes */
export type FileSystemErrorCode = (typeof FileSystemErrorCodes)[keyof typeof FileSystemErrorCodes];

/** Type for all error codes */
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// =============================================================================
// Domain Helpers
// =============================================================================

/**
 * Check if an error code belongs to a specific domain.
 */
export function isImportError(code: string): code is ImportErrorCode {
  return code.startsWith("IMPORT_");
}

export function isExportError(code: string): code is ExportErrorCode {
  return code.startsWith("EXPORT_");
}

export function isConfigError(code: string): code is ConfigErrorCode {
  return code.startsWith("CONFIG_");
}

export function isValidationError(code: string): code is ValidationErrorCode {
  return code.startsWith("VALIDATION_");
}

export function isFileSystemError(code: string): code is FileSystemErrorCode {
  return code.startsWith("FS_");
}
