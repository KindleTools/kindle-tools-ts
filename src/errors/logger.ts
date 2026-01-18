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
 * Safely gets an environment variable, returning undefined in browser environments.
 */
function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
}

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
 * Logger interface for dependency injection.
 *
 * Implement this interface to redirect logs to your preferred logging backend
 * (Pino, Winston, Sentry, Datadog, file, etc.).
 *
 * @example
 * ```typescript
 * import { setLogger, type Logger } from 'kindle-tools-ts';
 * import winston from 'winston';
 *
 * const winstonLogger = winston.createLogger({ level: 'info' });
 * setLogger({
 *   error: (entry) => winstonLogger.error(entry.message, entry),
 *   warn: (entry) => winstonLogger.warn(entry.message, entry),
 * });
 * ```
 */
export interface Logger {
  /** Log a debug message (development only) */
  debug(message: string, context?: object): void;
  /** Log an info message */
  info(message: string, context?: object): void;
  /** Log an error entry */
  error(entry: ErrorLogEntry): void;
  /** Log a warning entry */
  warn(entry: ErrorLogEntry): void;
}

/**
 * Default logger implementation using console.
 * Uses pretty print in development, single-line JSON in production.
 */
const defaultLogger: Logger = {
  debug: (message, context) => {
    // Only log debug in development or if explicitly enabled
    if (getEnv("NODE_ENV") === "development" || getEnv("DEBUG")) {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.debug("[DEBUG]", message, context ? JSON.stringify(context, null, 2) : "");
    }
  },
  info: (message, context) => {
    // biome-ignore lint/suspicious/noConsole: Logger implementation
    console.info("[INFO]", message, context ? JSON.stringify(context) : "");
  },
  error: (entry) => {
    if (getEnv("NODE_ENV") === "development") {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.error("[ERROR]", JSON.stringify(entry, null, 2));
    } else {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.error(JSON.stringify(entry));
    }
  },
  warn: (entry) => {
    if (getEnv("NODE_ENV") === "development") {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.warn("[WARN]", JSON.stringify(entry, null, 2));
    } else {
      // biome-ignore lint/suspicious/noConsole: Logger implementation
      console.warn(JSON.stringify(entry));
    }
  },
};

/**
 * Null logger that discards all log entries.
 *
 * Useful for silencing logs in tests or production environments
 * where you don't want any logging output.
 *
 * @example
 * ```typescript
 * import { setLogger, nullLogger } from 'kindle-tools-ts';
 *
 * // Silence all logs
 * setLogger(nullLogger);
 * ```
 */
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  error: () => {},
  warn: () => {},
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
 *
 * Useful for tests or when you want to restore default behavior.
 */
export function resetLogger(): void {
  currentLogger = defaultLogger;
}

/**
 * Get the current logger instance.
 *
 * Useful for tests to verify logger configuration.
 */
export function getLogger(): Logger {
  return currentLogger;
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

/**
 * Log an info message.
 *
 * @param message - The info message
 * @param context - Optional context for the message
 */
export function logInfo(message: string, context?: object): void {
  currentLogger.info(message, context);
}

/**
 * Log a debug message.
 *
 * @param message - The debug message
 * @param context - Optional context for the message
 */
export function logDebug(message: string, context?: object): void {
  currentLogger.debug(message, context);
}
