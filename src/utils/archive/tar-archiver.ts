import { createTarArchive, type TarEntry } from "../fs/tar.js";
import type { Archiver } from "./archiver.js";

/**
 * TAR archiver implementation using the existing createTarArchive function.
 * Used for Joplin JEX exports.
 */
export class TarArchiver implements Archiver {
  private entries: TarEntry[] = [];

  addFile(path: string, content: string | Uint8Array): void {
    this.entries.push({ name: path, content });
  }

  addDirectory(_path: string): void {
    // TAR doesn't require explicit directory entries for files with paths
    // The directory structure is implicit in the file paths
  }

  async finalize(): Promise<Uint8Array> {
    return createTarArchive(this.entries);
  }
}
