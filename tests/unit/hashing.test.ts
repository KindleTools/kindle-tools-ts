import { describe, expect, it } from "vitest";
import { sha256Sync, simpleHash } from "#utils/security/hashing.js";

describe("hashing", () => {
  describe("sha256Sync", () => {
    it("should return a 64-character hex string", () => {
      const hash = sha256Sync("test");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should be deterministic", () => {
      const input = "test input string";
      const hash1 = sha256Sync(input);
      const hash2 = sha256Sync(input);
      expect(hash1).toBe(hash2);
    });
  });

  describe("simpleHash", () => {
    it("should generate a 64-character hex string", () => {
      const hash = simpleHash("test");
      expect(hash).toHaveLength(64);
    });

    it("should be deterministic", () => {
      const input = "test input string";
      const hash1 = simpleHash(input);
      const hash2 = simpleHash(input);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = simpleHash("abc");
      const hash2 = simpleHash("abd");
      expect(hash1).not.toBe(hash2);
    });
  });
});
