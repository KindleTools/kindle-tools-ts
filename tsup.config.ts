import { defineConfig } from "tsup";

export default defineConfig({
  // Entry points
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },

  // Output formats: ESM and CommonJS
  format: ["esm", "cjs"],

  // Generate TypeScript declaration files
  dts: true,

  // Enable tree-shaking for smaller bundles
  treeshake: true,

  // Generate source maps for debugging
  sourcemap: true,

  // Clean dist folder before build
  clean: true,

  // Split chunks for better caching
  splitting: true,

  // Don't minify for better debugging (enable for production)
  minify: false,

  // Target Node.js 18+
  target: "node18",

  // Shims for ESM/CJS interop
  shims: true,

  // No need to manually specify external dependencies;
  // tsup automatically externalizes dependencies and peerDependencies from package.json
});
