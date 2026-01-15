import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "#errors";
import { type ExporterPlugin, type ImporterPlugin, PluginRegistry } from "#plugins";

describe("PluginRegistry Lifecycle", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
    vi.clearAllMocks();
  });

  afterEach(() => {
    registry.clear();
  });

  describe("Singleton Instance Management", () => {
    const validExporterPlugin: ExporterPlugin = {
      name: "lifecycle-exporter",
      version: "1.0.0",
      format: "lifecycle",
      create: vi.fn(() => ({
        name: "Lifecycle Exporter",
        extension: ".lifecycle",
        export: async () => ({ success: true, output: "test" }) as never,
      })),
    };

    it("should return the same instance on multiple calls (Singleton)", () => {
      registry.registerExporter(validExporterPlugin);

      const instance1 = registry.getExporter("lifecycle");
      const instance2 = registry.getExporter("lifecycle");

      expect(instance1).toBeDefined();
      expect(instance1).toBe(instance2);
      expect(validExporterPlugin.create).toHaveBeenCalledTimes(1);
    });

    it("should create new instance after reset", () => {
      registry.registerExporter(validExporterPlugin);

      const instance1 = registry.getExporter("lifecycle");
      registry.resetPluginInstance("lifecycle-exporter");
      const instance2 = registry.getExporter("lifecycle");

      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1).not.toBe(instance2);
      expect(validExporterPlugin.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("Instance Validation", () => {
    it("should throw validation error if exporter returns invalid instance", () => {
      const invalidExporterPlugin: ExporterPlugin = {
        name: "invalid-exporter",
        version: "1.0.0",
        format: "invalid",
        // @ts-expect-error - testing runtime validation
        create: () => ({
          // Missing required methods/props
          name: "Invalid",
        }),
      };

      registry.registerExporter(invalidExporterPlugin);

      expect(() => registry.getExporter("invalid")).toThrow(AppException);
      try {
        registry.getExporter("invalid");
      } catch (e) {
        expect(e).toBeInstanceOf(AppException);
        if (e instanceof AppException) {
          expect(e.code).toBe("PLUGIN_INVALID_INSTANCE");
          expect(e.message).toContain("did not return a valid Exporter instance");
        }
      }
    });

    it("should throw validation error if importer returns invalid instance", () => {
      const invalidImporterPlugin: ImporterPlugin = {
        name: "invalid-importer",
        version: "1.0.0",
        extensions: [".invalid"],
        // @ts-expect-error - testing runtime validation
        create: () => ({
          // Missing import method
          name: "Invalid Importer",
        }),
      };

      registry.registerImporter(invalidImporterPlugin);

      expect(() => registry.getImporter(".invalid")).toThrow(AppException);
      try {
        registry.getImporter(".invalid");
      } catch (e) {
        expect(e).toBeInstanceOf(AppException);
        if (e instanceof AppException) {
          expect(e.code).toBe("PLUGIN_INVALID_INSTANCE");
        }
      }
    });
  });
});
