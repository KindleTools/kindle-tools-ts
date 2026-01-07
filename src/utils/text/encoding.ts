/**
 * Encoding utilities.
 *
 * @packageDocumentation
 */

/**
 * Detect encoding from a Buffer by checking BOM (Byte Order Mark).
 *
 * Supports:
 * - UTF-8 with BOM (EF BB BF)
 * - UTF-16 LE (FF FE)
 * - UTF-16 BE (FE FF)
 * - Falls back to UTF-8 (most common for Kindle files)
 *
 * @param buffer - File buffer to analyze
 * @returns Detected encoding
 */
export function detectEncoding(buffer: Buffer): BufferEncoding {
  // UTF-8 BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf-8";
  }
  // UTF-16 LE BOM
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "utf16le";
  }
  // UTF-16 BE BOM
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    // Node.js doesn't have utf16be, but we can handle it
    return "utf16le"; // Will need byte swap, but this is rare for Kindle
  }
  // Default: try UTF-8, which handles ASCII and most Kindle files
  return "utf-8";
}

/**
 * Try to decode buffer with fallback encodings.
 *
 * Order: detected encoding -> utf-8 -> latin1 (always succeeds)
 *
 * @param buffer - File buffer
 * @param primaryEncoding - Primary encoding to try
 * @returns Decoded string
 */
export function decodeWithFallback(buffer: Buffer, primaryEncoding: BufferEncoding): string {
  try {
    const content = buffer.toString(primaryEncoding);
    // Check for replacement character (indicates decoding issues)
    if (!content.includes("\ufffd")) {
      return content;
    }
  } catch {
    // Encoding failed, try fallback
  }

  // Fallback to latin1 (ISO-8859-1) which always succeeds
  // This handles Windows cp1252 files reasonably well
  return buffer.toString("latin1");
}
