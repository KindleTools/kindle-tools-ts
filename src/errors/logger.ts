/**
 * Structured error logging utilities.
 *
 * Provides consistent error logging with context for debugging.
 *
 * @packageDocumentation
 */

import type { AppError } from "./types.js";

/**
 * Log context for structured error logging.
 */
export interface ErrorLogContext {
  /** Operation being performed when error occurred */
  operation?: string;
  /** File path involved */
  path?: string;
  /** Additional context data */
  data?: Record<string, unknown>;
}

/**
 * Structured log entry for errors.
 */
interface ErrorLogEntry {
  timestamp: string;
  level: "error" | "warn";
  code: string;
  message: string;
  operation?: string;
  path?: string;
  data?: Record<string, unknown>;
  stack?: string;
}

/**
 * Log an error with structured context.
 *
 * @example
 * ```typescript
 * import { logError } from '#errors';
 *
 * result.mapErr((error) => {
 *   logError(error, { operation: 'import', path: filePath });
 *   return error;
 * });
 * ```
 */
export function logError(error: AppError, context?: ErrorLogContext): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level: "error",
    code: error.code,
    message: error.message,
    ...context,
  };

  // Add stack trace if available from cause
  if ("cause" in error && error.cause instanceof Error && error.cause.stack) {
    entry.stack = error.cause.stack;
  }

  // In development, use pretty print; in production, use single-line JSON
  if (process.env["NODE_ENV"] === "development") {
    // biome-ignore lint/suspicious/noConsole: Logger implementation
    console.error("[ERROR]", JSON.stringify(entry, null, 2));
  } else {
    // biome-ignore lint/suspicious/noConsole: Logger implementation
    console.error(JSON.stringify(entry));
  }
}

/**
 * Log a warning with structured context.
 *
 * @param message - The warning message
 * @param context - Optional context for the warning
 *
 * @example
 * ```typescript
 * import { logWarning } from '#errors';
 *
 * if (result.warnings.length > 0) {
 *   logWarning('Some clippings had issues', {
 *     operation: 'import',
 *     data: { count: result.warnings.length }
 *   });
 * }
 * ```
 */
export function logWarning(message: string, context?: ErrorLogContext): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level: "warn",
    code: "WARNING",
    message,
    ...context,
  };

  if (process.env["NODE_ENV"] === "development") {
    // biome-ignore lint/suspicious/noConsole: Logger implementation
    console.warn("[WARN]", JSON.stringify(entry, null, 2));
  } else {
    // biome-ignore lint/suspicious/noConsole: Logger implementation
    console.warn(JSON.stringify(entry));
  }
}
