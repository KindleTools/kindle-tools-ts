/**
 * Encoding utilities.
 *
 * Works in both Node.js and browser environments using the standard TextDecoder API.
 *
 * @packageDocumentation
 */

/**
 * Supported text encodings for Kindle files.
 * Using standard encoding labels that TextDecoder understands.
 */
type SupportedEncoding = "utf-8" | "utf-16le" | "iso-8859-1";

/**
 * Detect encoding from a buffer by checking BOM (Byte Order Mark).
 *
 * Supports:
 * - UTF-8 with BOM (EF BB BF)
 * - UTF-16 LE (FF FE)
 * - UTF-16 BE (FE FF)
 * - Falls back to UTF-8 (most common for Kindle files)
 *
 * @param buffer - File buffer to analyze (Uint8Array)
 * @returns Detected encoding label for TextDecoder
 */
export function detectEncoding(buffer: Uint8Array): SupportedEncoding {
  // UTF-8 BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf-8";
  }
  // UTF-16 LE BOM
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "utf-16le";
  }
  // UTF-16 BE BOM - TextDecoder doesn't support utf-16be natively,
  // but this is extremely rare for Kindle files. We'll use utf-16le as fallback.
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return "utf-16le";
  }
  // Default: try UTF-8, which handles ASCII and most Kindle files
  return "utf-8";
}

/**
 * Try to decode buffer with fallback encodings.
 *
 * Order: detected encoding -> utf-8 -> iso-8859-1 (always succeeds)
 *
 * Uses TextDecoder which is available in both Node.js (v11+) and browsers.
 *
 * @param buffer - File buffer (Uint8Array)
 * @param primaryEncoding - Primary encoding to try
 * @returns Decoded string
 */
export function decodeWithFallback(buffer: Uint8Array, primaryEncoding: SupportedEncoding): string {
  try {
    // Use fatal: false to allow decoding with replacement characters
    const decoder = new TextDecoder(primaryEncoding, { fatal: false });
    const content = decoder.decode(buffer);

    // Check for replacement character (indicates decoding issues)
    if (!content.includes("\ufffd")) {
      return content;
    }
  } catch {
    // Encoding failed or not supported, try fallback
  }

  // If primary encoding produced replacement chars or failed, try UTF-8
  if (primaryEncoding !== "utf-8") {
    try {
      const utf8Decoder = new TextDecoder("utf-8", { fatal: false });
      const content = utf8Decoder.decode(buffer);
      if (!content.includes("\ufffd")) {
        return content;
      }
    } catch {
      // UTF-8 failed, continue to final fallback
    }
  }

  // Final fallback: iso-8859-1 (Latin-1) always succeeds
  // This handles Windows cp1252 files reasonably well
  const latin1Decoder = new TextDecoder("iso-8859-1");
  return latin1Decoder.decode(buffer);
}
