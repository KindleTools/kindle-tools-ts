import { describe, expect, it } from "vitest";
import { dynamicImport } from "#plugins/importer.js";

describe("dynamicImport", () => {
  it("should allow importing a built-in module", async () => {
    const fs = await dynamicImport("node:fs");
    expect(fs).toBeDefined();
    expect(fs.readFileSync).toBeDefined();
  });

  it("should fail gracefully (reject promise) for non-existent module", async () => {
    await expect(dynamicImport("non-existent-module-xyz")).rejects.toThrow();
  });
});
