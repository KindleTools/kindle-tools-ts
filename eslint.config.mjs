import neverthrow from "eslint-plugin-neverthrow";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            neverthrow,
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            // "neverthrow/must-use-result": "error",
            "no-restricted-properties": [
                "error",
                {
                    property: "_unsafeUnwrap",
                    message: "Use match() or unwrapOr() instead of _unsafeUnwrap()",
                },
                {
                    property: "_unsafeUnwrapErr",
                    message: "Use match() or unwrapOr() instead of _unsafeUnwrapErr()",
                },
            ],
        },
    },
];
