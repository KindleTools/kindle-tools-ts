/**
 * Core error handling utilities.
 *
 * Provides type-safe error handling following TypeScript best practices.
 * Handles the `unknown` type in catch blocks safely.
 *
 * @packageDocumentation
 */

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
