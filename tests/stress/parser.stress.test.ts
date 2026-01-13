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

    // The broken structure file contains various malformed blocks.
    // The parser is designed to be lenient:
    // - Empty/short blocks are silently filtered during tokenization
    // - Blocks with 2+ lines and a "-" metadata line are parsed with fallback values
    // - Only completely corrupted blocks (non-"- " metadata) generate warnings
    //
    // This lenient behavior is intentional to handle real-world clippings files
    // that may have minor formatting issues.

    // Should not crash and should extract something
    expect(result.clippings.length).toBeGreaterThan(0);

    // The valid clipping at the end should be parsed correctly
    const validClipping = result.clippings.find((c) => c.title === "Valid Book");
    expect(validClipping).toBeDefined();
    expect(validClipping?.author).toBe("Valid Author");
    expect(validClipping?.type).toBe("highlight");
  });

  it("should parse a massive file (5MB) within reasonable time", async () => {
    const massiveContent = generateMassiveFile(5); // 5MB
    const start = performance.now();

    const result = parse(massiveContent);

    const end = performance.now();
    const duration = end - start;

    console.log(`Parsed 5MB in ${duration.toFixed(2)}ms`);

    // Threshold set high (15s) to accommodate slow environments (CI, VMs, WSL).
    // On fast machines this typically completes in 2-4s.
    // The goal is to catch catastrophic performance regressions, not micro-optimizations.
    expect(duration).toBeLessThan(15000);
    expect(result.clippings.length).toBeGreaterThan(100);
  }, 30000);
});
