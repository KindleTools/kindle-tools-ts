/**
 * ZIP archive creation utilities.
 *
 * Provides functionality to create ZIP archives from simple file objects,
 * compatible with both Node.js and Browser environments via JSZip.
 *
 * @packageDocumentation
 */

import JSZip from "jszip";

/**
 * A file entry to include in the ZIP archive.
 */
export interface ZipEntry {
  /** File name (path within archive) */
  name: string;

  /** File content */
  content: string | Uint8Array | ArrayBuffer;

  /** Optional modification time */
  date?: Date;
}

/**
 * Create a ZIP archive from a list of file entries.
 *
 * @param entries - Files to include in the archive
 * @returns Promise resolving to the ZIP archive as a Uint8Array
 */
export async function createZipArchive(entries: ZipEntry[]): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.name, entry.content, {
      date: entry.date ?? new Date(),
    });
  }

  return await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6, // Good balance between speed and size
    },
  });
}
