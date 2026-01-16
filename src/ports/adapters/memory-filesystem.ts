/**
 * In-memory FileSystem adapter for testing.
 *
 * Provides instant file operations without disk I/O.
 * Ideal for unit tests and browser environments.
 *
 * @example
 * ```typescript
 * import { MemoryFileSystem, setFileSystem } from 'kindle-tools-ts/ports';
 *
 * const memFs = new MemoryFileSystem();
 * memFs.addFile('/path/to/file.txt', 'file content');
 * memFs.addBinaryFile('/path/to/data.bin', new Uint8Array([1, 2, 3]));
 *
 * setFileSystem(memFs);
 * // Now all file operations use the in-memory filesystem
 * ```
 *
 * @packageDocumentation
 */
import type { FileSystem } from "#ports/filesystem.js";

/**
 * In-memory FileSystem implementation.
 *
 * Stores files in a Map, enabling fast tests without disk I/O.
 */
export class MemoryFileSystem implements FileSystem {
  private files = new Map<string, Uint8Array>();

  /**
   * Add a text file to the virtual filesystem.
   * @param path - Virtual file path
   * @param content - File content as string
   */
  addFile(path: string, content: string): void {
    this.files.set(path, new TextEncoder().encode(content));
  }

  /**
   * Add a binary file to the virtual filesystem.
   * @param path - Virtual file path
   * @param content - File content as Uint8Array
   */
  addBinaryFile(path: string, content: Uint8Array): void {
    this.files.set(path, content);
  }

  /**
   * Clear all files from the virtual filesystem.
   */
  clear(): void {
    this.files.clear();
  }

  /**
   * Check if a file exists in the virtual filesystem.
   * @param path - Virtual file path
   * @returns True if the file exists
   */
  hasFile(path: string): boolean {
    return this.files.has(path);
  }

  /**
   * Get all file paths in the virtual filesystem.
   * @returns Array of file paths
   */
  listFiles(): string[] {
    return Array.from(this.files.keys());
  }

  async readFile(path: string): Promise<Uint8Array> {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }

  async readTextFile(path: string, encoding = "utf-8"): Promise<string> {
    const content = await this.readFile(path);
    return new TextDecoder(encoding).decode(content);
  }
}
