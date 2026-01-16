/**
 * Script to validate that schema.json is in sync with Zod definitions.
 * Running in CI to ensure no one forgets to run 'pnpm generate:schema'.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ConfigFileSchema } from "../src/schemas/config.schema.js";

async function validateSchema() {
    console.log("Validating JSON Schema...");

    // 1. Generate fresh schema in memory
    const generated = zodToJsonSchema(ConfigFileSchema, {
        name: "kindleToolConfig",
        definitions: {
            kindleToolConfig: ConfigFileSchema,
        },
    });

    // 2. Read existing schema from disk
    const schemaPath = path.resolve(process.cwd(), "schema.json");
    let existing: unknown;
    try {
        const fileContent = await fs.readFile(schemaPath, "utf-8");
        existing = JSON.parse(fileContent);
    } catch (error) {
        console.error("❌ Failed to read existing schema.json:", error);
        process.exit(1);
    }

    // 3. Compare
    // Normalize stringify to ensure consistent formatting (spacing 2)
    const generatedStr = JSON.stringify(generated, null, 2);
    const existingStr = JSON.stringify(existing, null, 2);

    if (generatedStr !== existingStr) {
        console.error("❌ schema.json is out of sync with Zod definitions!");
        console.error("Please run 'pnpm generate:schema' to update it.");
        process.exit(1);
    }

    console.log("✅ schema.json is in sync.");
}

validateSchema().catch((err) => {
    console.error("❌ Unexpected error during validation:", err);
    process.exit(1);
});
