import { closest } from "fastest-levenshtein";
import { type SafeParseReturnType, z } from "zod";
import { type ParseOptions, ParseOptionsSchema } from "../schemas/config.schema.js";

/**
 * Validate configuration object with fuzzy suggestions for unknown keys.
 *
 * This wrapper around ParseOptionsSchema.safeParse intercepts "unrecognized_keys" errors
 * and adds "Did you mean...?" suggestions using Levenshtein distance.
 */
export function validateConfig(config: unknown): SafeParseReturnType<unknown, ParseOptions> {
  // We use strict() so that extra keys trigger "unrecognized_keys" error
  // This allows us to offer fuzzy suggestions
  const result = ParseOptionsSchema.strict().safeParse(config);

  if (result.success) {
    return result;
  }

  // Enhance error messages with fuzzy suggestions
  const enhancedIssues = result.error.issues.map((issue) => {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      const validKeys = Object.keys(ParseOptionsSchema.shape);
      const suggestions: string[] = [];

      for (const invalidKey of issue.keys) {
        const match = closest(invalidKey, validKeys);
        // Only suggest if reasonable distance (e.g. < 4 for longer words, < 2 for short)
        suggestions.push(`Did you mean '${match}'?`);
      }

      if (suggestions.length > 0) {
        return {
          ...issue,
          message: `${issue.message}. ${suggestions.join(" ")}`,
        };
      }
    }
    return issue;
  });

  return {
    success: false,
    error: new z.ZodError(enhancedIssues),
  };
}
