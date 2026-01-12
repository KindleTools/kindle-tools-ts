/**
 * Tests for the plugin system.
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Clipping } from "#app-types/clipping.js";
import { AppException } from "#errors";
import {
  AnkiExporter,
  ankiExporterPlugin,
  createHeaderHook,
  createHighlightsOnlyFilter,
  createMinLengthFilter,
  createTimestampHook,
  type ExporterPlugin,
  HookRegistry,
  hookRegistry,
  type ImporterPlugin,
  isExporterPlugin,
  isImporterPlugin,
  PluginRegistry,
  pluginRegistry,
} from "#plugins";

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
        expect(() => registry.registerExporter(validExporterPlugin)).toThrow(AppException);
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
        expect(() => registry.registerExporter(invalidPlugin)).toThrow(AppException);
      });

      it("should reject plugins with invalid versions", () => {
        const invalidPlugin = { ...validExporterPlugin, version: "invalid" };
        expect(() => registry.registerExporter(invalidPlugin)).toThrow(AppException);
      });

      it("should reject plugins without format", () => {
        const invalidPlugin = { ...validExporterPlugin, format: "" };
        expect(() => registry.registerExporter(invalidPlugin)).toThrow(AppException);
      });

      it("should reject plugins without create function", () => {
        const invalidPlugin = { ...validExporterPlugin, create: null as never };
        expect(() => registry.registerExporter(invalidPlugin)).toThrow(AppException);
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
        expect(() => registry.registerImporter(validImporterPlugin)).toThrow(AppException);
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
        expect(() => registry.registerImporter(invalidPlugin)).toThrow(AppException);
      });

      it("should reject plugins without create function", () => {
        const invalidPlugin = { ...validImporterPlugin, create: null as never };
        expect(() => registry.registerImporter(invalidPlugin)).toThrow(AppException);
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

describe("HookRegistry", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  afterEach(() => {
    registry.clear();
    hookRegistry.clear();
  });

  describe("beforeImport hooks", () => {
    it("should run beforeImport hooks", async () => {
      registry.add("beforeImport", (content: string) => content.toUpperCase());
      const result = await registry.runBeforeImport("test content");
      expect(result).toBe("TEST CONTENT");
    });

    it("should chain multiple hooks", async () => {
      registry.add("beforeImport", (content: string) => content + " first");
      registry.add("beforeImport", (content: string) => content + " second");
      const result = await registry.runBeforeImport("start");
      expect(result).toBe("start first second");
    });
  });

  describe("beforeExport hooks", () => {
    it("should run beforeExport hooks and filter clippings", async () => {
      const clippings = [
        { id: "1", content: "short", type: "highlight" },
        { id: "2", content: "this is a longer highlight content", type: "highlight" },
      ] as never[];

      registry.add("beforeExport", (clips: Clipping[]) =>
        clips.filter((c) => (c.content?.length ?? 0) > 10),
      );

      const result = await registry.runBeforeExport(clippings, "json");
      expect(result).toHaveLength(1);
    });
  });

  describe("afterExport hooks", () => {
    it("should run afterExport hooks and transform output", async () => {
      registry.add("afterExport", (output: string) => `<!-- Header -->\n${output}`);
      const result = await registry.runAfterExport("content", "md");
      expect(result).toBe("<!-- Header -->\ncontent");
    });

    it("should pass format to hook", async () => {
      let capturedFormat = "";
      registry.add("afterExport", (output: string, format: string) => {
        capturedFormat = format;
        return output;
      });
      await registry.runAfterExport("content", "json");
      expect(capturedFormat).toBe("json");
    });
  });

  describe("hook management", () => {
    it("should unregister hooks", () => {
      const unsubscribe = registry.add("beforeImport", (c: string) => c);
      expect(registry.hasHooks("beforeImport")).toBe(true);

      unsubscribe();
      expect(registry.hasHooks("beforeImport")).toBe(false);
    });

    it("should get hook counts", () => {
      registry.add("beforeImport", (c: string) => c);
      registry.add("afterImport", (c: Clipping[]) => c);
      registry.add("beforeExport", (c: Clipping[]) => c);

      const counts = registry.getHookCount();
      expect(counts.beforeImport).toBe(1);
      expect(counts.afterImport).toBe(1);
      expect(counts.beforeExport).toBe(1);
      expect(counts.afterExport).toBe(0);
    });

    it("should clear specific hook type", () => {
      registry.add("beforeImport", (c: string) => c);
      registry.add("afterExport", (c: string) => c);

      registry.clearType("beforeImport");

      expect(registry.hasHooks("beforeImport")).toBe(false);
      expect(registry.hasHooks("afterExport")).toBe(true);
    });
  });

  describe("utility hooks", () => {
    it("createMinLengthFilter should filter by content length", async () => {
      const filter = createMinLengthFilter(10);
      const clippings = [{ content: "short" }, { content: "longer content here" }] as never[];

      const result = await filter(clippings, "json");
      expect(result).toHaveLength(1);
    });

    it("createHighlightsOnlyFilter should filter by type", async () => {
      const filter = createHighlightsOnlyFilter();
      const clippings = [
        { type: "highlight", content: "test" },
        { type: "note", content: "note" },
        { type: "bookmark", content: "" },
      ] as never[];

      const result = await filter(clippings, "json");
      expect(result).toHaveLength(1);
    });

    it("createHeaderHook should add header", async () => {
      const hook = createHeaderHook("// Generated");
      const result = await hook("content", "md");
      expect(result).toBe("// Generated\ncontent");
    });

    it("createTimestampHook should add timestamp for non-json", async () => {
      const hook = createTimestampHook();
      const result = await hook("content", "md");
      expect(result).toContain("// Generated:");
      expect(result).toContain("content");
    });

    it("createTimestampHook should NOT add timestamp for json", async () => {
      const hook = createTimestampHook();
      const result = await hook('{"a":1}', "json");
      expect(result).toBe('{"a":1}');
    });

    it("createMinLengthFilter should handle null content", async () => {
      const filter = createMinLengthFilter(10);
      const clippings = [{ content: null }] as never[];
      // Should treat null as length 0 and filter it out
      const result = await filter(clippings, "json");
      expect(result).toHaveLength(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle double unsubscribe gracefully", () => {
      const registry = new HookRegistry();
      const unsubscribe = registry.add("beforeImport", (c) => c);

      // First unsubscribe works
      unsubscribe();
      expect(registry.hasHooks("beforeImport")).toBe(false);

      // Second unsubscribe does nothing (and doesn't throw)
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});

describe("AnkiExporter", () => {
  describe("ankiExporterPlugin", () => {
    it("should have correct metadata", () => {
      expect(ankiExporterPlugin.name).toBe("anki-exporter");
      expect(ankiExporterPlugin.version).toBe("1.0.0");
      expect(ankiExporterPlugin.format).toBe("anki");
      expect(ankiExporterPlugin.aliases).toContain("anki-tsv");
    });

    it("should create exporter instances", () => {
      const exporter = ankiExporterPlugin.create();
      expect(exporter.name).toBe("Anki Exporter");
      expect(exporter.extension).toBe(".txt");
    });
  });

  describe("AnkiExporter.export()", () => {
    const exporter = new AnkiExporter();

    const sampleClippings = [
      {
        id: "1",
        title: "The Art of War",
        author: "Sun Tzu",
        content: "All warfare is based on deception.",
        type: "highlight",
        location: { start: 100, end: 105, raw: "100-105" },
        tags: ["strategy"],
      },
      {
        id: "2",
        title: "Deep Work",
        author: "Cal Newport",
        content: "Focus is the new IQ.",
        type: "highlight",
        location: { start: 50, end: 55, raw: "50-55" },
      },
    ] as never[];

    it("should export to TSV format", async () => {
      const result = await exporter.export(sampleClippings);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const output = result.value.output as string;
        expect(output).toContain("#separator:tab");
        expect(output).toContain("#deck:Kindle Highlights");
        expect(output).toContain("The Art of War");
        expect(output).toContain("All warfare is based on deception");
      }
    });

    it("should use custom deck name", async () => {
      const result = await exporter.export(sampleClippings, {
        deckName: "My Reading Notes",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toContain("#deck:My Reading Notes");
      }
    });

    it("should filter to highlights only by default", async () => {
      const mixedClippings = [
        ...sampleClippings,
        { id: "3", title: "Test", content: "A note", type: "note" },
      ] as never[];

      const result = await exporter.export(mixedClippings, {
        highlightsOnly: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const lines = (result.value.output as string)
          .split("\n")
          .filter((l) => !l.startsWith("#") && l.trim());
        expect(lines).toHaveLength(2); // Only highlights
      }
    });

    it("should include tags", async () => {
      const result = await exporter.export(sampleClippings);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toContain("book::the_art_of_war");
        expect(result.value.output).toContain("author::sun_tzu");
        expect(result.value.output).toContain("strategy");
      }
    });

    it("should return error for empty clippings", async () => {
      const result = await exporter.export([]);
      expect(result.isErr()).toBe(true);
    });

    it("should include HTML formatting by default", async () => {
      const result = await exporter.export(sampleClippings, {
        htmlEnabled: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toContain("<b>");
        expect(result.value.output).toContain("</b>");
      }
    });
  });
});
