/**
 * FileSystem port for dependency injection.
 *
 * Enables testing without disk I/O and browser compatibility.
 * Follows the same pattern as Logger injection in src/errors/logger.ts.
 *
 * @example
 * ```typescript
 * import { setFileSystem, resetFileSystem, type FileSystem } from 'kindle-tools-ts';
 *
 * // For testing with in-memory filesystem
 * const mockFs: FileSystem = {
 *   readFile: async (path) => new Uint8Array([...]),
 *   readTextFile: async (path) => "content",
 * };
 * setFileSystem(mockFs);
 *
 * // Reset to Node.js default
 * resetFileSystem();
 * ```
 *
 * @packageDocumentation
 */

/**
 * FileSystem abstraction for cross-platform file operations.
 *
 * Implement this interface to provide custom file system access
 * (in-memory for testing, browser File API, etc.).
 *
 * ## Future Extensions
 *
 * The interface can be extended with optional methods when needed:
 *
 * ```typescript
 * export interface FileSystem {
 *   // Current (required)
 *   readFile(path: string): Promise<Uint8Array>;
 *   readTextFile(path: string, encoding?: string): Promise<string>;
 *
 *   // Future (optional) - add when export-to-disk is implemented
 *   writeFile?(path: string, content: Uint8Array): Promise<void>;
 *   writeTextFile?(path: string, content: string, encoding?: string): Promise<void>;
 *   exists?(path: string): Promise<boolean>;
 *   mkdir?(path: string, options?: { recursive?: boolean }): Promise<void>;
 * }
 * ```
 */
export interface FileSystem {
  /**
   * Read file as binary data.
   * @param path - File path to read
   * @returns File contents as Uint8Array
   */
  readFile(path: string): Promise<Uint8Array>;

  /**
   * Read file as text with optional encoding.
   * @param path - File path to read
   * @param encoding - Text encoding (default: utf-8)
   * @returns File contents as string
   */
  readTextFile(path: string, encoding?: string): Promise<string>;
}

/**
 * The current FileSystem instance.
 * When null, the default Node.js implementation is used.
 */
let currentFileSystem: FileSystem | null = null;

/**
 * Configure the FileSystem to use.
 *
 * @param fs - The FileSystem implementation to use
 *
 * @example
 * ```typescript
 * import { setFileSystem } from 'kindle-tools-ts';
 * import { MemoryFileSystem } from 'kindle-tools-ts/ports';
 *
 * const memFs = new MemoryFileSystem();
 * memFs.addFile('/test.txt', 'content');
 * setFileSystem(memFs);
 * ```
 */
export function setFileSystem(fs: FileSystem): void {
  currentFileSystem = fs;
}

/**
 * Reset the FileSystem to the default Node.js implementation.
 *
 * Useful for tests to restore default behavior after each test.
 */
export function resetFileSystem(): void {
  currentFileSystem = null;
}

/**
 * Get the current FileSystem instance.
 *
 * If no custom FileSystem was set, lazily loads and returns
 * the default Node.js implementation.
 *
 * @returns The current FileSystem instance
 */
export async function getFileSystem(): Promise<FileSystem> {
  if (currentFileSystem) {
    return currentFileSystem;
  }
  // Lazy load Node.js adapter to avoid bundling issues in browser
  const { nodeFileSystem } = await import("./adapters/node-filesystem.js");
  return nodeFileSystem;
}

/**
 * Null FileSystem that throws on all operations.
 *
 * Useful for browser environments where fs isn't available,
 * to provide a clear error message.
 *
 * @example
 * ```typescript
 * import { setFileSystem, nullFileSystem } from 'kindle-tools-ts';
 *
 * // In browser, set null filesystem to get clear errors
 * setFileSystem(nullFileSystem);
 * ```
 */
export const nullFileSystem: FileSystem = {
  readFile: async () => {
    throw new Error("FileSystem not available. Use setFileSystem() to provide an implementation.");
  },
  readTextFile: async () => {
    throw new Error("FileSystem not available. Use setFileSystem() to provide an implementation.");
  },
};
