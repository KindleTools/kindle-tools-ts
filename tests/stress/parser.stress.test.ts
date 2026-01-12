import { describe, expect, it } from "vitest";
import { parse } from "../../src/importers/formats/txt/parser.js";
import {
  generateBrokenStructureFile,
  generateGarbage,
  generateMassiveFile,
  generateNaughtyFile,
} from "./generators.js";

describe("Stress Testing: TXT Parser", () => {
  it("should handle purely random garbage without crashing", async () => {
    const garbageInfo = generateGarbage(100 * 1024); // 100KB of garbage
    try {
      const result = parse(garbageInfo);
      expect(result).toBeDefined();
      expect(Array.isArray(result.clippings)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    } catch (e) {
      throw new Error(`Parser crashed on garbage input: ${e}`);
    }
  });

  it("should handle 'Naughty Strings' in all fields", async () => {
    const naughtyContent = generateNaughtyFile();
    const result = parse(naughtyContent);

    expect(result).toBeDefined();
    expect(result.clippings.length).toBeGreaterThan(0);
  });

  it("should handle broken/malformed structures gracefully", async () => {
    const brokenContent = generateBrokenStructureFile();
    const result = parse(brokenContent);
    expect(result).toBeDefined();

    // Debugging output if needed
    if (result.warnings.length === 0) {
      console.warn(
        "Expected warnings for broken file but got none. Parsed clippings:",
        result.clippings.length,
      );
    }

    // It should either parse something or warn.
    // If it parsed nothing AND warned nothing, that's suspicious (unless file was empty, which it isn't).
    const handled = result.clippings.length > 0 || result.warnings.length > 0;
    expect(handled).toBe(true);
  });

  it("should parse a massive file (5MB) within reasonable time", async () => {
    const massiveContent = generateMassiveFile(5); // 5MB
    const start = performance.now();

    const result = parse(massiveContent);

    const end = performance.now();
    const duration = end - start;

    console.log(`Parsed 5MB in ${duration.toFixed(2)}ms`);

    // Increased threshold to 8000ms to avoid flakiness in CI/VM environments
    expect(duration).toBeLessThan(8000);
    expect(result.clippings.length).toBeGreaterThan(100);
  }, 20000);
});
