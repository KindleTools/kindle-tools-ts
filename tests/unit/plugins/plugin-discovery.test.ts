import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  discoverAndLoadPlugins,
  discoverPlugins,
  loadPlugin,
  PLUGIN_PREFIX,
} from "#plugins/discovery.js";
import { pluginRegistry } from "#plugins/registry.js";

// Mock fs.readFile
vi.mock("node:fs/promises", async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import("node:fs/promises")>()),
    readFile: vi.fn(),
  };
});

// Mock console to avoid clutter
const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

// Mock the internal importer
vi.mock("#plugins/importer.js", () => ({
  dynamicImport: vi.fn((packageName) => {
    if (packageName === "kindletools-plugin-valid-exporter") {
      return Promise.resolve({
        plugin: {
          name: "valid-exporter",
          version: "1.0.0",
          format: "test-valid",
          create: () => ({ export: async () => ({ output: "" }) }),
        },
      });
    }
    if (packageName === "kindletools-plugin-default-export") {
      return Promise.resolve({
        default: {
          name: "default-exporter",
          version: "1.0.0",
          format: "test-default",
          create: () => ({ export: async () => ({ output: "" }) }),
        },
      });
    }
    if (packageName === "kindletools-plugin-array-export") {
      return Promise.resolve({
        plugins: [
          {
            name: "array-exporter-1",
            version: "1.0.0",
            format: "test-array-1",
            create: () => ({ export: async () => ({ output: "" }) }),
          },
          {
            name: "array-exporter-2",
            version: "1.0.0",
            format: "test-array-2",
            create: () => ({ export: async () => ({ output: "" }) }),
          },
        ],
      });
    }
    if (packageName === "@scope/kindletools-plugin-scoped") {
      return Promise.resolve({
        plugin: {
          name: "scoped-exporter",
          version: "1.0.0",
          format: "test-scoped",
          create: () => ({ export: async () => ({ output: "" }) }),
        },
      });
    }
    if (packageName === "kindletools-plugin-invalid") {
      return Promise.resolve({
        somethingElse: 123,
      });
    }
    return Promise.reject(new Error(`Module ${packageName} not found`));
  }),
}));

// We do NOT mock the plugins themselves anymore, but the loader.

describe("plugin-discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear registry to avoid pollution between tests
    // Accessing private or internal map if possible, or just trusting the mocks
    (pluginRegistry as any).exporters = new Map();
    (pluginRegistry as any).importers = new Map();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("discoverPlugins", () => {
    it("should discover matching plugins from package.json", async () => {
      const mockPackageJson = {
        dependencies: {
          "kindletools-plugin-one": "1.0.0",
          "other-package": "1.0.0",
        },
        devDependencies: {
          "@scope/kindletools-plugin-two": "1.0.0",
          "kindletools-plugin-three": "1.0.0",
        },
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockPackageJson));

      const plugins = await discoverPlugins();

      expect(plugins).toContain("kindletools-plugin-one");
      expect(plugins).toContain("@scope/kindletools-plugin-two");
      expect(plugins).toContain("kindletools-plugin-three");
      expect(plugins).not.toContain("other-package");
    });

    it("should respect prefix option", async () => {
      const mockPackageJson = {
        dependencies: {
          "custom-prefix-one": "1.0.0",
          "kindletools-plugin-ignored": "1.0.0",
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockPackageJson));

      const plugins = await discoverPlugins({ prefix: "custom-prefix-" });
      expect(plugins).toContain("custom-prefix-one");
      expect(plugins).not.toContain("kindletools-plugin-ignored");
    });

    it("should handle scoped packages correctly", async () => {
      const mockPackageJson = {
        dependencies: {
          "@myorg/kindletools-plugin-custom": "1.0.0",
          "@other/ignored": "1.0.0",
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockPackageJson));

      const plugins = await discoverPlugins();
      expect(plugins).toContain("@myorg/kindletools-plugin-custom");
    });

    it("should return empty array on file read failure (silent catch)", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));
      const plugins = await discoverPlugins();
      expect(plugins).toEqual([]);
    });
  });

  describe("loadPlugin", () => {
    it("should load a plugin with named 'plugin' export", async () => {
      const result = await loadPlugin("kindletools-plugin-valid-exporter");
      expect(result.success).toBe(true);
      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].name).toBe("valid-exporter");
    });

    it("should load a plugin with default export", async () => {
      const result = await loadPlugin("kindletools-plugin-default-export");
      expect(result.success).toBe(true);
      expect(result.plugins[0].name).toBe("default-exporter");
    });

    it("should load plugins with 'plugins' array export", async () => {
      const result = await loadPlugin("kindletools-plugin-array-export");
      expect(result.success).toBe(true);
      expect(result.plugins).toHaveLength(2);
      expect(result.plugins[0].name).toBe("array-exporter-1");
      expect(result.plugins[1].name).toBe("array-exporter-2");
    });

    it("should register plugins by default", async () => {
      // Spy on registry
      const registerSpy = vi.spyOn(pluginRegistry, "registerExporter");

      await loadPlugin("kindletools-plugin-valid-exporter");

      expect(registerSpy).toHaveBeenCalled();
      expect(registerSpy.mock.calls[0][0].name).toBe("valid-exporter");
    });

    it("should NOT register plugins if autoRegister is false", async () => {
      const registerSpy = vi.spyOn(pluginRegistry, "registerExporter");

      await loadPlugin("kindletools-plugin-valid-exporter", { autoRegister: false });

      expect(registerSpy).not.toHaveBeenCalled();
    });

    it("should return error for invalid plugin package", async () => {
      const result = await loadPlugin("kindletools-plugin-invalid");
      expect(result.success).toBe(false);
      expect(result.error).toContain("No valid plugins found");
    });

    it("should handle import errors gracefully", async () => {
      const result = await loadPlugin("non-existent-plugin");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("discoverAndLoadPlugins", () => {
    it("should discover and load plugins", async () => {
      const mockPackageJson = {
        dependencies: {
          "kindletools-plugin-valid-exporter": "1.0.0",
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockPackageJson));

      const results = await discoverAndLoadPlugins();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].packageName).toBe("kindletools-plugin-valid-exporter");
    });
  });
});
