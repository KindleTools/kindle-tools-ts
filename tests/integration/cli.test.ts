import { exec } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(__dirname, "../../src/cli/index.ts");
const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

// Helper to run CLI command using tsx
async function runCli(args: string) {
  // We use tsx to run the TS source directly, simulating the dev environment
  // and verifying the logic without needing a pre-build step for tests.
  // In CI, we might want to test the built artifact (dist/cli.js) too,
  // but testing source is great for rapid dev feedback.
  // Increase timeout for slow environments/windows
  return execAsync(`npx tsx "${CLI_PATH}" ${args}`, { timeout: 30000 });
}

describe("CLI Integration", () => {
  it("should show version with --version", async () => {
    const { stdout } = await runCli("--version");
    expect(stdout).toMatch(/kindle-tools v\d+\.\d+\.\d+/);
  }, 30000);

  it("should show help with --help", async () => {
    const { stdout } = await runCli("--help");
    expect(stdout).toMatch(/Usage:/i);
    expect(stdout).toContain("kindle-tools <command>");
  }, 30000);

  it("should parse a valid clippings file", async () => {
    const dummyPath = path.resolve(FIXTURES_DIR, "dummy_clippings.txt");
    // We ensure the file exists (created by previous tool)
    const { stdout } = await runCli(`parse "${dummyPath}"`);
    expect(stdout).toContain("Kindle Clippings Parsed Successfully");
  }, 30000);

  it("should show help when no command is provided", async () => {
    // When no command is provided, it prints help to stdout but might exit.
    // runCli invokes `npx tsx ...` which exits 0 if main returns normally.
    const { stdout } = await runCli("");
    expect(stdout).toMatch(/Usage:/i);
  }, 30000);
});
