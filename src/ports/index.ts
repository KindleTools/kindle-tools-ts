/**
 * Ports & Adapters for external dependencies.
 *
 * This module provides abstractions for external systems (filesystem, etc.)
 * following the Ports & Adapters (Hexagonal Architecture) pattern.
 *
 * @packageDocumentation
 */

// Adapters (for direct use in specific environments)
export { MemoryFileSystem } from "./adapters/memory-filesystem.js";
// FileSystem port
export type { FileSystem } from "./filesystem.js";
export {
  getFileSystem,
  nullFileSystem,
  resetFileSystem,
  setFileSystem,
} from "./filesystem.js";
