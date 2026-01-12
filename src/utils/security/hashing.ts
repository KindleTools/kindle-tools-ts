/**
 * Hashing utilities.
 *
 * @packageDocumentation
 */

/**
 * Simple hash function that works in both Node.js and browser.
 * Uses node:crypto in Node.js, fast hash in browser.
 * @param input - String to hash
 * @returns 64-character hex string
 */
export function sha256Sync(input: string): string {
  // Check if we're in Node.js with crypto available
  try {
    // Try to use Node.js crypto module synchronously
    // This works in most Node.js environments
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic require for Node.js compatibility
    const crypto = (globalThis as any).process?.versions?.node
      ? // biome-ignore lint/suspicious/noExplicitAny: Dynamic require for Node.js compatibility
        (require as any)("node:crypto")
      : null;

    if (crypto) {
      return crypto.createHash("sha256").update(input, "utf8").digest("hex");
    }
  } catch {
    // Crypto not available, fall through to browser implementation
  }

  // Browser/fallback environment - use simple hash
  return simpleHash(input);
}

/**
 * Simple non-cryptographic hash function (djb2 + fnv1a combined).
 * Exported for testing purposes.
 */
export function simpleHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Combine into a hex string (16 chars from each hash = 32 chars total, pad to 64)
  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");

  // Repeat to get 64 chars like SHA-256
  return (part1 + part2).repeat(4);
}
