import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type FileSystem,
  getFileSystem,
  MemoryFileSystem,
  nullFileSystem,
  resetFileSystem,
  setFileSystem,
} from "#ports";

describe("FileSystem port", () => {
  afterEach(() => {
    resetFileSystem();
  });

  describe("MemoryFileSystem", () => {
    it("should read text file", async () => {
      const memFs = new MemoryFileSystem();
      memFs.addFile("/test.txt", "hello world");

      const content = await memFs.readTextFile("/test.txt");
      expect(content).toBe("hello world");
    });

    it("should read binary file", async () => {
      const memFs = new MemoryFileSystem();
      memFs.addBinaryFile("/test.bin", new Uint8Array([1, 2, 3]));

      const content = await memFs.readFile("/test.bin");
      expect(content).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("should throw ENOENT for missing file", async () => {
      const memFs = new MemoryFileSystem();

      await expect(memFs.readFile("/missing.txt")).rejects.toThrow("ENOENT");
    });

    it("should throw ENOENT for missing text file", async () => {
      const memFs = new MemoryFileSystem();

      await expect(memFs.readTextFile("/missing.txt")).rejects.toThrow("ENOENT");
    });

    it("should check if file exists with hasFile", () => {
      const memFs = new MemoryFileSystem();
      memFs.addFile("/exists.txt", "content");

      expect(memFs.hasFile("/exists.txt")).toBe(true);
      expect(memFs.hasFile("/not-exists.txt")).toBe(false);
    });

    it("should list all files", () => {
      const memFs = new MemoryFileSystem();
      memFs.addFile("/a.txt", "a");
      memFs.addFile("/b.txt", "b");
      memFs.addBinaryFile("/c.bin", new Uint8Array([1]));

      const files = memFs.listFiles();
      expect(files).toHaveLength(3);
      expect(files).toContain("/a.txt");
      expect(files).toContain("/b.txt");
      expect(files).toContain("/c.bin");
    });

    it("should clear all files", () => {
      const memFs = new MemoryFileSystem();
      memFs.addFile("/a.txt", "a");
      memFs.addFile("/b.txt", "b");

      memFs.clear();

      expect(memFs.listFiles()).toHaveLength(0);
      expect(memFs.hasFile("/a.txt")).toBe(false);
    });

    it("should handle UTF-8 encoding correctly", async () => {
      const memFs = new MemoryFileSystem();
      const unicodeContent = "Hello 世界 🌍 Привет";
      memFs.addFile("/unicode.txt", unicodeContent);

      const content = await memFs.readTextFile("/unicode.txt");
      expect(content).toBe(unicodeContent);
    });

    it("should overwrite existing file", async () => {
      const memFs = new MemoryFileSystem();
      memFs.addFile("/test.txt", "original");
      memFs.addFile("/test.txt", "updated");

      const content = await memFs.readTextFile("/test.txt");
      expect(content).toBe("updated");
    });
  });

  describe("DI functions", () => {
    it("setFileSystem should replace default", async () => {
      const customFs: FileSystem = {
        readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2])),
        readTextFile: vi.fn().mockResolvedValue("custom content"),
      };

      setFileSystem(customFs);
      const fs = await getFileSystem();

      const content = await fs.readTextFile("/any");
      expect(content).toBe("custom content");
      expect(customFs.readTextFile).toHaveBeenCalledWith("/any");
    });

    it("resetFileSystem should restore default", async () => {
      const customFs: FileSystem = {
        readFile: vi.fn(),
        readTextFile: vi.fn(),
      };

      setFileSystem(customFs);
      resetFileSystem();

      const fs = await getFileSystem();
      // After reset, should get the Node.js filesystem (not the custom one)
      expect(fs).not.toBe(customFs);
    });

    it("should use custom FileSystem after setFileSystem", async () => {
      const memFs = new MemoryFileSystem();
      memFs.addFile("/test.txt", "memory content");

      setFileSystem(memFs);
      const fs = await getFileSystem();

      const content = await fs.readTextFile("/test.txt");
      expect(content).toBe("memory content");
    });
  });

  describe("nullFileSystem", () => {
    it("should throw on readFile", async () => {
      await expect(nullFileSystem.readFile("/any")).rejects.toThrow("FileSystem not available");
    });

    it("should throw on readTextFile", async () => {
      await expect(nullFileSystem.readTextFile("/any")).rejects.toThrow("FileSystem not available");
    });

    it("should provide clear error message", async () => {
      await expect(nullFileSystem.readFile("/any")).rejects.toThrow(
        "Use setFileSystem() to provide an implementation",
      );
    });
  });

  describe("integration with MemoryFileSystem", () => {
    it("should work with setFileSystem/getFileSystem pattern", async () => {
      const memFs = new MemoryFileSystem();
      memFs.addFile("/clippings.txt", "Test clipping content");

      setFileSystem(memFs);

      const fs = await getFileSystem();
      const content = await fs.readTextFile("/clippings.txt");

      expect(content).toBe("Test clipping content");
    });

    it("should isolate tests with resetFileSystem", async () => {
      const memFs1 = new MemoryFileSystem();
      memFs1.addFile("/test.txt", "first");
      setFileSystem(memFs1);

      // Verify first filesystem works
      let fs = await getFileSystem();
      expect(await fs.readTextFile("/test.txt")).toBe("first");

      // Reset and set new filesystem
      resetFileSystem();
      const memFs2 = new MemoryFileSystem();
      memFs2.addFile("/test.txt", "second");
      setFileSystem(memFs2);

      // Verify new filesystem is used
      fs = await getFileSystem();
      expect(await fs.readTextFile("/test.txt")).toBe("second");
    });
  });
});
