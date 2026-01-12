import { NAUGHTY_STRINGS } from "./fixtures/naughty-strings.js";

const SEPARATOR = "==========";

/**
 * Creates a single clipping string.
 * Allows overriding properties for injection testing.
 */
export function generateClipping(
  overrides: { title?: string; author?: string; meta?: string; content?: string } = {},
): string {
  const title = overrides.title ?? "Valid Title";
  const author = overrides.author ?? "Valid Author";
  const meta =
    overrides.meta ??
    "- Your Highlight on page 10 | Location 100-110 | Added on Monday, January 1, 2024 12:00:00 AM";
  const content = overrides.content ?? "This is a valid highlight content.";

  return `${title} (${author})\n${meta}\n\n${content}\n${SEPARATOR}`;
}

/**
 * Generates a file content string with purely random 'garbage' bytes/chars.
 * Useful to test parser resilience against non-text binary files.
 */
export function generateGarbage(sizeInBytes: number): string {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:<>?~`ñÑáéíóú";
  for (let i = 0; i < sizeInBytes; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generates a massive file by repeating a valid clipping.
 * Used for memory and performance stress testing.
 */
export function generateMassiveFile(targetSizeInMB: number): string {
  const baseClipping = generateClipping();
  const clippingSize = Buffer.byteLength(baseClipping, "utf8");
  const iterations = Math.ceil((targetSizeInMB * 1024 * 1024) / clippingSize);

  // Use an array join for better performance than string concatenation
  return new Array(iterations).fill(baseClipping).join("\n");
}

/**
 * Generates a file where every field (Title, Author, Content)
 * contains a "Naughty String" from the BLNS list.
 */
export function generateNaughtyFile(): string {
  return NAUGHTY_STRINGS.map((naughty) => {
    return generateClipping({
      title: `Title ${naughty}`,
      author: `Author ${naughty}`,
      content: `Content includes ${naughty}`,
    });
  }).join("\n");
}

/**
 * Generates a file with broken structure (missing separators, missing lines).
 */
export function generateBrokenStructureFile(): string {
  const cases = [
    // Missing separator
    "Title (Author)\n- Meta info\n\nContent",
    // Missing meta
    "Title (Author)\n\nContent\n==========",
    // Missing blank line
    "Title (Author)\n- Meta info\nContent\n==========",
    // Only separator
    "==========",
    // Double separator
    "==========\n==========",
  ];

  return cases.join("\n");
}
