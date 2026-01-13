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
 * Each case is properly separated by ========== to form individual blocks that the
 * parser must handle.
 */
export function generateBrokenStructureFile(): string {
  const cases = [
    // Completely empty block
    "",
    // Only whitespace
    "   \n\n   ",
    // Just a random line (no title/author pattern)
    "Just some random text without any structure",
    // Title without parentheses (invalid author format)
    "Title Without Author\n- Your Highlight on page 1 | Location 10-20 | Added on Monday, January 1, 2024 12:00:00 AM\n\nContent",
    // Only has title line (missing everything else)
    "Lonely Title (Some Author)",
    // Meta line doesn't match any known language pattern
    "Valid Title (Author)\n- Unknown gibberish 無效的元數據\n\nContent here",
    // Valid looking but corrupted date
    "Book Title (Writer Name)\n- Your Highlight on page 5 | Location 50-60 | Added on INVALID DATE FORMAT\n\nHighlight content",
    // Reversed structure (content before title)
    "This is the content\n- Your Highlight on page 1 | Location 1-2 | Added on Monday, January 1, 2024 12:00:00 AM\nBook (Author)",
    // Valid clipping to ensure at least some parsing works
    "Valid Book (Valid Author)\n- Your Highlight on page 10 | Location 100-110 | Added on Monday, January 1, 2024 12:00:00 AM\n\nThis is a valid highlight that should parse correctly.",
  ];

  return cases.join("\n==========\n");
}
