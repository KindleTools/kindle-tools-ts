import { err, ok, type Result } from "neverthrow";
import type { ArchiveFormat, Archiver } from "./archiver.js";
import { TarArchiver } from "./tar-archiver.js";
import { ZipArchiver } from "./zip-archiver.js";

export function createArchiver(format: ArchiveFormat): Result<Archiver, Error> {
  switch (format) {
    case "zip":
      return ok(new ZipArchiver());
    case "tar":
      return ok(new TarArchiver());
    default:
      return err(new Error(`Unsupported archive format: ${format}`));
  }
}
