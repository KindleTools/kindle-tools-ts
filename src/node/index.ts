/**
 * Node.js-specific entry point for kindle-tools-ts.
 *
 * Contains utilities that rely on Node.js runtime APIs (fs, path, etc.).
 * Use this entry point when running in a Node.js environment.
 *
 * @packageDocumentation
 */

export { parseFile } from "#importers/formats/txt/file-parser.js";

// Potentially export other Node.js utilities in the future
