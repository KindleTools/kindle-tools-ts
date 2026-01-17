import { describe, it, expect } from "vitest";
import { MultiFileExporter } from "#exporters/shared/multi-file-exporter.js";
import { type Clipping } from "#app-types/clipping.js";
import { type ExportedFile } from "#errors";
import { type TemplateEngine, type TemplatePreset } from "#templates/index.js";
import { type MultiFileExporterOptions } from "#exporters/shared/multi-file-exporter.js"; // Ensure type export exists

// Concrete implementation for testing
class TestMultiFileExporter extends MultiFileExporter {
    readonly name = "test-multi";
    readonly extension = ".txt";

    protected async processBook(
        clippings: Clipping[],
        options: MultiFileExporterOptions,
        engine: TemplateEngine,
    ): Promise<ExportedFile[]> {
        return clippings.map(c => ({
            path: `${c.title}.txt`,
            content: `Content of ${c.title}`
        }));
    }
}

describe("MultiFileExporter", () => {
    const exporter = new TestMultiFileExporter();

    it("should handle custom templates option", async () => {
        // We verify that createTemplateEngine uses custom factory if provided
        // Since createTemplateEngine is protected, we implicitly test it via doExport not failing
        // or mock TemplateEngineFactory? 
        // Logic: if (options.customTemplates) return TemplateEngineFactory.getEngine(...)

        const result = await exporter.export([], {
            outputDir: "out",
            customTemplates: {
                clipping: "Custom Content"
            }
        });

        expect(result.isOk()).toBe(true);
    });

    it("should return summary message when no files generated", async () => {
        // If we provide empty list, processBook is skipped.
        // Preamble returns [].
        // Summary content should be "No files generated."

        const result = await exporter.export([], { outputDir: "out" });
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.output).toBe("No files generated.");
        }
    });

    // We can add more specific branch tests here
});
