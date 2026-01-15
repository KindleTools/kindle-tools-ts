export interface Archiver {
  /**
   * Add a file to the archive.
   * @param path Relative path in the archive
   * @param content File content
   */
  addFile(path: string, content: string | Uint8Array): void;

  /**
   * Add a directory to the archive (optional for some formats, but good for structure).
   * @param path Relative path of the directory
   */
  addDirectory(path: string): void;

  /**
   * Finalize the archive and return the content.
   */
  finalize(): Promise<Uint8Array>;
}

export type ArchiveFormat = "zip" | "tar";
