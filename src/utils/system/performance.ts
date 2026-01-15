/**
 * Performance measurement utilities.
 *
 * @packageDocumentation
 */

import { logDebug } from "#errors";

/**
 * Measure the execution time of an asynchronous function and log it (debug level).
 *
 * @param name - Name of the operation to measure
 * @param fn - The async function to execute
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = await measureTime("parseCSV", () => parse(content));
 * ```
 */
export async function measureTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = performance.now() - start;
    logDebug(`${name} completed`, {
      operation: "performance_measure",
      data: {
        name,
        durationMs: Math.round(durationMs * 100) / 100, // Round to 2 decimals
      },
    });
  }
}
