/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Enable global test functions (describe, it, expect)
    globals: true,

    // Test environment
    environment: "node",

    alias: {
      "@core": "./src/core",
      "@importers": "./src/importers",
      "@exporters": "./src/exporters",
      "@utils": "./src/utils",
      "@app-types": "./src/types",
      "@templates": "./src/templates",
    },

    // Include patterns for test files
    include: ["tests/**/*.{test,spec}.{ts,js}", "src/**/*.{test,spec}.{ts,js}"],

    // Exclude patterns
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],

    // Coverage configuration
    coverage: {
      // Use v8 for fast, native coverage
      provider: "v8",

      // Coverage reporters
      reporter: ["text", "text-summary", "html", "lcov", "json"],

      // Files to include in coverage
      include: ["src/**/*.ts"],

      // Files to exclude from coverage
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/cli.ts",
        "src/types/**",
      ],

      // Coverage thresholds
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },

      // Clean coverage before running
      clean: true,

      // Report on failure
      reportOnFailure: true,
    },

    // Reporter
    reporters: ["verbose"],

    // Timeout for each test
    testTimeout: 10000,

    // Pool configuration for parallel tests
    pool: "threads",

    // Retry failed tests
    retry: 0,

    // Bail on first failure (useful in CI)
    bail: 0,
  },
});
