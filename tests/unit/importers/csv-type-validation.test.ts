import { describe, expect, it } from "vitest";
import { CsvImporter } from "#importers/index.js";

describe("CsvImporter Type Validation", () => {
  const importer = new CsvImporter();

  it("should fail when page is not a number", async () => {
    const csv = `id,title,content,page
"1","Book","Content","not-a-number"`;

    const result = await importer.import(csv);

    // Currently this might pass with NaN or string, we want it to fail or warn
    // For now we expect it to FAIL validation with the new changes
    if (result.isOk()) {
      // If it succeeds currently (before fix), we might see page as NaN or similar
      // This assertion helps us confirm the current behavior vs expected
      const clipping = result.value.clippings[0];
      // If strict validation is missing, this might be NaN
      console.log("Current page value:", clipping.page);
    }

    // We expect strict validation to return an error or warning for the row
    // But for this reproduction, let's assert what we WANT to see after fix:
    // It should ideally not produce a valid clipping with invalid metadata,
    // OR it should have warnings/errors.
    // Let's assume we want to reject the row or return a validation error.

    // Changing expectation to rely on 'result.isOk()' being true but containing warnings, OR 'result.isErr()'
    // depending on completely invalid file vs single row error.
    // Based on BaseImporter, individual row errors usually result in warnings or partial success.

    // Let's assert that we get a warning or error about the page field.
    if (result.isOk()) {
      const warnings = result.value.warnings || [];
      const hasPageWarning = warnings.some((w) => w.toLowerCase().includes("page"));
      expect(hasPageWarning).toBe(true);
    } else {
      // Check structured errors if available, or fall back to message
      const validationErrors = (result.error as any).errors || [];
      const hasPageError =
        validationErrors.some(
          (e: any) => e.message.toLowerCase().includes("page") || e.field === "page",
        ) || result.error.message.toLowerCase().includes("page");
      expect(hasPageError).toBe(true);
    }
  });

  it("should fail when wordcount is not a number", async () => {
    const csv = `id,title,content,wordcount
"1","Book","Content","many"`;

    const result = await importer.import(csv);

    if (result.isOk()) {
      const warnings = result.value.warnings || [];
      const hasWarning = warnings.some(
        (w) => w.toLowerCase().includes("wordcount") || w.toLowerCase().includes("word count"),
      );
      expect(hasWarning).toBe(true);
    } else {
      const validationErrors = (result.error as any).errors || [];
      const hasError =
        validationErrors.some(
          (e: any) => e.message.toLowerCase().includes("word count") || e.field === "wordcount",
        ) || result.error.message.toLowerCase().includes("wordcount");
      expect(hasError).toBe(true);
    }
  });

  it("should fail when type is invalid", async () => {
    const csv = `id,title,content,type
"1","Book","Content","super-highlight"`;

    const result = await importer.import(csv);

    if (result.isOk()) {
      const warnings = result.value.warnings || [];
      const hasWarning = warnings.some((w) => w.toLowerCase().includes("type"));
      expect(hasWarning).toBe(true);
    } else {
      const validationErrors = (result.error as any).errors || [];
      const hasError =
        validationErrors.some(
          (e: any) =>
            e.message.toLowerCase().includes("enum") ||
            e.message.toLowerCase().includes("type") ||
            e.field === "type",
        ) || result.error.message.toLowerCase().includes("type");
      expect(hasError).toBe(true);
    }
  });
});
