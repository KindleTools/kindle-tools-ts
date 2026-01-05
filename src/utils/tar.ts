/**
 * Simple TAR archive creator for JEX (Joplin Export) files.
 *
 * JEX is essentially a TAR archive without compression containing:
 * - Markdown files with Joplin metadata
 * - Resources folder for attachments (not used for clippings)
 *
 * This implementation follows the USTAR (POSIX) format.
 *
 * @packageDocumentation
 */

/**
 * A file entry to include in the TAR archive.
 */
export interface TarEntry {
  /** File name (path within archive) */
  name: string;

  /** File content (string will be encoded as UTF-8) */
  content: string | Buffer;

  /** Optional modification time (defaults to now) */
  mtime?: Date;
}

/**
 * Create a TAR archive from a list of file entries.
 *
 * @param entries - Files to include in the archive
 * @returns TAR archive as a Buffer
 *
 * @example
 * const buffer = createTarArchive([
 *   { name: "abc123.md", content: "Title\n\nid: abc123\ntype_: 1" },
 *   { name: "def456.md", content: "Notebook\n\nid: def456\ntype_: 2" },
 * ]);
 */
export function createTarArchive(entries: TarEntry[]): Buffer {
  const chunks: Buffer[] = [];

  for (const entry of entries) {
    // Get content as buffer
    const content =
      typeof entry.content === "string" ? Buffer.from(entry.content, "utf-8") : entry.content;

    // Create header
    const header = createTarHeader(entry.name, content.length, entry.mtime);
    chunks.push(header);

    // Add content
    chunks.push(content);

    // Pad to 512-byte boundary
    const padding = 512 - (content.length % 512);
    if (padding < 512) {
      chunks.push(Buffer.alloc(padding, 0));
    }
  }

  // Add two 512-byte blocks of zeros to mark end of archive
  chunks.push(Buffer.alloc(1024, 0));

  return Buffer.concat(chunks);
}

/**
 * Create a TAR header for a file entry.
 * Uses USTAR (POSIX) format for compatibility.
 */
function createTarHeader(name: string, size: number, mtime?: Date): Buffer {
  const header = Buffer.alloc(512, 0);

  // Name (0-99, 100 bytes)
  // For long names, we truncate (JEX files use 32-char IDs so this is fine)
  const fileName = name.slice(0, 99);
  header.write(fileName, 0, "utf-8");

  // Mode (100-107, 8 bytes) - 0644 octal
  header.write("0000644\0", 100, "utf-8");

  // UID (108-115, 8 bytes) - 0
  header.write("0000000\0", 108, "utf-8");

  // GID (116-123, 8 bytes) - 0
  header.write("0000000\0", 116, "utf-8");

  // Size (124-135, 12 bytes) - octal
  const sizeOctal = size.toString(8).padStart(11, "0");
  header.write(sizeOctal + "\0", 124, "utf-8");

  // Mtime (136-147, 12 bytes) - octal seconds since epoch
  const mtimeSeconds = Math.floor((mtime?.getTime() ?? Date.now()) / 1000);
  const mtimeOctal = mtimeSeconds.toString(8).padStart(11, "0");
  header.write(mtimeOctal + "\0", 136, "utf-8");

  // Checksum placeholder (148-155, 8 bytes) - spaces for calculation
  header.write("        ", 148, "utf-8");

  // Type flag (156, 1 byte) - '0' for regular file
  header.write("0", 156, "utf-8");

  // Link name (157-256, 100 bytes) - empty for regular files
  // Already zeroed

  // USTAR magic (257-264, 8 bytes)
  header.write("ustar\x0000", 257, "utf-8");

  // Owner user name (265-296, 32 bytes)
  header.write("kindle-tools", 265, "utf-8");

  // Owner group name (297-328, 32 bytes)
  header.write("kindle-tools", 297, "utf-8");

  // Calculate and write checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i] ?? 0;
  }
  const checksumOctal = checksum.toString(8).padStart(6, "0");
  header.write(checksumOctal + "\0 ", 148, "utf-8");

  return header;
}

/**
 * Create a JEX (Joplin Export) file from markdown files.
 *
 * This is a convenience wrapper around createTarArchive that handles
 * the typical JEX export case.
 *
 * @param files - Map of filename to content
 * @returns JEX file as a Buffer
 *
 * @example
 * const jexBuffer = createJexArchive({
 *   "abc123.md": "Title\n\nid: abc123\ntype_: 1",
 *   "def456.md": "Notebook\n\nid: def456\ntype_: 2",
 * });
 */
export function createJexArchive(files: Record<string, string>): Buffer {
  const entries: TarEntry[] = Object.entries(files).map(([name, content]) => ({
    name,
    content,
  }));

  return createTarArchive(entries);
}
