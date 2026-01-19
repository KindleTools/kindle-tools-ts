import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nodeFileSystem } from "#ports/adapters/node-filesystem.js";

vi.mock("node:fs/promises");

describe("NodeFileSystem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("readFile", () => {
    it("should read file as Uint8Array", async () => {
      const mockContent = "hello world";
      const mockBuffer = Buffer.from(mockContent);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await nodeFileSystem.readFile("test.txt");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result)).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith("test.txt");
    });

    it("should propagate errors from fs.readFile", async () => {
      const error = new Error("File not found");
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(nodeFileSystem.readFile("nonexistent.txt")).rejects.toThrow("File not found");
    });
  });

  describe("readTextFile", () => {
    it("should read file as string with default encoding", async () => {
      const mockContent = "hello world";
      // fs.readFile with encoding returns string
      vi.mocked(fs.readFile).mockResolvedValue(mockContent as any);

      const result = await nodeFileSystem.readTextFile("test.txt");

      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith("test.txt", "utf-8");
    });

    it("should read file as string with custom encoding", async () => {
      const mockContent = "hello world";
      vi.mocked(fs.readFile).mockResolvedValue(mockContent as any);

      const result = await nodeFileSystem.readTextFile("test.txt", "ascii");

      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith("test.txt", "ascii");
    });
  });
});
