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
  content: string | Uint8Array;

  /** Optional modification time (defaults to now) */
  mtime?: Date;
}

/**
 * Write a string to a buffer at a specific offset.
 */
function writeString(buffer: Uint8Array, str: string, offset: number, maxLength?: number): void {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  const length = maxLength !== undefined ? Math.min(encoded.length, maxLength) : encoded.length;
  buffer.set(encoded.subarray(0, length), offset);
}

/**
 * Create a TAR archive from a list of file entries.
 *
 * @param entries - Files to include in the archive
 * @returns TAR archive as a Uint8Array
 *
 * @example
 * const buffer = createTarArchive([
 *   { name: "abc123.md", content: "Title\n\nid: abc123\ntype_: 1" },
 *   { name: "def456.md", content: "Notebook\n\nid: def456\ntype_: 2" },
 * ]);
 */
export function createTarArchive(entries: TarEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for (const entry of entries) {
    // Get content as buffer
    const content =
      typeof entry.content === "string" ? new TextEncoder().encode(entry.content) : entry.content;

    // Create header
    const header = createTarHeader(entry.name, content.length, entry.mtime);
    chunks.push(header);
    totalLength += header.length;

    // Add content
    chunks.push(content);
    totalLength += content.length;

    // Pad to 512-byte boundary
    const paddingSize = (512 - (content.length % 512)) % 512;
    if (paddingSize > 0) {
      const padding = new Uint8Array(paddingSize);
      chunks.push(padding);
      totalLength += padding.length;
    }
  }

  // Add two 512-byte blocks of zeros to mark end of archive
  const endMarker = new Uint8Array(1024);
  chunks.push(endMarker);
  totalLength += endMarker.length;

  // Concatenate all chunks
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Create a TAR header for a file entry.
 * Uses USTAR (POSIX) format for compatibility.
 */
function createTarHeader(name: string, size: number, mtime?: Date): Uint8Array {
  const header = new Uint8Array(512);

  // Name (0-99, 100 bytes)
  // We truncate strictly to ensure we don't overflow into the Mode field
  writeString(header, name, 0, 99);

  // Mode (100-107, 8 bytes) - 0644 octal
  writeString(header, "0000644\0", 100);

  // UID (108-115, 8 bytes) - 0
  writeString(header, "0000000\0", 108);

  // GID (116-123, 8 bytes) - 0
  writeString(header, "0000000\0", 116);

  // Size (124-135, 12 bytes) - octal
  const sizeOctal = size.toString(8).padStart(11, "0");
  writeString(header, sizeOctal + "\0", 124);

  // Mtime (136-147, 12 bytes) - octal seconds since epoch
  const mtimeSeconds = Math.floor((mtime?.getTime() ?? Date.now()) / 1000);
  const mtimeOctal = mtimeSeconds.toString(8).padStart(11, "0");
  writeString(header, mtimeOctal + "\0", 136);

  // Checksum placeholder (148-155, 8 bytes) - spaces for calculation
  writeString(header, "        ", 148);

  // Type flag (156, 1 byte) - '0' for regular file
  writeString(header, "0", 156);

  // Link name (157-256, 100 bytes) - empty for regular files
  // Already zeroed

  // USTAR magic (257-264, 8 bytes)
  writeString(header, "ustar\x0000", 257);

  // Owner user name (265-296, 32 bytes)
  writeString(header, "kindle-tools", 265);

  // Owner group name (297-328, 32 bytes)
  writeString(header, "kindle-tools", 297);

  // Calculate and write checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i] ?? 0;
  }
  const checksumOctal = checksum.toString(8).padStart(6, "0");
  // Checksum field is 8 bytes. `000000\0 ` is common format (6 digits + null + space)
  writeString(header, checksumOctal + "\0 ", 148);

  return header;
}

/**
 * Create a JEX (Joplin Export) file from markdown files.
 *
 * This is a convenience wrapper around createTarArchive that handles
 * the typical JEX export case.
 *
 * @param files - Map of filename to content
 * @returns JEX file as a Uint8Array
 *
 * @example
 * const jexBuffer = createJexArchive({
 *   "abc123.md": "Title\n\nid: abc123\ntype_: 1",
 *   "def456.md": "Notebook\n\nid: def456\ntype_: 2",
 * });
 */
export function createJexArchive(files: Record<string, string>): Uint8Array {
  const entries: TarEntry[] = Object.entries(files).map(([name, content]) => ({
    name,
    content,
  }));

  return createTarArchive(entries);
}
