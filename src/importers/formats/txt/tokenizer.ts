/**
 * Tokenizer for splitting Kindle clippings file into blocks.
 *
 * @packageDocumentation
 */

import { BOM } from "#utils/text/patterns.js";
import { PATTERNS } from "./constants.js";

/**
 * A tokenized block from the clippings file.
 */
export interface TokenizedBlock {
  /** Index of this block in the original file */
  index: number;

  /** Raw content of the block */
  raw: string;

  /** Lines of the block (split by newline) */
  lines: string[];
}

/**
 * Tokenize a Kindle clippings file content into individual blocks.
 *
 * This function:
 * 1. Removes BOM if present
 * 2. Normalizes line endings
 * 3. Splits by the separator (==========)
 * 4. Filters empty blocks
 * 5. Returns blocks with their original indices
 *
 * @param content - Raw file content
 * @returns Array of tokenized blocks
 *
 * @example
 * ```typescript
 * const content = fs.readFileSync('My Clippings.txt', 'utf-8');
 * const blocks = tokenize(content);
 * console.log(`Found ${blocks.length} clippings`);
 * ```
 */
export function tokenize(content: string): TokenizedBlock[] {
  // Remove BOM if present
  let cleaned = content.replace(BOM, "");

  // Normalize line endings to Unix style
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split by separator
  const rawBlocks = cleaned.split(PATTERNS.SEPARATOR);

  // Process each block
  const blocks: TokenizedBlock[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const raw = rawBlocks[i];

    // Skip empty blocks
    if (!raw) {
      continue;
    }

    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      continue;
    }

    // Split into lines
    const lines = trimmed.split("\n").map((line) => line.trim());

    // Skip if not enough lines for a valid clipping
    // Valid clipping needs: title line, metadata line, and optionally content
    if (lines.length < 2) {
      continue;
    }

    blocks.push({
      index: i,
      raw: trimmed,
      lines,
    });
  }

  return blocks;
}
