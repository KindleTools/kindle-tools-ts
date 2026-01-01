#!/usr/bin/env node

/**
 * kindle-tools CLI
 *
 * Command-line interface for parsing and exporting Kindle clippings.
 *
 * Usage:
 *   kindle-tools parse <file>              Parse and show stats
 *   kindle-tools export <file> --format    Export to format
 *   kindle-tools stats <file>              Show detailed stats
 *   kindle-tools validate <file>           Validate file format
 *
 * @packageDocumentation
 */

// CLI uses console for output - this is intentional
const log = console.log.bind(console);
const error = console.error.bind(console);

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    printVersion();
    return;
  }

  const command = args[0];

  switch (command) {
    case "parse":
      await handleParse(args.slice(1));
      break;
    case "export":
      await handleExport(args.slice(1));
      break;
    case "stats":
      await handleStats(args.slice(1));
      break;
    case "validate":
      await handleValidate(args.slice(1));
      break;
    default:
      error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

/**
 * Print help message
 */
function printHelp(): void {
  log(`
kindle-tools - Parse and export Kindle clippings

USAGE:
  kindle-tools <command> [options]

COMMANDS:
  parse <file>      Parse a My Clippings.txt file and show summary
  export <file>     Export clippings to a specific format
  stats <file>      Show detailed statistics
  validate <file>   Validate file format

OPTIONS:
  -h, --help        Show this help message
  -v, --version     Show version number
  --format <fmt>    Export format: json, csv, md, obsidian, joplin, html
  --output <path>   Output file or directory
  --lang <code>     Force language: en, es, pt, de, fr, it, zh, ja, ko, nl, ru
  --no-merge        Disable smart merging
  --no-dedup        Disable deduplication
  --json            Output as JSON (for scripting)
  --verbose         Show detailed output

EXAMPLES:
  kindle-tools parse "My Clippings.txt"
  kindle-tools export "My Clippings.txt" --format=md --output=./notes
  kindle-tools stats "My Clippings.txt" --json
  kindle-tools validate "My Clippings.txt"

DOCUMENTATION:
  https://github.com/YOUR_USERNAME/kindle-tools-ts
`);
}

/**
 * Print version
 */
function printVersion(): void {
  // TODO: Read from package.json
  log("kindle-tools v0.0.0");
}

/**
 * Handle parse command
 */
async function handleParse(_args: string[]): Promise<void> {
  // TODO: Implement in Phase 4
  log("Parse command - Coming soon!");
  log("This will parse the file and show a summary of clippings.");
}

/**
 * Handle export command
 */
async function handleExport(_args: string[]): Promise<void> {
  // TODO: Implement in Phase 5
  log("Export command - Coming soon!");
  log("This will export clippings to the specified format.");
}

/**
 * Handle stats command
 */
async function handleStats(_args: string[]): Promise<void> {
  // TODO: Implement in Phase 4
  log("Stats command - Coming soon!");
  log("This will show detailed statistics about your clippings.");
}

/**
 * Handle validate command
 */
async function handleValidate(_args: string[]): Promise<void> {
  // TODO: Implement in Phase 4
  log("Validate command - Coming soon!");
  log("This will validate the format of your My Clippings.txt file.");
}

// Run CLI
main().catch((err: unknown) => {
  error("Fatal error:", err);
  process.exit(1);
});
