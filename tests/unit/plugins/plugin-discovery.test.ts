import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discoverAndLoadPlugins, discoverPlugins, loadPlugin } from "#plugins/discovery.js";
import { pluginRegistry } from "#plugins/registry.js";
import { MemoryFileSystem, resetFileSystem, setFileSystem } from "#ports";

// Mock console to avoid clutter
vi.spyOn(console, "warn").mockImplementation(() => {});

// Mock the internal importer (still needed for dynamic imports of plugin packages)
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
    if (packageName === "kindletools-plugin-default-array") {
      return Promise.resolve({
        default: [
          {
            name: "default-array-1",
            version: "1.0.0",
            format: "test-default-array-1",
            create: () => ({ export: async () => ({ output: "" }) }),
          },
          {
            name: "default-array-2",
            version: "1.0.0",
            format: "test-default-array-2",
            create: () => ({ export: async () => ({ output: "" }) }),
          },
        ],
      });
    }
    if (packageName === "kindletools-plugin-named-exports") {
      return Promise.resolve({
        exporter1: {
          name: "named-exporter-1",
          version: "1.0.0",
          format: "test-named-1",
          create: () => ({ export: async () => ({ output: "" }) }),
        },
        exporter2: {
          name: "named-exporter-2",
          version: "1.0.0",
          format: "test-named-2",
          create: () => ({ export: async () => ({ output: "" }) }),
        },
        // Duplicate name to test filtering
        exporterDuplicate: {
          name: "named-exporter-1", // Same name as exporter1
          version: "1.0.0",
          format: "test-named-1",
          create: () => ({ export: async () => ({ output: "" }) }),
        },
      });
    }
    return Promise.reject(new Error(`Module ${packageName} not found`));
  }),
}));

describe("plugin-discovery", () => {
  let memFs: MemoryFileSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup MemoryFileSystem for package.json reading
    memFs = new MemoryFileSystem();
    setFileSystem(memFs);
    // Clear registry to avoid pollution between tests
    // biome-ignore lint/suspicious/noExplicitAny: Accessing private properties for testing
    (pluginRegistry as any).exporters = new Map();
    // biome-ignore lint/suspicious/noExplicitAny: Accessing private properties for testing
    (pluginRegistry as any).importers = new Map();
  });

  afterEach(() => {
    resetFileSystem();
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

      memFs.addFile(`${process.cwd()}/package.json`, JSON.stringify(mockPackageJson));

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
      memFs.addFile(`${process.cwd()}/package.json`, JSON.stringify(mockPackageJson));

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
      memFs.addFile(`${process.cwd()}/package.json`, JSON.stringify(mockPackageJson));

      const plugins = await discoverPlugins();
      expect(plugins).toContain("@myorg/kindletools-plugin-custom");
    });

    it("should return empty array on file read failure (silent catch)", async () => {
      // Don't add any package.json - MemoryFileSystem will throw ENOENT
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
    it("should load plugins with default export as array", async () => {
      const result = await loadPlugin("kindletools-plugin-default-array");
      expect(result.success).toBe(true);
      expect(result.plugins).toHaveLength(2);
      expect(result.plugins[0].name).toBe("default-array-1");
      expect(result.plugins[1].name).toBe("default-array-2");
    });

    it("should load plugins from individual named exports and filter duplicates", async () => {
      const result = await loadPlugin("kindletools-plugin-named-exports");
      expect(result.success).toBe(true);
      expect(result.plugins).toHaveLength(2);
      expect(result.plugins.map((p) => p.name).sort()).toEqual([
        "named-exporter-1",
        "named-exporter-2",
      ]);
    });
  });

  describe("discoverPlugins auto-register", () => {
    it("should auto-register discovered plugins when requested", async () => {
      const mockPackageJson = {
        dependencies: {
          "kindletools-plugin-valid-exporter": "1.0.0",
        },
      };
      memFs.addFile(`${process.cwd()}/package.json`, JSON.stringify(mockPackageJson));

      const registerSpy = vi.spyOn(pluginRegistry, "registerExporter");

      await discoverPlugins({ autoRegister: true });

      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ name: "valid-exporter" }));
    });
  });

  describe("discoverAndLoadPlugins", () => {
    it("should discover and load plugins", async () => {
      const mockPackageJson = {
        dependencies: {
          "kindletools-plugin-valid-exporter": "1.0.0",
        },
      };
      memFs.addFile(`${process.cwd()}/package.json`, JSON.stringify(mockPackageJson));

      const results = await discoverAndLoadPlugins();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].packageName).toBe("kindletools-plugin-valid-exporter");
    });
  });
});
