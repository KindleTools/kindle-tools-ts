/**
 * Node.js FileSystem adapter.
 *
 * This is the default implementation used in Node.js environments.
 * Automatically loaded when no custom FileSystem is set.
 *
 * @packageDocumentation
 */
import * as fs from "node:fs/promises";
import type { FileSystem } from "../filesystem.js";

/**
 * Node.js FileSystem implementation using node:fs/promises.
 */
export const nodeFileSystem: FileSystem = {
  async readFile(path: string): Promise<Uint8Array> {
    const buffer = await fs.readFile(path);
    // Convert Buffer to Uint8Array for cross-platform compatibility
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  },

  async readTextFile(path: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
    return fs.readFile(path, encoding);
  },
};
