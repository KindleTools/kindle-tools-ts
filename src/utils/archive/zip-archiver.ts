import JSZip from "jszip";
import type { Archiver } from "./archiver.js";

export class ZipArchiver implements Archiver {
  private zip: JSZip;

  constructor() {
    this.zip = new JSZip();
  }

  addFile(path: string, content: string | Uint8Array): void {
    this.zip.file(path, content);
  }

  addDirectory(path: string): void {
    this.zip.folder(path);
  }

  async finalize(): Promise<Uint8Array> {
    return this.zip.generateAsync({ type: "uint8array" });
  }
}
