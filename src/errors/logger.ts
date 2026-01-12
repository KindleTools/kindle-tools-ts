/**
 * Structured error logging utilities with dependency injection support.
 *
 * Provides consistent error logging with context for debugging.
 * Supports logger injection for custom logging backends (Pino, Winston, Sentry, Datadog, etc.).
 *
 * @example
 * ```typescript
 * import { setLogger, resetLogger, type Logger } from 'kindle-tools-ts';
 * import pino from 'pino';
 *
 * const pinoLogger = pino();
 * setLogger({
 *   error: (entry) => pinoLogger.error(entry),
 *   warn: (entry) => pinoLogger.warn(entry),
 * });
 *
 * // Later, reset to default console logger
 * resetLogger();
 * ```
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
export interface ErrorLogEntry {
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
 * Interface for a logger implementation.
 * Allows consumers to inject their own logger (e.g., Pino, Winston).
 */
export interface Logger {
  error(entry: ErrorLogEntry): void;
  warn(entry: ErrorLogEntry): void;
}

/**
 * Default logger implementation using console.
 */
const defaultLogger: Logger = {
  error: (entry) => {
    if (process.env["NODE_ENV"] === "development") {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.error("[ERROR]", JSON.stringify(entry, null, 2));
    } else {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.error(JSON.stringify(entry));
    }
  },
  warn: (entry) => {
    if (process.env["NODE_ENV"] === "development") {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.warn("[WARN]", JSON.stringify(entry, null, 2));
    } else {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.warn(JSON.stringify(entry));
    }
  },
};

/**
 * The current logger instance.
 */
let currentLogger: Logger = defaultLogger;

/**
 * Configure the logger to use.
 * @param logger - The logger implementation to use
 */
export function setLogger(logger: Logger): void {
  currentLogger = logger;
}

/**
 * Reset the logger to the default implementation.
 */
export function resetLogger(): void {
  currentLogger = defaultLogger;
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

  currentLogger.error(entry);
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

  currentLogger.warn(entry);
}
