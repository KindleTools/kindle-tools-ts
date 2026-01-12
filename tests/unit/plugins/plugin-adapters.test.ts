import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "#errors/result.js";
import { ExporterFactory } from "#exporters/core/factory.js";
import { ImporterFactory } from "#importers/core/factory.js";
import {
  enableAutoSync,
  registerExporterPlugin,
  registerImporterPlugin,
  syncExporterPlugins,
  syncImporterPlugins,
} from "#plugins/adapters.js";
import { pluginRegistry } from "#plugins/registry.js";
import type { ExporterPlugin, ImporterPlugin } from "#plugins/types.js";

// Mock factories
vi.mock("#exporters/core/factory.js", () => ({
  ExporterFactory: {
    register: vi.fn(),
  },
}));

vi.mock("#importers/core/factory.js", () => ({
  ImporterFactory: {
    register: vi.fn(),
  },
}));

describe("plugin-adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginRegistry.clear();
  });

  describe("syncExporterPlugins", () => {
    it("should register existing plugins with ExporterFactory", () => {
      const mockPlugin: ExporterPlugin = {
        name: "test-exporter",
        version: "1.0.0",
        format: "test-fmt",
        create: () => ({ export: async () => ok({ output: "" }), name: "inst", extension: "ext" }),
      };
      pluginRegistry.registerExporter(mockPlugin);

      syncExporterPlugins();

      expect(ExporterFactory.register).toHaveBeenCalledWith("test-fmt", expect.any(Function));
    });
  });

  describe("syncImporterPlugins", () => {
    it("should register existing plugins with ImporterFactory", () => {
      const mockPlugin: ImporterPlugin = {
        name: "test-importer",
        version: "1.0.0",
        extensions: ["test-ext"],
        create: () => ({ import: async () => ok({ clippings: [], warnings: [] }), name: "inst" }),
      };
      pluginRegistry.registerImporter(mockPlugin);

      syncImporterPlugins();

      expect(ImporterFactory.register).toHaveBeenCalledWith(".test-ext", expect.any(Function));
    });
  });

  describe("registerExporterPlugin", () => {
    it("should register and sync in one go", () => {
      const mockPlugin: ExporterPlugin = {
        name: "test-exporter",
        version: "1.0.0",
        format: "test-fmt",
        create: () => ({ export: async () => ok({ output: "" }), name: "inst", extension: "ext" }),
      };

      registerExporterPlugin(mockPlugin);

      expect(pluginRegistry.getExporter("test-fmt")).toBeDefined();
      expect(ExporterFactory.register).toHaveBeenCalledWith("test-fmt", expect.any(Function));
    });
  });

  describe("registerImporterPlugin", () => {
    it("should register and sync in one go", () => {
      const mockPlugin: ImporterPlugin = {
        name: "test-importer",
        version: "1.0.0",
        extensions: ["test-ext"],
        create: () => ({ import: async () => ok({ clippings: [], warnings: [] }), name: "inst" }),
      };

      registerImporterPlugin(mockPlugin);

      expect(pluginRegistry.getImporter("test-ext")).toBeDefined();
      expect(ImporterFactory.register).toHaveBeenCalledWith(".test-ext", expect.any(Function));
    });
  });

  describe("enableAutoSync", () => {
    it("should automatically register new plugins when added to registry", () => {
      const cleanup = enableAutoSync();

      const mockPlugin: ExporterPlugin = {
        name: "auto-exporter",
        version: "1.0.0",
        format: "auto-fmt",
        create: () => ({ export: async () => ok({ output: "" }), name: "inst", extension: "ext" }),
      };

      pluginRegistry.registerExporter(mockPlugin);

      expect(ExporterFactory.register).toHaveBeenCalledWith("auto-fmt", expect.any(Function));

      cleanup();
    });

    it("should stop syncing after cleanup", () => {
      const cleanup = enableAutoSync();
      cleanup();

      const mockPlugin: ExporterPlugin = {
        name: "auto-exporter-2",
        version: "1.0.0",
        format: "auto-fmt-2",
        create: () => ({ export: async () => ok({ output: "" }), name: "inst", extension: "ext" }),
      };

      pluginRegistry.registerExporter(mockPlugin);

      expect(ExporterFactory.register).not.toHaveBeenCalledWith("auto-fmt-2", expect.any(Function));
    });

    it("should sync aliases for exporters", () => {
      const cleanup = enableAutoSync();
      const mockPlugin: ExporterPlugin = {
        name: "alias-exporter",
        version: "1.0.0",
        format: "primary",
        aliases: ["alias1", "alias2"],
        create: () => ({ export: async () => ok({ output: "" }), name: "inst", extension: "ext" }),
      };

      pluginRegistry.registerExporter(mockPlugin);

      expect(ExporterFactory.register).toHaveBeenCalledWith("primary", expect.any(Function));
      expect(ExporterFactory.register).toHaveBeenCalledWith("alias1", expect.any(Function));
      expect(ExporterFactory.register).toHaveBeenCalledWith("alias2", expect.any(Function));

      cleanup();
    });

    it("should automatically register new importer plugins when added to registry", () => {
      const cleanup = enableAutoSync();

      const mockPlugin: ImporterPlugin = {
        name: "auto-importer",
        version: "1.0.0",
        extensions: ["auto-ext"],
        create: () => ({ import: async () => ok({ clippings: [], warnings: [] }), name: "inst" }),
      };

      pluginRegistry.registerImporter(mockPlugin);

      expect(ImporterFactory.register).toHaveBeenCalledWith(".auto-ext", expect.any(Function));

      cleanup();
    });
  });
});
