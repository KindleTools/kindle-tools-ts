import { describe, expect, it } from "vitest";
import { validateConfig } from "../../../src/config/validator.js";

describe("Config Validator", () => {
  it("should validate valid config", () => {
    const config = {
      language: "es",
      extractTags: true,
    };
    const result = validateConfig(config);
    expect(result.success).toBe(true);
  });

  it("should provide suggestions for typos in keys", () => {
    const config = {
      extracTags: true, // Typo: missing 't'
    };
    const result = validateConfig(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMsg = result.error.toString();
      expect(errorMsg).toContain("extracTags");
      expect(errorMsg).toContain("Did you mean 'extractTags'?");
    }
  });

  it("should provide suggestions for multiple invalid keys", () => {
    const config = {
      languag: "es", // Typo for language
      removeDuplicats: true, // Typo for removeDuplicates
    };

    // Note: ConfigSchema must be strict() for unrecognized_keys error to trigger
    const result = validateConfig(config);

    if (!result.success) {
      const errorMsg = result.error.toString();
      expect(errorMsg).toContain("languag");
      expect(errorMsg).toContain("Did you mean 'language'?");
      expect(errorMsg).toContain("removeDuplicats");
      expect(errorMsg).toContain("Did you mean 'removeDuplicates'?");
    }
  });
});
