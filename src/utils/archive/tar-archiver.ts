import type { Archiver } from "./archiver.js";

export class TarArchiver implements Archiver {
  addFile(_path: string, _content: string | Uint8Array): void {
    throw new Error("Tar archiving is not yet implemented.");
  }

  addDirectory(_path: string): void {
    throw new Error("Tar archiving is not yet implemented.");
  }

  finalize(): Promise<Uint8Array> {
    return Promise.reject(new Error("Tar archiving is not yet implemented."));
  }
}
