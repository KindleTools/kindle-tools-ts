import { describe, it, expect } from "vitest";
import { TarArchiver } from "#utils/archive/tar-archiver.js";

describe("TarArchiver", () => {
    it("should throw error for addFile", () => {
        const archiver = new TarArchiver();
        expect(() => archiver.addFile("test.txt", "content")).toThrow("Tar archiving is not yet implemented.");
    });

    it("should throw error for addDirectory", () => {
        const archiver = new TarArchiver();
        expect(() => archiver.addDirectory("test")).toThrow("Tar archiving is not yet implemented.");
    });

    it("should throw error for finalize", async () => {
        const archiver = new TarArchiver();
        await expect(archiver.finalize()).rejects.toThrow("Tar archiving is not yet implemented.");
    });
});
