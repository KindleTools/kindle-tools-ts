import fs from "node:fs";
import path from "node:path";

/**
 * Loads a fixture file from the tests/fixtures/clippings directory.
 * @param filename - Relative path from tests/fixtures/clippings/
 */
export function loadFixture(filename: string): string {
  const filePath = path.resolve(__dirname, "../fixtures/clippings", filename);
  return fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
}
