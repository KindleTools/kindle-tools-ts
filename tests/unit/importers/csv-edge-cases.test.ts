import { describe, it, expect } from "vitest";
import { CsvImporter } from "#importers/formats/csv.importer.js";
import { MAX_VALIDATION_ERRORS } from "#importers/shared/index.js";

describe("CsvImporter Edge Cases", () => {
    const importer = new CsvImporter();

    it("should handle empty file with importEmptyFile error", async () => {
        const resultWrap = await importer.import("");
        // BaseImporter returns Err(ImportError) for empty content
        expect(resultWrap.isErr()).toBe(true);
        if (resultWrap.isErr()) {
            expect(resultWrap.error.message).toContain("File content is empty");
        }
    });

    it("should handle header-only file", async () => {
        const content = "Title, Content"; // One row
        const resultWrap = await importer.import(content);

        // CsvImporter returns Err(ImportEmptyFile) if rows < 2
        // BaseImporter wraps doImport result.
        // If doImport returns Err, import() returns Err.
        expect(resultWrap.isErr()).toBe(true);
        if (resultWrap.isErr()) {
            expect(resultWrap.error.message).toContain("CSV file has no data rows");
        }
    });

    it("should handle invalid header", async () => {
        const content = "Foo, Bar, Baz\nVal1, Val2, Val3";
        const resultWrap = await importer.import(content);

        expect(resultWrap.isErr()).toBe(true);
        if (resultWrap.isErr()) {
            expect(resultWrap.error.message).toContain("must have at least 'content' or 'title'");
        }
    });

    it("should accumulate errors up to MAX_VALIDATION_ERRORS", async () => {
        const header = "Title, Content, Date";
        const invalidRow = "Title, Content, InvalidDate";
        const rows = Array(MAX_VALIDATION_ERRORS + 5).fill(invalidRow);
        const content = [header, ...rows].join("\n");

        const resultWrap = await importer.import(content);
        // All rows fail validation -> 0 valid clippings -> importValidationError (Err)
        expect(resultWrap.isErr()).toBe(true);

        if (resultWrap.isErr()) {
            const error = resultWrap.error;
            // Check if it has 'errors' property (validation error)
            if ("errors" in error) {
                const details = error.errors;
                expect(details.length).toBeGreaterThanOrEqual(MAX_VALIDATION_ERRORS);
                expect(details[details.length - 1].message).toContain("Stopped after");
            } else {
                throw new Error("Expected validation error with details");
            }
        }
    });

    it("should provide suggestions for typos in Type field", async () => {
        const content = "Title, Content, Type\nMy Book, My Content, hightlight";
        const resultWrap = await importer.import(content);

        // This fails validation for the row. If it's the only row -> 0 clippings -> Error.
        expect(resultWrap.isErr()).toBe(true);
        if (resultWrap.isErr()) {
            const error = resultWrap.error;
            if ("errors" in error) {
                const typeError = error.errors.find(e => e.field === "type");
                expect(typeError).toBeDefined();
                expect(typeError?.suggestion).toContain("highlight");
            } else {
                throw new Error("Expected validation error");
            }
        }
    });

    it("should provide suggestions for typos in Date field", async () => {
        const content = "Title, Content, Date\nMy Book, My Content, NotADateAtAll";
        const resultWrap = await importer.import(content);

        expect(resultWrap.isErr()).toBe(true);
        if (resultWrap.isErr()) {
            const error = resultWrap.error;
            if ("errors" in error) {
                const dateError = error.errors.find(e => e.field === "date");
                expect(dateError).toBeDefined();
                expect(dateError?.suggestion).toContain("ISO 8601");
            } else {
                throw new Error("Expected validation error");
            }
        }
    });

    it("should fuzzy match headers with warnings", async () => {
        const content = "Titl, Content\nMy Book, My Content";
        const resultWrap = await importer.import(content);

        expect(resultWrap.isOk()).toBe(true);
        if (resultWrap.isOk()) {
            const result = resultWrap.value;
            // result is ImportSuccess which has success properties
            expect(result.clippings).toHaveLength(1);
            expect(result.warnings.some(w => w.includes("Fuzzy matched header"))).toBe(true);
        }
    });
});
