import { afterEach, describe, expect, it } from "vitest";
import { expandEnvVars, expandString } from "#utils/system/env-expander.js";

describe("EnvExpander", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("expandString", () => {
    it("should expand existing environment variables", () => {
      process.env.TEST_VAR = "expanded";
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
      expect(expandString("Value is ${TEST_VAR}")).toBe("Value is expanded");
    });

    it("should use default value if variable is missing", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
      expect(expandString("Value is ${MISSING_VAR:-default}")).toBe("Value is default");
    });

    it("should match default value loosely (non-greedy)", () => {
      // Test ensuring the regex for default value doesn't eat too much
      process.env.A = "AAA";
      // If the regex was greedy properly, it might get confused, but we want to ensure basic functionality
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
      expect(expandString("${MISSING:-def} and ${A}")).toBe("def and AAA");
    });

    it("should return empty string if variable is missing and no default", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
      expect(expandString("Value is ${MISSING_VAR}")).toBe("Value is ");
    });

    it("should handle multiple variables", () => {
      process.env.VAR1 = "one";
      process.env.VAR2 = "two";
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
      expect(expandString("${VAR1} and ${VAR2}")).toBe("one and two");
    });

    it("should leave text without variables unchanged", () => {
      expect(expandString("No variables here")).toBe("No variables here");
    });
  });

  describe("expandEnvVars", () => {
    it("should expand string input", () => {
      process.env.TEST_VAR = "test";
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
      expect(expandEnvVars("${TEST_VAR}")).toBe("test");
    });

    it("should expand array input", () => {
      process.env.TEST_VAR = "test";
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
      const input = ["${TEST_VAR}", "literal"];
      expect(expandEnvVars(input)).toEqual(["test", "literal"]);
    });

    it("should expand object input recursively", () => {
      process.env.TEST_VAR = "test";
      const input = {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
        prop: "${TEST_VAR}",
        nested: {
          // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
          prop: "${TEST_VAR}",
        },
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing interpolation logic
        array: ["${TEST_VAR}"],
      };
      const expected = {
        prop: "test",
        nested: {
          prop: "test",
        },
        array: ["test"],
      };
      expect(expandEnvVars(input)).toEqual(expected);
    });

    it("should return null/undefined as is", () => {
      expect(expandEnvVars(null)).toBe(null);
      expect(expandEnvVars(undefined)).toBe(undefined);
    });

    it("should handle nested primitives", () => {
      const input = { a: 1, b: true };
      expect(expandEnvVars(input)).toEqual(input);
    });
  });
});
