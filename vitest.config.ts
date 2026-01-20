/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Enable global test functions (describe, it, expect)
    globals: true,

    // Test environment
    environment: "node",

    // Global Setup (runs before workers)
    globalSetup: ["./tests/global-setup.ts"],

    // Force UTC timezone for consistency
    env: {
      TZ: "UTC",
    },

    // Include patterns for test files
    include: ["tests/**/*.{test,spec,test-d}.{ts,js}", "src/**/*.{test,spec,test-d}.{ts,js}"],

    // Exclude patterns
    exclude: ["**/node_modules/**", "**/dist/**", "**/dist-gui/**", "**/e2e/**"],

    // Coverage configuration
    coverage: {
      // Use v8 for fast, native coverage
      provider: "v8",

      // Coverage reporters
      reporter: ["text", "text-summary", "html", "lcov", "json", "json-summary"],

      // Files to include in coverage
      include: ["src/**/*.ts"],

      // Files to exclude from coverage
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/cli/**",
        "src/types/**",
        "src/gui/**",
        "src/index.ts",
        "src/**/index.ts",
      ],

      // Coverage thresholds (ROADMAP 1.4 & 2.16)
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        // Enforce per-file thresholds for generic files
        perFile: true,
        // Specific Strict Thresholds
        "src/core/**/*.ts": {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        "src/domain/**/*.ts": {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        "src/errors/**/*.ts": {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        "src/utils/**/*.ts": {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
      },

      // Clean coverage before running
      clean: true,

      // Report on failure
      reportOnFailure: true,

      // Include all files (even untested) in coverage report
      all: true,
    },

    // Reporters
    reporters: ["default"],

    // Timeout for each test
    testTimeout: 10000,

    // Pool configuration for parallel tests (Vitest 4+)
    pool: "threads",

    // Retry failed tests
    retry: 0,

    // Bail on first failure (useful in CI)
    bail: 0,

    // Watch mode disabled by default
    watch: false,

    // Benchmark configuration
    benchmark: {
      include: ["**/*.bench.{ts,js}"],
      exclude: ["node_modules", "dist"],
    },
  },
});
