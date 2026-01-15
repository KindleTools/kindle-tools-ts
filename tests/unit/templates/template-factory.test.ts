import { beforeEach, describe, expect, it } from "vitest";
import { TemplateEngine, TemplateEngineFactory } from "#templates/engine.js";
import type { CustomTemplates } from "#templates/types.js";

describe("TemplateEngineFactory", () => {
  beforeEach(() => {
    TemplateEngineFactory.clearCache();
  });

  it("should return the same instance for the same preset", () => {
    const engine1 = TemplateEngineFactory.getEngine("default");
    const engine2 = TemplateEngineFactory.getEngine("default");
    expect(engine1).toBe(engine2);
  });

  it("should return different instances for different presets", () => {
    const engine1 = TemplateEngineFactory.getEngine("default");
    const engine2 = TemplateEngineFactory.getEngine("minimal");
    expect(engine1).not.toBe(engine2);
  });

  it("should return the same instance for the same custom template object", () => {
    const custom: CustomTemplates = { clipping: "test" };
    const engine1 = TemplateEngineFactory.getEngine(custom);
    const engine2 = TemplateEngineFactory.getEngine(custom);
    expect(engine1).toBe(engine2);
  });

  it("should return different instances for different custom template objects", () => {
    const custom1: CustomTemplates = { clipping: "test1" };
    const custom2: CustomTemplates = { clipping: "test2" };
    const engine1 = TemplateEngineFactory.getEngine(custom1);
    const engine2 = TemplateEngineFactory.getEngine(custom2);
    expect(engine1).not.toBe(engine2);
  });

  it("should return default engine when no argument provided", () => {
    const engine = TemplateEngineFactory.getEngine();
    expect(engine).toBeInstanceOf(TemplateEngine);
  });

  it("should clear cache correctly", () => {
    const engine1 = TemplateEngineFactory.getEngine("default");
    TemplateEngineFactory.clearCache();
    const engine2 = TemplateEngineFactory.getEngine("default");
    expect(engine1).not.toBe(engine2); // Should be a new instance
  });
});
