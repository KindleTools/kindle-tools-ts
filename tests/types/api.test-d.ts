import { describe, expectTypeOf, test } from "vitest";
import { parse } from "../../src/importers/formats/txt/parser.js";
import type { Clipping, ParseResult } from "../../src/types/index.js";

describe("Type Testing: Public API Surface", () => {
  test("parser.parse returns strict ParseResult structure", () => {
    const result = parse("some input");

    // 1. Should match the exact ParseResult interface
    expectTypeOf(result).toEqualTypeOf<ParseResult>();

    // 3. Should NOT be any or unknown
    expectTypeOf(result).not.toBeAny();
    expectTypeOf(result).not.toBeUnknown();

    // 4. Verify nested structures
    expectTypeOf(result.clippings).toBeArray();
    expectTypeOf(result.clippings[0]).toMatchTypeOf<Clipping>();

    // 5. Verify stats consistency
    expectTypeOf(result.stats.total).toBeNumber();
  });

  // Future: Add more type tests for Exporters/Processors here
});
