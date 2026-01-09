/**
 * Tests for the plugin system.
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ExporterPlugin,
  type ImporterPlugin,
  isExporterPlugin,
  isImporterPlugin,
  PluginRegistry,
  pluginRegistry,
} from "../src/plugins/index.js";

describe("Plugin System", () => {
  describe("PluginRegistry", () => {
    let registry: PluginRegistry;

    beforeEach(() => {
      registry = new PluginRegistry();
    });

    afterEach(() => {
      registry.clear();
    });

    describe("Exporter Plugins", () => {
      const validExporterPlugin: ExporterPlugin = {
        name: "test-exporter",
        version: "1.0.0",
        format: "test",
        description: "A test exporter",
        create: () => ({
          name: "Test Exporter",
          extension: ".test",
          export: async () => ({ success: true, output: "test" }) as never,
        }),
      };

      it("should register a valid exporter plugin", () => {
        registry.registerExporter(validExporterPlugin);
        expect(registry.hasExporter("test")).toBe(true);
        expect(registry.getExporterFormats()).toContain("test");
      });

      it("should create exporter instances", () => {
        registry.registerExporter(validExporterPlugin);
        const exporter = registry.getExporter("test");
        expect(exporter).not.toBeNull();
        expect(exporter?.name).toBe("Test Exporter");
        expect(exporter?.extension).toBe(".test");
      });

      it("should handle format aliases", () => {
        const pluginWithAliases: ExporterPlugin = {
          ...validExporterPlugin,
          aliases: ["alt-test", "test-alt"],
        };
        registry.registerExporter(pluginWithAliases);

        expect(registry.hasExporter("test")).toBe(true);
        expect(registry.hasExporter("alt-test")).toBe(true);
        expect(registry.hasExporter("test-alt")).toBe(true);
      });

      it("should reject duplicate formats by default", () => {
        registry.registerExporter(validExporterPlugin);
        expect(() => registry.registerExporter(validExporterPlugin)).toThrow(/already registered/);
      });

      it("should allow overwriting with option", () => {
        registry.registerExporter(validExporterPlugin);
        expect(() =>
          registry.registerExporter(validExporterPlugin, { allowOverwrite: true }),
        ).not.toThrow();
      });

      it("should unregister exporter plugins", () => {
        registry.registerExporter(validExporterPlugin);
        expect(registry.hasExporter("test")).toBe(true);

        const result = registry.unregisterExporter("test-exporter");
        expect(result).toBe(true);
        expect(registry.hasExporter("test")).toBe(false);
      });

      it("should return null for unknown formats", () => {
        expect(registry.getExporter("unknown")).toBeNull();
      });

      it("should reject plugins with invalid names", () => {
        const invalidPlugin = { ...validExporterPlugin, name: "" };
        expect(() => registry.registerExporter(invalidPlugin)).toThrow(/name/);
      });

      it("should reject plugins with invalid versions", () => {
        const invalidPlugin = { ...validExporterPlugin, version: "invalid" };
        expect(() => registry.registerExporter(invalidPlugin)).toThrow(/version/);
      });

      it("should reject plugins without format", () => {
        const invalidPlugin = { ...validExporterPlugin, format: "" };
        expect(() => registry.registerExporter(invalidPlugin)).toThrow(/format/);
      });

      it("should reject plugins without create function", () => {
        const invalidPlugin = { ...validExporterPlugin, create: null as never };
        expect(() => registry.registerExporter(invalidPlugin)).toThrow(/create/);
      });
    });

    describe("Importer Plugins", () => {
      const validImporterPlugin: ImporterPlugin = {
        name: "test-importer",
        version: "1.0.0",
        extensions: [".test", ".tst"],
        description: "A test importer",
        create: () => ({
          name: "Test Importer",
          import: async () => ({ success: true, clippings: [] }) as never,
        }),
      };

      it("should register a valid importer plugin", () => {
        registry.registerImporter(validImporterPlugin);
        expect(registry.hasImporter(".test")).toBe(true);
        expect(registry.hasImporter(".tst")).toBe(true);
        expect(registry.getImporterExtensions()).toContain(".test");
        expect(registry.getImporterExtensions()).toContain(".tst");
      });

      it("should create importer instances", () => {
        registry.registerImporter(validImporterPlugin);
        const importer = registry.getImporter(".test");
        expect(importer).not.toBeNull();
        expect(importer?.name).toBe("Test Importer");
      });

      it("should normalize extension case", () => {
        registry.registerImporter(validImporterPlugin);
        expect(registry.hasImporter(".TEST")).toBe(true);
        expect(registry.hasImporter("test")).toBe(true); // Without dot
      });

      it("should reject duplicate extensions by default", () => {
        registry.registerImporter(validImporterPlugin);
        expect(() => registry.registerImporter(validImporterPlugin)).toThrow(/already registered/);
      });

      it("should allow overwriting with option", () => {
        registry.registerImporter(validImporterPlugin);
        expect(() =>
          registry.registerImporter(validImporterPlugin, { allowOverwrite: true }),
        ).not.toThrow();
      });

      it("should unregister importer plugins", () => {
        registry.registerImporter(validImporterPlugin);
        expect(registry.hasImporter(".test")).toBe(true);

        const result = registry.unregisterImporter("test-importer");
        expect(result).toBe(true);
        expect(registry.hasImporter(".test")).toBe(false);
      });

      it("should return null for unknown extensions", () => {
        expect(registry.getImporter(".unknown")).toBeNull();
      });

      it("should reject plugins with empty extensions", () => {
        const invalidPlugin = { ...validImporterPlugin, extensions: [] };
        expect(() => registry.registerImporter(invalidPlugin)).toThrow(/extension/);
      });

      it("should reject plugins without create function", () => {
        const invalidPlugin = { ...validImporterPlugin, create: null as never };
        expect(() => registry.registerImporter(invalidPlugin)).toThrow(/create/);
      });
    });

    describe("Event System", () => {
      it("should emit events on exporter registration", () => {
        const listener = vi.fn();
        registry.on("exporter:registered", listener);

        const plugin: ExporterPlugin = {
          name: "event-test",
          version: "1.0.0",
          format: "event",
          create: () => ({
            name: "Event Plugin",
            extension: ".evt",
            export: async () => ({ success: true, output: "" }) as never,
          }),
        };

        registry.registerExporter(plugin);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "exporter:registered",
            plugin,
          }),
        );
      });

      it("should emit events on importer registration", () => {
        const listener = vi.fn();
        registry.on("importer:registered", listener);

        const plugin: ImporterPlugin = {
          name: "event-test-import",
          version: "1.0.0",
          extensions: [".evt"],
          create: () => ({
            name: "Event Importer",
            import: async () => ({ success: true, clippings: [] }) as never,
          }),
        };

        registry.registerImporter(plugin);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "importer:registered",
            plugin,
          }),
        );
      });

      it("should allow unsubscribing from events", () => {
        const listener = vi.fn();
        const unsubscribe = registry.on("exporter:registered", listener);

        unsubscribe();

        registry.registerExporter({
          name: "test",
          version: "1.0.0",
          format: "test",
          create: () => ({
            name: "Test",
            extension: ".test",
            export: async () => ({ success: true, output: "" }) as never,
          }),
        });

        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe("Plugin Queries", () => {
      const exporterPlugin: ExporterPlugin = {
        name: "query-exporter",
        version: "1.0.0",
        format: "query",
        create: () => ({
          name: "Query Exporter",
          extension: ".q",
          export: async () => ({ success: true, output: "" }) as never,
        }),
      };

      const importerPlugin: ImporterPlugin = {
        name: "query-importer",
        version: "2.0.0",
        extensions: [".query"],
        create: () => ({
          name: "Query Importer",
          import: async () => ({ success: true, clippings: [] }) as never,
        }),
      };

      it("should get plugin by name", () => {
        registry.registerExporter(exporterPlugin);
        const plugin = registry.getPlugin("query-exporter");
        expect(plugin).toBeDefined();
        expect(plugin?.name).toBe("query-exporter");
        expect(plugin?.version).toBe("1.0.0");
      });

      it("should get all plugins", () => {
        registry.registerExporter(exporterPlugin);
        registry.registerImporter(importerPlugin);

        const plugins = registry.getAllPlugins();
        expect(plugins).toHaveLength(2);
      });

      it("should get plugin counts", () => {
        registry.registerExporter(exporterPlugin);
        registry.registerImporter(importerPlugin);

        const counts = registry.getPluginCount();
        expect(counts.importers).toBe(1);
        expect(counts.exporters).toBe(1);
        expect(counts.total).toBe(2);
      });

      it("should generate summary", () => {
        registry.registerExporter(exporterPlugin);
        registry.registerImporter(importerPlugin);

        const summary = registry.getSummary();
        expect(summary).toContain("Total plugins: 2");
        expect(summary).toContain("query");
        expect(summary).toContain(".query");
      });
    });

    describe("clear()", () => {
      it("should clear all registered plugins", () => {
        registry.registerExporter({
          name: "clear-test",
          version: "1.0.0",
          format: "clear",
          create: () => ({
            name: "Clear Test",
            extension: ".clr",
            export: async () => ({ success: true, output: "" }) as never,
          }),
        });

        registry.registerImporter({
          name: "clear-import",
          version: "1.0.0",
          extensions: [".clr"],
          create: () => ({
            name: "Clear Import",
            import: async () => ({ success: true, clippings: [] }) as never,
          }),
        });

        registry.clear();

        expect(registry.getPluginCount().total).toBe(0);
        expect(registry.getExporterFormats()).toHaveLength(0);
        expect(registry.getImporterExtensions()).toHaveLength(0);
      });
    });
  });

  describe("Type Guards", () => {
    const exporterPlugin: ExporterPlugin = {
      name: "guard-exporter",
      version: "1.0.0",
      format: "guard",
      create: () => ({
        name: "Guard Exporter",
        extension: ".g",
        export: async () => ({ success: true, output: "" }) as never,
      }),
    };

    const importerPlugin: ImporterPlugin = {
      name: "guard-importer",
      version: "1.0.0",
      extensions: [".guard"],
      create: () => ({
        name: "Guard Importer",
        import: async () => ({ success: true, clippings: [] }) as never,
      }),
    };

    it("isExporterPlugin should identify exporter plugins", () => {
      expect(isExporterPlugin(exporterPlugin)).toBe(true);
      expect(isExporterPlugin(importerPlugin)).toBe(false);
    });

    it("isImporterPlugin should identify importer plugins", () => {
      expect(isImporterPlugin(importerPlugin)).toBe(true);
      expect(isImporterPlugin(exporterPlugin)).toBe(false);
    });
  });

  describe("Global pluginRegistry", () => {
    afterEach(() => {
      pluginRegistry.clear();
    });

    it("should be a singleton instance", () => {
      pluginRegistry.registerExporter({
        name: "singleton-test",
        version: "1.0.0",
        format: "singleton",
        create: () => ({
          name: "Singleton Test",
          extension: ".sing",
          export: async () => ({ success: true, output: "" }) as never,
        }),
      });

      expect(pluginRegistry.hasExporter("singleton")).toBe(true);
    });
  });
});
