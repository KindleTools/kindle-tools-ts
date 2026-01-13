/**
 * Node.js-specific entry point for kindle-tools-ts.
 *
 * Contains utilities that rely on Node.js runtime APIs (fs, path, etc.).
 * Use this entry point when running in a Node.js environment.
 *
 * @packageDocumentation
 */

export { parseFile } from "#importers/formats/txt/file-parser.js";

// Node.js FileSystem adapter (for explicit usage)
export { nodeFileSystem } from "#ports/adapters/node-filesystem.js";
