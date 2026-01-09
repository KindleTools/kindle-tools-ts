/**
 * Test utilities for working with neverthrow Results.
 */

import type { Result } from "neverthrow";

/**
 * Unwrap a Result for testing, throwing if it's an error.
 * This makes tests cleaner by avoiding repetitive isOk checks.
 */
export function unwrapOk<T, E>(result: Result<T, E>): T {
  if (result.isErr()) {
    throw new Error(`Expected Ok but got Err: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

/**
 * Unwrap a Result error for testing, throwing if it's ok.
 */
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (result.isOk()) {
    throw new Error(`Expected Err but got Ok: ${JSON.stringify(result.value)}`);
  }
  return result.error;
}

/**
 * Helper to get ExportSuccess properties from an export result.
 * Returns the success value with commonly accessed properties.
 */
export function getExportSuccess<T, E>(result: Result<T, E>) {
  const value = unwrapOk(result);
  return value as {
    output: string | Uint8Array;
    files?: Array<{ path: string; content: string | Uint8Array }>;
  };
}
