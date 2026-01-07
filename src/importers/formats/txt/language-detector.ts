/**
 * Language detection for Kindle clippings.
 *
 * @packageDocumentation
 */

import type { SupportedLanguage } from "#app-types/language.js";
import { LANGUAGE_MAP, SUPPORTED_LANGUAGES } from "#domain/languages.js";
import type { TokenizedBlock } from "./tokenizer.js";

/**
 * Detect the language of a Kindle clippings file by analyzing patterns.
 *
 * This function analyzes the first N blocks and looks for language-specific
 * patterns like "Added on" (English), "Añadido el" (Spanish), etc.
 *
 * @param blocks - Tokenized blocks to analyze
 * @param sampleSize - Number of blocks to analyze (default: 10)
 * @returns Detected language code, defaults to 'en' if uncertain
 *
 * @example
 * ```typescript
 * const blocks = tokenize(content);
 * const language = detectLanguage(blocks);
 * console.log(`Detected language: ${language}`);
 * ```
 */
export function detectLanguage(blocks: TokenizedBlock[], sampleSize = 10): SupportedLanguage {
  const votes: Record<SupportedLanguage, number> = {} as Record<SupportedLanguage, number>;

  // Initialize vote counts
  for (const lang of SUPPORTED_LANGUAGES) {
    votes[lang] = 0;
  }

  // Analyze sample blocks
  const samplesToCheck = Math.min(sampleSize, blocks.length);

  for (let i = 0; i < samplesToCheck; i++) {
    const block = blocks[i];
    if (!block) continue;

    const detected = detectBlockLanguage(block);
    if (detected) {
      votes[detected]++;
    }
  }

  // Find language with most votes
  let maxVotes = 0;
  let detectedLanguage: SupportedLanguage = "en";

  for (const lang of SUPPORTED_LANGUAGES) {
    if (votes[lang] > maxVotes) {
      maxVotes = votes[lang];
      detectedLanguage = lang;
    }
  }

  return detectedLanguage;
}

/**
 * Detect the language of a single block.
 *
 * @param block - Block to analyze
 * @returns Detected language or null if unable to detect
 */
export function detectBlockLanguage(block: TokenizedBlock): SupportedLanguage | null {
  // Combine all lines for analysis
  const text = block.lines.join(" ").toLowerCase();

  for (const lang of SUPPORTED_LANGUAGES) {
    const patterns = LANGUAGE_MAP[lang];

    // Check for "Added on" pattern
    if (text.includes(patterns.addedOn.toLowerCase())) {
      return lang;
    }

    // Check for type patterns
    if (
      text.includes(patterns.highlight.toLowerCase()) ||
      text.includes(patterns.note.toLowerCase()) ||
      text.includes(patterns.bookmark.toLowerCase())
    ) {
      return lang;
    }
  }

  return null;
}
