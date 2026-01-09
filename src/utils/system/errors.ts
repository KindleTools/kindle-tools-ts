/**
 * Core error handling utilities.
 *
 * Provides type-safe error handling following TypeScript best practices.
 * Handles the `unknown` type in catch blocks safely.
 *
 * @packageDocumentation
 */

import type { ZodError, ZodIssue } from "zod";

// =============================================================================
// Zod Error Formatting
// =============================================================================

/**
 * Format a Zod validation error into a user-friendly string.
 *
 * Converts Zod's structured error format into a readable multi-line string,
 * suitable for CLI output or error messages.
 *
 * @param error - The ZodError to format
 * @param options - Formatting options
 * @returns Formatted error string
 *
 * @example
 * ```typescript
 * import { formatZodError } from './errors.js';
 *
 * const result = SomeSchema.safeParse(input);
 * if (!result.success) {
 *   console.error("Validation failed:");
 *   console.error(formatZodError(result.error));
 *   // Output:
 *   // Validation failed:
 *   //   - language: Invalid language code
 *   //   - options.minLength: Expected number, received string
 * }
 * ```
 */
export function formatZodError(
  error: ZodError,
  options: { prefix?: string; indent?: string } = {},
): string {
  const { prefix = "  - ", indent = "" } = options;

  return error.issues
    .map((issue: ZodIssue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${indent}${prefix}${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Format a Zod error as a single-line summary.
 *
 * Useful for brief error messages or logging.
 *
 * @param error - The ZodError to format
 * @returns Single-line error summary
 *
 * @example
 * ```typescript
 * const result = Schema.safeParse(input);
 * if (!result.success) {
 *   throw new Error(`Invalid input: ${formatZodErrorSummary(result.error)}`);
 * }
 * ```
 */
export function formatZodErrorSummary(error: ZodError): string {
  const count = error.issues.length;
  if (count === 0) return "Unknown validation error";

  const first = error.issues[0];
  if (!first) return "Unknown validation error";

  const path = first.path.length > 0 ? first.path.join(".") : "(root)";
  const suffix = count > 1 ? ` (+${count - 1} more)` : "";

  return `${path}: ${first.message}${suffix}`;
}

// =============================================================================
// General Error Utilities
// =============================================================================

/**
 * Convert any unknown value to a proper Error instance.
 *
 * In TypeScript with strict mode, catch variables are typed as `unknown`.
 * This utility safely converts any thrown value to an Error object,
 * preserving the original Error if applicable.
 *
 * @param maybeError - The unknown value from a catch block
 * @returns A proper Error instance
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const err = toError(error);
 *   console.error(err.message);
 * }
 * ```
 */
export function toError(maybeError: unknown): Error {
  // Already an Error instance - return as-is
  if (maybeError instanceof Error) {
    return maybeError;
  }

  // String - wrap in Error
  if (typeof maybeError === "string") {
    return new Error(maybeError);
  }

  // Object with message property - use message
  if (
    typeof maybeError === "object" &&
    maybeError !== null &&
    "message" in maybeError &&
    typeof (maybeError as { message: unknown }).message === "string"
  ) {
    return new Error((maybeError as { message: string }).message);
  }

  // Fallback - stringify the value
  try {
    return new Error(String(maybeError));
  } catch {
    return new Error("An unknown error occurred");
  }
}

/**
 * Get the error message from an unknown value.
 *
 * Convenience wrapper around toError for when you only need the message.
 *
 * @param maybeError - The unknown value from a catch block
 * @returns The error message string
 */
export function getErrorMessage(maybeError: unknown): string {
  return toError(maybeError).message;
}
