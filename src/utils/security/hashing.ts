/**
 * Hashing utilities.
 *
 * @packageDocumentation
 */

/**
 * Minimal interface for Node.js process object.
 * Only includes the properties needed for environment detection.
 */
interface NodeProcess {
  versions: {
    node: string;
  };
}

/**
 * Interface representing globalThis augmented with optional Node.js process.
 */
interface GlobalThisWithProcess {
  process?: NodeProcess;
}

/**
 * Minimal interface for Node.js crypto Hash object.
 */
interface NodeCryptoHash {
  update(data: string, encoding: BufferEncoding): NodeCryptoHash;
  digest(encoding: "hex"): string;
}

/**
 * Minimal interface for Node.js crypto module.
 * Only includes the methods used by this module.
 */
interface NodeCryptoModule {
  createHash(algorithm: "sha256"): NodeCryptoHash;
}

/**
 * Type guard to detect if running in Node.js environment.
 * Checks for the existence of process.versions.node property.
 * Exported for reuse in other modules that need environment detection.
 */
export function isNodeEnvironment(): boolean {
  const global = globalThis as GlobalThisWithProcess;
  return typeof global.process?.versions?.node === "string";
}

/**
 * Attempts to load the Node.js crypto module.
 * @returns The crypto module or null if not available.
 */
function tryLoadNodeCrypto(): NodeCryptoModule | null {
  if (!isNodeEnvironment()) {
    return null;
  }

  try {
    // Use Function constructor to avoid static analysis from bundlers
    // while maintaining type safety through our interface
    const requireFn = new Function("m", "return require(m)") as (
      moduleName: string,
    ) => NodeCryptoModule;
    return requireFn("node:crypto");
  } catch {
    return null;
  }
}

/**
 * Cached crypto module instance.
 * undefined = not yet checked, null = not available, NodeCryptoModule = available
 */
let cachedCrypto: NodeCryptoModule | null | undefined;

/**
 * Gets the Node.js crypto module with lazy caching.
 * Only loads the module once on first call.
 * @returns The cached crypto module or null if not available.
 */
function getNodeCrypto(): NodeCryptoModule | null {
  if (cachedCrypto === undefined) {
    cachedCrypto = tryLoadNodeCrypto();
  }
  return cachedCrypto;
}

/**
 * Simple hash function that works in both Node.js and browser.
 * Uses node:crypto in Node.js, fast hash in browser.
 * @param input - String to hash
 * @returns 64-character hex string
 */
export function sha256Sync(input: string): string {
  // Check if we're in Node.js with crypto available (cached)
  const crypto = getNodeCrypto();

  if (crypto) {
    return crypto.createHash("sha256").update(input, "utf8").digest("hex");
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
