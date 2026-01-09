/**
 * Integration tests for the config loader.
 *
 * Tests the cosmiconfig-based configuration loading from .kindletoolsrc files.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearConfigCache, loadConfig, loadConfigSync } from "#config/index.js";

describe("Config Loader", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temp directory for test files
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "kindle-tools-config-test-"));
  });

  afterEach(async () => {
    // Clean up
    clearConfigCache();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("loadConfigSync", () => {
    it("should return null when no config file exists", () => {
      const result = loadConfigSync({ searchFrom: testDir });
      expect(result).toBeNull();
    });

    it("should load .kindletoolsrc JSON file", async () => {
      const configPath = path.join(testDir, ".kindletoolsrc");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          format: "obsidian",
          language: "es",
          extractTags: true,
        }),
      );

      const result = loadConfigSync({ searchFrom: testDir });

      expect(result).not.toBeNull();
      expect(result?.config.format).toBe("obsidian");
      expect(result?.config.language).toBe("es");
      expect(result?.config.extractTags).toBe(true);
      expect(result?.filepath).toContain(".kindletoolsrc");
    });

    it("should load .kindletoolsrc.json file", async () => {
      const configPath = path.join(testDir, ".kindletoolsrc.json");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          format: "joplin",
          groupByBook: true,
          authorCase: "uppercase",
        }),
      );

      const result = loadConfigSync({ searchFrom: testDir });

      expect(result).not.toBeNull();
      expect(result?.config.format).toBe("joplin");
      expect(result?.config.groupByBook).toBe(true);
      expect(result?.config.authorCase).toBe("uppercase");
    });

    it("should apply defaults for missing fields", async () => {
      const configPath = path.join(testDir, ".kindletoolsrc");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          format: "csv",
        }),
      );

      const result = loadConfigSync({ searchFrom: testDir });

      expect(result).not.toBeNull();
      expect(result?.config.format).toBe("csv");
      // Default values from schema
      expect(result?.config.removeDuplicates).toBe(true);
      expect(result?.config.mergeNotes).toBe(true);
      expect(result?.config.extractTags).toBe(false);
    });

    it("should load specific config file path", async () => {
      const customPath = path.join(testDir, "custom-config.json");
      await fs.writeFile(
        customPath,
        JSON.stringify({
          format: "html",
          pretty: true,
        }),
      );

      const result = loadConfigSync({ configPath: customPath });

      expect(result).not.toBeNull();
      expect(result?.config.format).toBe("html");
      expect(result?.config.pretty).toBe(true);
      expect(result?.filepath).toBe(customPath);
    });

    it("should throw on invalid config", async () => {
      const configPath = path.join(testDir, ".kindletoolsrc");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          folderStructure: "invalid-value",
        }),
      );

      expect(() => loadConfigSync({ searchFrom: testDir })).toThrow();
    });

    it("should load nested parse options", async () => {
      const configPath = path.join(testDir, ".kindletoolsrc");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          format: "obsidian",
          parse: {
            removeDuplicates: false,
            mergeOverlapping: false,
            highlightsOnly: true,
          },
        }),
      );

      const result = loadConfigSync({ searchFrom: testDir });

      expect(result).not.toBeNull();
      expect(result?.config.parse?.removeDuplicates).toBe(false);
      expect(result?.config.parse?.mergeOverlapping).toBe(false);
      expect(result?.config.parse?.highlightsOnly).toBe(true);
    });
  });

  describe("loadConfig (async)", () => {
    it("should return null when no config file exists", async () => {
      const result = await loadConfig({ searchFrom: testDir });
      expect(result).toBeNull();
    });

    it("should load config file asynchronously", async () => {
      const configPath = path.join(testDir, ".kindletoolsrc.json");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          format: "markdown",
          output: "./exports",
          title: "My Kindle Highlights",
        }),
      );

      const result = await loadConfig({ searchFrom: testDir });

      expect(result).not.toBeNull();
      expect(result?.config.format).toBe("markdown");
      expect(result?.config.output).toBe("./exports");
      expect(result?.config.title).toBe("My Kindle Highlights");
    });
  });

  describe("config with all export options", () => {
    it("should support all export-related fields", async () => {
      const configPath = path.join(testDir, ".kindletoolsrc.json");
      await fs.writeFile(
        configPath,
        JSON.stringify({
          format: "obsidian",
          output: "./obsidian-exports",
          folderStructure: "by-author",
          authorCase: "uppercase",
          groupByBook: true,
          includeTags: true,
          pretty: true,
          title: "Reading Notes",
          creator: "Test User",
          extractTags: true,
          tagCase: "lowercase",
        }),
      );

      const result = loadConfigSync({ searchFrom: testDir });

      expect(result).not.toBeNull();
      const config = result!.config;
      expect(config.format).toBe("obsidian");
      expect(config.output).toBe("./obsidian-exports");
      expect(config.folderStructure).toBe("by-author");
      expect(config.authorCase).toBe("uppercase");
      expect(config.groupByBook).toBe(true);
      expect(config.includeTags).toBe(true);
      expect(config.pretty).toBe(true);
      expect(config.title).toBe("Reading Notes");
      expect(config.creator).toBe("Test User");
      expect(config.extractTags).toBe(true);
      expect(config.tagCase).toBe("lowercase");
    });
  });
});
