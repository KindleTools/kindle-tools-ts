import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { parse } from "../../src/importers/formats/txt/parser.js";
import { loadFixture } from "../helpers/fixtures.js";

describe("Parser Snapshot Tests", () => {
  it("should match standard file output snapshot", async () => {
    const content = loadFixture("standard.txt");

    const result = await parse(content);

    // We normalize the parseTime in the meta stats because it's dynamic
    const normalizedResult = {
      ...result,
      meta: {
        ...result.meta,
        parseTime: 0, // Stub out dynamic time
      },
    };

    // toMatchFileSnapshot compares the serialized result against a file content.
    // If the file doesn't exist, it creates it.
    // Ideally, we start with a JSON snapshot.
    const snapshotPath = path.resolve(
      __dirname,
      "../fixtures/expected-output/standard.output.json",
    );

    await expect(`${JSON.stringify(normalizedResult, null, 2)}\n`).toMatchFileSnapshot(
      snapshotPath,
    );
  });
});
