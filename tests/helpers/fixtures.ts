import fs from "fs";
import path from "path";

/**
 * Loads a fixture file from the tests/fixtures/clippings directory.
 * @param filename - Relative path from tests/fixtures/clippings/
 */
export function loadFixture(filename: string): string {
  const filePath = path.resolve(__dirname, "../fixtures/clippings", filename);
  return fs.readFileSync(filePath, "utf-8");
}
