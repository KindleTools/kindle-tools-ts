import * as fs from "node:fs/promises";
import type { ParseOptions, ParseResult } from "#app-types/config.js";
import { decodeWithFallback, detectEncoding } from "#utils/encoding.js";
import { parseString } from "./parser.js";

/**
 * Parse a Kindle clippings file from a file path.
 *
 * Supports multiple encodings:
 * - UTF-8 (with or without BOM)
 * - UTF-16 LE/BE
 * - Latin-1/ISO-8859-1 (fallback for Windows files)
 *
 * @param filePath - Path to My Clippings.txt
 * @param options - Parse options
 * @returns Parse result with clippings and stats
 *
 * @example
 * ```typescript
 * const result = await parseFile("My Clippings.txt");
 * console.log(`Parsed ${result.clippings.length} clippings`);
 * ```
 */
export async function parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult> {
  // Read as buffer first to detect encoding
  const buffer = await fs.readFile(filePath);
  const detectedEncoding = detectEncoding(buffer);
  const content = decodeWithFallback(buffer, detectedEncoding);
  const fileSize = buffer.length;

  const startTime = performance.now();
  const result = parseString(content, options);
  const parseTime = performance.now() - startTime;

  return {
    ...result,
    meta: {
      ...result.meta,
      fileSize,
      parseTime,
    },
  };
}
