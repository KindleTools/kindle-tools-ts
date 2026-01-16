# Contributing to kindle-tools-ts

First off, thanks for taking the time to contribute!

## Development

This project uses [pnpm](https://pnpm.io/) for dependency management.

### Setup

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install dependencies
pnpm install
```

### Commands

- `pnpm dev`: Start compilation in watch mode
- `pnpm build`: Build the project (ESM, CJS, and types)
- `pnpm test`: Run tests
- `pnpm lint`: Run Biome linter
- `pnpm format`: Format code with Biome

### Code Style & Imports

We use a **Hybrid Import Approach** to maintain cleanliness and ease of refactoring:

1.  **Local Imports (Siblings/Children)**: Use relative paths (`./`) for files in the same directory or subdirectories.
    - ✅ `import { Helper } from "./helper.js";`
    - ✅ `import { Child } from "./child/index.js";`
2.  **Distant Imports (Parents/Modules)**: Use subpath aliases (`#`) defined in `package.json`.
    - ✅ `import { Utils } from "#utils/index.js";`
    - ❌ `import { Utils } from "../../utils/index.js";`

A script `scripts/standardize-imports.ts` is available to help migrate legacy code.

## Pull Requests

1. Fork the repo and create your branch from `main`.
2. Make sure your code passes `pnpm lint` and `pnpm test`.
3. If you've added code that should be tested, add tests.
4. **Changesets**: If you are making a valid change to the codebase (feature, fix, etc.), please run `pnpm changeset` to generate a changeset file. This helps us automate releases.

## Adding a New Export Format
 
1. **Create the file**: Add your new exporter in `src/exporters/formats/`.
   - Name it `<format>.exporter.ts`.
   - Implement the `Exporter` interface (usually by extending `BaseExporter`).

2. **Register it**: Add the class to `src/exporters/index.ts`.
   - Use `export { YourExporter } from "./formats/your.exporter.js";`.

3. **Update Factory**: The `ExporterFactory` automatically supports new registered exporters if you use `ExporterFactory.register()`, but best practice for core formats is to add them to the default initialization block in `src/exporters/core/factory.ts`.

4. **Update Imports**: Check `package.json` to ensure your new file is covered by the `exports` and `imports` mappings if specific access is needed (usually covered by wildcards).

5. **Test**: Add a unit test in `tests/unit/exporters.test.ts` or create a new test file.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
