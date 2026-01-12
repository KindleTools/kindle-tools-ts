import { describe, expect, it } from "vitest";
import { type ImportResult, importSuccess } from "#errors";
import { BaseImporter } from "#importers/shared/base-importer.js";

class TestBrokenImporter extends BaseImporter {
  readonly name = "BrokenImporter";
  readonly extensions = ["broken"];

  protected async doImport(_content: string): Promise<ImportResult> {
    throw new Error("Catastrophic failure");
  }
}

class TestWorkingImporter extends BaseImporter {
  readonly name = "WorkingImporter";
  readonly extensions = ["working"];

  protected async doImport(_content: string): Promise<ImportResult> {
    return this.success([]);
  }
}

describe("BaseImporter", () => {
  it("should handle thrown errors in doImport gracefully", async () => {
    const importer = new TestBrokenImporter();
    const result = await importer.import("some content");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const error = result.error;
      expect(error.code).toBe("IMPORT_UNKNOWN");
      if (error.code === "IMPORT_UNKNOWN") {
        expect(error.cause).toBeDefined();
        expect((error.cause as Error).message).toBe("Catastrophic failure");
      }
    }
  });

  it("should returning empty file error if content is empty", async () => {
    const importer = new TestWorkingImporter();
    const result = await importer.import("");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("IMPORT_EMPTY_FILE");
    }
  });

  it("should returning empty file error if content is whitespace", async () => {
    const importer = new TestWorkingImporter();
    const result = await importer.import("   ");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("IMPORT_EMPTY_FILE");
    }
  });
});
