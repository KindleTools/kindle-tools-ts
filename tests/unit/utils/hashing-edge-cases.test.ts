import { describe, expect, it } from "vitest";
import { simpleHash } from "#utils/security/hashing.js";

describe("Hashing Edge Cases", () => {
  describe("simpleHash", () => {
    it("should produce consistent hash for same input", () => {
      const input = "test string";
      const hash1 = simpleHash(input);
      const hash2 = simpleHash(input);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = simpleHash("input1");
      const hash2 = simpleHash("input2");
      expect(hash1).not.toBe(hash2);
    });

    it("should return 64-character hex string", () => {
      const hash = simpleHash("any input");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle empty string", () => {
      const hash = simpleHash("");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle unicode characters", () => {
      const hash = simpleHash("こんにちは🎉");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle very long strings", () => {
      const longInput = "a".repeat(10000);
      const hash = simpleHash(longInput);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("sha256Sync browser fallback", () => {
    // Note: Testing the actual fallback path requires mocking the crypto module
    // which is complex due to module caching. The simpleHash function is called
    // when crypto is unavailable, so we test simpleHash directly above.
    // Integration testing of sha256Sync in Node.js environment is done in hashing.test.ts

    it("simpleHash should be deterministic (used as browser fallback)", () => {
      // This ensures the fallback produces consistent results
      const results = Array.from({ length: 5 }, () => simpleHash("fallback test"));
      expect(new Set(results).size).toBe(1);
    });
  });
});
