/**
 * Script to generate JSON Schema from Zod definitions.
 * This enables IDE autocompletion for .kindletoolsrc.json files.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ConfigFileSchema } from "../src/schemas/config.schema.js";

async function generateSchema() {
    console.log("Generating JSON Schema for configuration...");

    const schema = zodToJsonSchema(ConfigFileSchema, {
        name: "kindleToolConfig",
        definitions: {
            kindleToolConfig: ConfigFileSchema,
        },
    });

    const outputPath = path.resolve(process.cwd(), "schema.json");

    await fs.writeFile(outputPath, JSON.stringify(schema, null, 2));

    console.log(`✅ Schema generated at: ${outputPath}`);
    console.log("Add this to your .kindletoolsrc.json to enable autocomplete:");
    console.log(`"$schema": "./node_modules/kindle-tools-ts/schema.json"`);
}

generateSchema().catch((err) => {
    console.error("❌ Failed to generate schema:", err);
    process.exit(1);
});
