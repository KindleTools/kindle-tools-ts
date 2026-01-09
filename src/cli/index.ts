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

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Clipping } from "#app-types/clipping.js";
import type { ParseResult, ProcessOptions } from "#app-types/config.js";
import type { SupportedLanguage } from "#app-types/language.js";
import type { ClippingsStats } from "#app-types/stats.js";
import { type LoadedConfig, loadConfigSync } from "#config/index.js";
import { process as processClippings } from "#core/processor.js";
import { calculateStats } from "#domain/stats.js";
import { formatUserMessage } from "#errors";
import type {
  AuthorCase,
  Exporter,
  ExporterOptions,
  ExportSuccess,
  FolderStructure,
  TagCase,
} from "#exporters/index.js";
import { ExporterFactory } from "#exporters/index.js";
import { parseString } from "#importers/formats/txt/parser.js";
import { tokenize } from "#importers/formats/txt/tokenizer.js";
import { ImporterFactory } from "#importers/index.js";
import { validateFormat, validateLanguage } from "#schemas/cli.schema.js";
import { createTarArchive } from "#utils/fs/tar.js";
import { createZipArchive } from "#utils/fs/zip.js";
import { decodeWithFallback, detectEncoding } from "#utils/text/encoding.js";

// CLI uses console for output - this is intentional
const log = console.log.bind(console);
const error = console.error.bind(console);

// =============================================================================
// Types
// =============================================================================

interface ParsedArgs {
  file?: string;
  format?: string;
  output?: string;
  lang?: SupportedLanguage;
  noMerge?: boolean;
  noDedup?: boolean;
  json?: boolean;
  verbose?: boolean;
  pretty?: boolean;
  groupByBook?: boolean;
  folderStructure?: FolderStructure;
  authorCase?: AuthorCase;
  tagCase?: TagCase;
  includeTags?: boolean;
  extractTags?: boolean;
  highlightsOnly?: boolean;
  title?: string;
  creator?: string;
  config?: string; // Path to config file
}

// =============================================================================
// CLI Version (read from package.json at build time)
// =============================================================================

const CLI_VERSION = "1.0.0";

// =============================================================================
// ANSI Colors for terminal output
// =============================================================================

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const c = {
  error: (s: string) => `${colors.red}${s}${colors.reset}`,
  success: (s: string) => `${colors.green}${s}${colors.reset}`,
  warn: (s: string) => `${colors.yellow}${s}${colors.reset}`,
  info: (s: string) => `${colors.cyan}${s}${colors.reset}`,
  dim: (s: string) => `${colors.dim}${s}${colors.reset}`,
  bold: (s: string) => `${colors.bold}${s}${colors.reset}`,
  highlight: (s: string) => `${colors.magenta}${s}${colors.reset}`,
};

// =============================================================================
// Main Entry Point
// =============================================================================

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
      error(c.error(`Unknown command: ${command}`));
      printHelp();
      process.exit(1);
  }
}

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse command line arguments into structured options.
 */
function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg) continue;

    // File argument (first non-flag argument)
    if (!arg.startsWith("-") && !result.file) {
      result.file = arg;
      continue;
    }

    // Parse flags
    if (arg === "--format" || arg === "-f") {
      result.format = args[++i] ?? "";
    } else if (arg.startsWith("--format=")) {
      result.format = arg.split("=")[1] ?? "";
    } else if (arg === "--output" || arg === "-o") {
      result.output = args[++i] ?? "";
    } else if (arg.startsWith("--output=")) {
      result.output = arg.split("=")[1] ?? "";
    } else if (arg === "--lang" || arg === "-l") {
      result.lang = (args[++i] ?? "en") as SupportedLanguage;
    } else if (arg.startsWith("--lang=")) {
      result.lang = (arg.split("=")[1] ?? "en") as SupportedLanguage;
    } else if (arg === "--no-merge") {
      result.noMerge = true;
    } else if (arg === "--no-dedup") {
      result.noDedup = true;
    } else if (arg === "--json") {
      result.json = true;
    } else if (arg === "--verbose") {
      result.verbose = true;
    } else if (arg === "--pretty") {
      result.pretty = true;
    } else if (arg === "--group-by-book" || arg === "--group") {
      result.groupByBook = true;
    } else if (arg === "--folder-structure" || arg === "--structure") {
      result.folderStructure = (args[++i] ?? "flat") as FolderStructure;
    } else if (arg.startsWith("--folder-structure=") || arg.startsWith("--structure=")) {
      result.folderStructure = (arg.split("=")[1] ?? "flat") as FolderStructure;
    } else if (arg === "--author-case" || arg === "--case") {
      result.authorCase = (args[++i] ?? "original") as AuthorCase;
    } else if (arg.startsWith("--author-case=") || arg.startsWith("--case=")) {
      result.authorCase = (arg.split("=")[1] ?? "original") as AuthorCase;
    } else if (arg === "--include-tags" || arg === "--tags") {
      result.includeTags = true;
    } else if (arg === "--no-tags") {
      result.includeTags = false;
    } else if (arg === "--extract-tags") {
      result.extractTags = true;
    } else if (arg === "--tag-case") {
      result.tagCase = (args[++i] ?? "uppercase") as TagCase;
    } else if (arg.startsWith("--tag-case=")) {
      result.tagCase = (arg.split("=")[1] ?? "uppercase") as TagCase;
    } else if (arg === "--highlights-only" || arg === "--merged") {
      result.highlightsOnly = true;
    } else if (arg === "--title") {
      result.title = args[++i] ?? "";
    } else if (arg.startsWith("--title=")) {
      result.title = arg.split("=")[1] ?? "";
    } else if (arg === "--creator" || arg === "--author") {
      result.creator = args[++i] ?? "";
    } else if (arg.startsWith("--creator=") || arg.startsWith("--author=")) {
      result.creator = arg.split("=")[1] ?? "";
    } else if (arg === "--config" || arg === "-c") {
      result.config = args[++i] ?? "";
    } else if (arg.startsWith("--config=")) {
      result.config = arg.split("=")[1] ?? "";
    }
  }

  return result;
}

/**
 * Load configuration file and merge with CLI arguments.
 * CLI arguments take precedence over config file values.
 *
 * @param args - Parsed CLI arguments
 * @param verbose - Whether to log config loading info
 * @returns Merged arguments with config defaults applied
 */
function loadAndMergeConfig(args: ParsedArgs, verbose = false): ParsedArgs {
  try {
    let loadedConfig: LoadedConfig | null = null;

    if (args.config) {
      // Load specific config file
      loadedConfig = loadConfigSync({ configPath: args.config });
      if (!loadedConfig) {
        error(c.warn(`Warning: Config file not found: ${args.config}`));
      }
    } else {
      // Auto-discover config file
      loadedConfig = loadConfigSync();
    }

    if (loadedConfig) {
      if (verbose) {
        log(c.dim(`Using config from: ${loadedConfig.filepath}`));
      }

      const config = loadedConfig.config;

      // Merge config with args (CLI args take precedence over config)
      // Only use config value if the CLI arg wasn't provided
      const merged: ParsedArgs = {
        // Start with all CLI args
        ...args,
      };

      // Apply config defaults only for undefined CLI args
      if (args.lang === undefined && config.language) {
        merged.lang = config.language as SupportedLanguage;
      }
      if (args.format === undefined && config.format) {
        merged.format = config.format;
      }
      if (args.output === undefined && config.output) {
        merged.output = config.output;
      }
      if (args.folderStructure === undefined && config.folderStructure) {
        merged.folderStructure = config.folderStructure as FolderStructure;
      }
      if (args.authorCase === undefined && config.authorCase) {
        merged.authorCase = config.authorCase as AuthorCase;
      }
      if (args.tagCase === undefined && config.tagCase) {
        merged.tagCase = config.tagCase;
      }
      if (args.groupByBook === undefined && config.groupByBook !== undefined) {
        merged.groupByBook = config.groupByBook;
      }
      if (args.includeTags === undefined && config.includeTags !== undefined) {
        merged.includeTags = config.includeTags;
      }
      if (args.extractTags === undefined && config.extractTags !== undefined) {
        merged.extractTags = config.extractTags;
      }
      if (args.pretty === undefined && config.pretty !== undefined) {
        merged.pretty = config.pretty;
      }
      if (args.title === undefined && config.title) {
        merged.title = config.title;
      }
      if (args.creator === undefined && config.creator) {
        merged.creator = config.creator;
      }

      // Handle nested parse options
      if (config.parse) {
        if (args.noMerge === undefined && config.parse.mergeOverlapping === false) {
          merged.noMerge = true;
        }
        if (args.noDedup === undefined && config.parse.removeDuplicates === false) {
          merged.noDedup = true;
        }
        if (args.highlightsOnly === undefined && config.parse.highlightsOnly !== undefined) {
          merged.highlightsOnly = config.parse.highlightsOnly;
        }
      }

      return merged;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(c.warn(`Warning: Failed to load config: ${message}`));
  }

  return args;
}

/**
 * Parse a clippings file using the ImporterFactory and unified processing pipeline.
 *
 * This enables consistent handling (encoding detection, deduping, processing)
 * regardless of the input format (TXT, JSON, CSV).
 */
async function parseClippingsFile(filePath: string, args: ParsedArgs): Promise<ParseResult> {
  const startTime = Date.now();

  // 1. Read and decode content (robust encoding detection)
  const buffer = await fs.readFile(filePath);
  const fileStats = await fs.stat(filePath);
  const detectedEncoding = detectEncoding(buffer);
  const content = decodeWithFallback(buffer, detectedEncoding);

  // 2. Import using Factory
  const importer = ImporterFactory.getImporter(filePath);
  const result = await importer.import(content);

  if (result.isErr()) {
    const err = result.error;
    throw new Error(formatUserMessage(err));
  }

  const importResult = result.value;

  if (importResult.clippings.length === 0) {
    throw new Error(`Failed to import file using ${importer.name} importer: No clippings found`);
  }

  // 3. Process clippings (Dedupe, Merge, Link Notes, etc.)
  // Validate language if specified
  const language = args.lang && validateLanguage(args.lang) ? args.lang : "auto";

  // We process ALL formats to ensure consistency (e.g. valid JSON export from raw data)
  const processOptions: ProcessOptions = {
    language,
    removeDuplicates: !args.noDedup,
    mergeOverlapping: !args.noMerge,
    mergeNotes: true,
    normalizeUnicode: true,
    cleanContent: true,
    cleanTitles: true,
    extractTags: args.extractTags ?? false,
    ...(args.tagCase && { tagCase: args.tagCase }),
    highlightsOnly: args.highlightsOnly ?? false,
    detectedLanguage:
      (importResult.meta?.detectedLanguage as SupportedLanguage) ||
      (args.lang as SupportedLanguage) ||
      "en",
  };

  const processResult = processClippings(importResult.clippings, processOptions);

  // 4. Calculate final stats
  const finalClippings = processResult.clippings;
  const stats = calculateStats(finalClippings);

  // Merge processing stats
  stats.duplicatesRemoved = processResult.duplicatesRemoved;
  stats.mergedHighlights = processResult.mergedHighlights;
  stats.linkedNotes = processResult.linkedNotes;
  stats.emptyRemoved = processResult.emptyRemoved;

  const elapsed = Date.now() - startTime;

  return {
    clippings: finalClippings,
    stats,
    warnings: importResult.warnings.map((msg, idx) => ({
      type: "unknown_format" as const,
      message: msg,
      blockIndex: idx,
    })),
    meta: {
      fileSize: fileStats.size,
      parseTime: elapsed,
      detectedLanguage: (importResult.meta?.detectedLanguage as SupportedLanguage) || "en",
      // biome-ignore lint/complexity/useLiteralKeys: TS requires indexed access
      totalBlocks: (importResult.meta?.["totalBlocks"] as number) || importResult.clippings.length,
      parsedBlocks:
        // biome-ignore lint/complexity/useLiteralKeys: TS requires indexed access
        (importResult.meta?.["parsedBlocks"] as number) || importResult.clippings.length,
    },
  };
}

// =============================================================================
// Command Handlers
// =============================================================================

/**
 * Handle parse command - parse file and show summary.
 */
async function handleParse(args: string[]): Promise<void> {
  let parsed = parseArgs(args);

  // Load config file and merge with CLI args
  parsed = loadAndMergeConfig(parsed, parsed.verbose);

  if (!parsed.file) {
    error(c.error("Error: No file specified"));
    log(c.dim("Usage: kindle-tools parse <file> [options]"));
    process.exit(1);
  }

  // Check if file exists
  try {
    await fs.access(parsed.file);
  } catch {
    error(c.error(`Error: File not found: ${parsed.file}`));
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    const result = await parseClippingsFile(parsed.file, parsed);
    const elapsed = Date.now() - startTime;

    if (parsed.json) {
      // JSON output for scripting
      log(
        JSON.stringify(
          {
            success: true,
            clippings: result.clippings.length,
            stats: result.stats,
            meta: result.meta,
            parseTimeMs: elapsed,
          },
          null,
          parsed.pretty ? 2 : undefined,
        ),
      );
    } else {
      // Pretty print summary
      printParseSummary(result, elapsed, parsed.verbose);
    }
  } catch (err) {
    if (parsed.json) {
      log(JSON.stringify({ success: false, error: String(err) }));
    } else {
      error(c.error(`Parse failed: ${err}`));
    }
    process.exit(1);
  }
}

/**
 * Handle export command - export clippings to a specific format.
 */
async function handleExport(args: string[]): Promise<void> {
  let parsed = parseArgs(args);

  // Load config file and merge with CLI args
  parsed = loadAndMergeConfig(parsed, parsed.verbose);

  if (!parsed.file) {
    error(c.error("Error: No file specified"));
    log(c.dim("Usage: kindle-tools export <file> --format=<fmt> [options]"));
    process.exit(1);
  }

  if (!parsed.format) {
    error(c.error("Error: No format specified"));
    log(c.dim("Available formats: json, csv, md, obsidian, joplin, html"));
    process.exit(1);
  }

  // Validate format with Zod schema
  if (!validateFormat(parsed.format)) {
    error(c.error(`Error: Invalid format '${parsed.format}'`));
    log(c.dim("Available formats: json, csv, md, markdown, obsidian, joplin, html"));
    process.exit(1);
  }

  // Check if file exists
  try {
    await fs.access(parsed.file);
  } catch {
    error(c.error(`Error: File not found: ${parsed.file}`));
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    // Parse the file
    const result = await parseClippingsFile(parsed.file, parsed);

    // Get exporter
    const exporter = ExporterFactory.getExporter(parsed.format as string);
    if (!exporter) {
      error(c.error(`Unknown format: ${parsed.format}`));
      log(c.dim("Available formats: json, csv, md, obsidian, joplin, html"));
      process.exit(1);
    }

    // Export options
    const exportOptions: ExporterOptions = {
      ...(parsed.output && { outputPath: parsed.output }),
      ...(parsed.groupByBook && { groupByBook: parsed.groupByBook }),
      ...(parsed.folderStructure && { folderStructure: parsed.folderStructure }),
      ...(parsed.authorCase && { authorCase: parsed.authorCase }),
      pretty: parsed.pretty ?? true,
      includeStats: true,
      includeClippingTags: parsed.includeTags ?? true,
      // Pass CLI args to exporter options
      ...(parsed.title && { title: parsed.title }), // For HTML
      ...(parsed.title && { notebookName: parsed.title }), // For Joplin (mapped from title)
      ...(parsed.creator && { creator: parsed.creator }), // For Joplin (author attribution)
    };

    // Run export
    const exportResult = await exporter.export(result.clippings, exportOptions);
    const elapsed = Date.now() - startTime;

    if (exportResult.isErr()) {
      const err = exportResult.error;
      throw new Error(formatUserMessage(err));
    }

    const exportData = exportResult.value;

    // Write output
    if (parsed.output) {
      await writeExportResult(exporter, exportData, parsed.output);
      log(c.success(`\\u2713 Exported ${result.clippings.length} clippings to ${parsed.output}`));
      log(c.dim(`  Format: ${exporter.name}, Time: ${elapsed}ms`));
    } else {
      // Output to stdout
      if (typeof exportData.output === "string") {
        log(exportData.output);
      } else {
        // Binary output (like JEX)
        error(c.warn("Binary output detected. Please specify --output=<path> for this format."));
        process.exit(1);
      }
    }
  } catch (err) {
    error(c.error(`Export failed: ${err}`));
    process.exit(1);
  }
}

/**
 * Handle stats command - show detailed statistics.
 */
async function handleStats(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (!parsed.file) {
    error(c.error("Error: No file specified"));
    log(c.dim("Usage: kindle-tools stats <file> [options]"));
    process.exit(1);
  }

  // Check if file exists
  try {
    await fs.access(parsed.file);
  } catch {
    error(c.error(`Error: File not found: ${parsed.file}`));
    process.exit(1);
  }

  try {
    const result = await parseClippingsFile(parsed.file, parsed);

    if (parsed.json) {
      // JSON output for scripting
      log(JSON.stringify(result.stats, null, parsed.pretty ? 2 : undefined));
    } else {
      // Pretty print detailed stats
      printDetailedStats(result.stats, result.clippings);
    }
  } catch (err) {
    if (parsed.json) {
      log(JSON.stringify({ success: false, error: String(err) }));
    } else {
      error(c.error(`Stats failed: ${err}`));
    }
    process.exit(1);
  }
}

/**
 * Handle validate command - validate file format.
 */
async function handleValidate(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (!parsed.file) {
    error(c.error("Error: No file specified"));
    log(c.dim("Usage: kindle-tools validate <file> [options]"));
    process.exit(1);
  }

  // Check if file exists
  try {
    await fs.access(parsed.file);
  } catch {
    error(c.error(`Error: File not found: ${parsed.file}`));
    process.exit(1);
  }

  try {
    const content = await fs.readFile(parsed.file, "utf-8");
    const fileStats = await fs.stat(parsed.file);

    // Try to tokenize
    const blocks = tokenize(content);

    // Validation checks
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check 1: File not empty
    if (content.trim().length === 0) {
      issues.push("File is empty");
    }

    // Check 2: Has valid separator
    if (!content.includes("==========")) {
      issues.push("No Kindle separator (==========) found");
    }

    // Check 3: Has blocks
    if (blocks.length === 0) {
      issues.push("No valid clipping blocks found");
    }

    // Check 4: Parse some blocks to validate format
    let validBlocks = 0;
    let invalidBlocks = 0;
    const result = parseString(content, { language: parsed.lang || "auto" });

    for (const warning of result.warnings) {
      if (warning.type === "unknown_format") {
        invalidBlocks++;
      }
    }
    validBlocks = result.clippings.length;

    // Check 5: BOM check
    if (content.charCodeAt(0) === 0xfeff) {
      warnings.push(
        "File contains BOM (byte order mark) - this is OK but will be removed during parsing",
      );
    }

    // Check 6: Line endings
    const hasCRLF = content.includes("\r\n");
    const hasLF = content.includes("\n") && !hasCRLF;
    if (hasCRLF) {
      warnings.push("File uses Windows line endings (CRLF)");
    } else if (hasLF) {
      warnings.push("File uses Unix line endings (LF)");
    }

    // Output results
    if (parsed.json) {
      log(
        JSON.stringify(
          {
            valid: issues.length === 0,
            file: parsed.file,
            sizeBytes: fileStats.size,
            totalBlocks: blocks.length,
            validClippings: validBlocks,
            invalidBlocks: invalidBlocks,
            detectedLanguage: result.meta.detectedLanguage,
            issues,
            warnings,
          },
          null,
          parsed.pretty ? 2 : undefined,
        ),
      );
    } else {
      log("");
      log(c.bold("  Kindle Clippings File Validation"));
      log(c.dim("  ─────────────────────────────────"));
      log("");
      log(`  File: ${c.info(parsed.file)}`);
      log(`  Size: ${c.info(formatBytes(fileStats.size))}`);
      log(`  Detected Language: ${c.info(result.meta.detectedLanguage.toUpperCase())}`);
      log("");

      if (issues.length === 0) {
        log(`  ${c.success("\\u2713")} ${c.bold("Valid Kindle clippings file")}`);
        log("");
        log(`  ${c.dim("•")} Total blocks: ${c.highlight(String(blocks.length))}`);
        log(`  ${c.dim("•")} Valid clippings: ${c.highlight(String(validBlocks))}`);
        if (invalidBlocks > 0) {
          log(`  ${c.dim("•")} Unparseable blocks: ${c.warn(String(invalidBlocks))}`);
        }
      } else {
        log(`  ${c.error("\\u2717")} ${c.bold("Invalid file")}`);
        log("");
        for (const issue of issues) {
          log(`  ${c.error("•")} ${issue}`);
        }
      }

      if (warnings.length > 0) {
        log("");
        log(c.dim("  Notes:"));
        for (const warning of warnings) {
          log(`  ${c.dim("•")} ${warning}`);
        }
      }

      log("");
    }

    // Exit with error code if not valid
    if (issues.length > 0) {
      process.exit(1);
    }
  } catch (err) {
    if (parsed.json) {
      log(JSON.stringify({ valid: false, error: String(err) }));
    } else {
      error(c.error(`Validation failed: ${err}`));
    }
    process.exit(1);
  }
}

// =============================================================================
// Output Formatting
// =============================================================================

/**
 * Print help message
 */
function printHelp(): void {
  log(`
${c.bold("kindle-tools")} - Parse and export Kindle clippings

${c.bold("USAGE:")}
  kindle-tools <command> [options]

${c.bold("COMMANDS:")}
  ${c.info("parse")} <file>      Parse a clippings file and show summary
  ${c.info("export")} <file>     Export clippings to a specific format
  ${c.info("stats")} <file>      Show detailed statistics
  ${c.info("validate")} <file>   Validate file format (TXT only)

${c.bold("SUPPORTED INPUT FORMATS:")}
  .txt               Kindle's "My Clippings.txt" format
  .json              JSON exported by this tool
  .csv               CSV exported by this tool

${c.bold("OPTIONS:")}
  -h, --help            Show this help message
  -v, --version         Show version number
  -f, --format <fmt>    Export format: json, csv, md, obsidian, joplin, html
  -o, --output <path>   Output file or directory
  -l, --lang <code>     Force language: en, es, pt, de, fr, it, zh, ja, ko, nl, ru
  --no-merge            Disable smart merging of overlapping highlights
  --no-dedup            Disable deduplication
  --json                Output as JSON (for scripting)
  --verbose             Show detailed output
  --pretty              Pretty print JSON output
  --group-by-book       Group output by book
  -c, --config <path>   Use specific config file (default: auto-discover .kindletoolsrc)

${c.bold("PROCESSING OPTIONS:")}
  --highlights-only     Return only highlights with embedded notes (no separate notes/bookmarks)
  --extract-tags        Extract tags from notes during parsing
  --tag-case <case>     Tag case: original (as typed), uppercase (default), lowercase

${c.bold("EXPORT OPTIONS (Obsidian/Joplin):")}
  --structure <type>    Folder structure: flat, by-book, by-author (default), by-author-book
  --author-case <case>  Author folder case: original, uppercase (default), lowercase
  --include-tags        Include clipping tags in export (default: true)
  --no-tags             Exclude clipping tags from export
  --title <text>        HTML page title or Jex notebook name
  --creator <text>      Author attribution for notes (e.g. your name)

${c.bold("EXAMPLES:")}
  ${c.dim("# Parse and see summary")}
  kindle-tools parse "My Clippings.txt"

  ${c.dim("# Export to Markdown")}
  kindle-tools export "My Clippings.txt" --format=md --output=./notes.md

  ${c.dim("# Export to Obsidian with Author > Book folder structure")}
  kindle-tools export "My Clippings.txt" --format=obsidian --output=./vault/books/ \\
    --structure=by-author-book --author-case=uppercase

  ${c.dim("# Export to Joplin with 3-level hierarchy (Root > Author > Book)")}
  kindle-tools export "My Clippings.txt" --format=joplin --output=./clippings.jex \\
    --structure=by-author --extract-tags

  ${c.dim("# Export only highlights with embedded notes (no separate notes/bookmarks)")}
  kindle-tools export "My Clippings.txt" --format=json --highlights-only --output=merged.json

  ${c.dim("# Get stats as JSON")}
  kindle-tools stats "My Clippings.txt" --json --pretty

  ${c.dim("# Re-process a previously exported JSON file")}
  kindle-tools parse clippings.json

  ${c.dim("# Convert JSON to CSV")}
  kindle-tools export clippings.json --format=csv --output=clippings.csv

  ${c.dim("# Convert CSV to Markdown")}
  kindle-tools export clippings.csv --format=md --output=notes.md

  ${c.dim("# Validate file format")}
  kindle-tools validate "My Clippings.txt"

  ${c.dim("# Use a specific config file")}
  kindle-tools export "My Clippings.txt" --config=./my-config.json

${c.bold("CONFIG FILE:")}
  Create .kindletoolsrc, .kindletoolsrc.json, or kindletools.config.json:
  {
    "format": "obsidian",
    "folderStructure": "by-author",
    "authorCase": "uppercase",
    "extractTags": true,
    "tagCase": "lowercase"
  }

${c.bold("DOCUMENTATION:")}
  https://github.com/KindleTools/kindle-tools-ts
`);
}

/**
 * Print version
 */
function printVersion(): void {
  log(`kindle-tools v${CLI_VERSION}`);
}

/**
 * Print parse summary in a pretty format.
 */
function printParseSummary(result: ParseResult, elapsed: number, verbose?: boolean): void {
  const { stats, meta } = result;

  log("");
  log(c.bold("  \\u{1F4DA} Kindle Clippings Parsed Successfully"));
  log(c.dim("  ────────────────────────────────────────"));
  log("");
  log(`  ${c.dim("•")} Total clippings: ${c.highlight(String(stats.total))}`);
  log(`  ${c.dim("•")} Highlights: ${c.info(String(stats.totalHighlights))}`);
  log(`  ${c.dim("•")} Notes: ${c.info(String(stats.totalNotes))}`);
  log(`  ${c.dim("•")} Bookmarks: ${c.info(String(stats.totalBookmarks))}`);
  log("");
  log(`  ${c.dim("•")} Books: ${c.highlight(String(stats.totalBooks))}`);
  log(`  ${c.dim("•")} Authors: ${c.highlight(String(stats.totalAuthors))}`);
  log(`  ${c.dim("•")} Total words: ${c.info(String(stats.totalWords))}`);
  log("");
  log(
    c.dim(`  Language: ${meta.detectedLanguage.toUpperCase()} | `) +
      c.dim(`Parsed in ${elapsed}ms | `) +
      c.dim(`${stats.duplicatesRemoved} duplicates removed`),
  );

  if (verbose && stats.booksList.length > 0) {
    log("");
    log(c.bold("  \\u{1F4D6} Top Books by Highlights:"));
    log(c.dim("  ───────────────────────────"));
    const topBooks = stats.booksList.slice(0, 10);
    for (const book of topBooks) {
      log(`  ${c.dim("•")} ${book.title.substring(0, 50)}${book.title.length > 50 ? "..." : ""}`);
      log(`    ${c.dim(`by ${book.author}`)} | ${c.info(`${book.highlights} highlights`)}`);
    }
  }

  if (result.warnings.length > 0 && verbose) {
    log("");
    log(c.warn(`  \\u26A0 ${result.warnings.length} warnings during parsing`));
    for (const warning of result.warnings.slice(0, 5)) {
      log(c.dim(`    • ${warning.message}`));
    }
    if (result.warnings.length > 5) {
      log(c.dim(`    ... and ${result.warnings.length - 5} more`));
    }
  }

  log("");
}

/**
 * Print detailed statistics.
 */
function printDetailedStats(stats: ClippingsStats, clippings: Clipping[]): void {
  log("");
  log(c.bold("  \\u{1F4CA} Kindle Clippings Statistics"));
  log(c.dim("  ════════════════════════════════════════════════════════════"));
  log("");

  // Overview
  log(c.bold("  Overview"));
  log(c.dim("  ────────────────────────────────────────"));
  log(`  Total Clippings:     ${c.highlight(String(stats.total))}`);
  log(`  ├─ Highlights:       ${c.info(String(stats.totalHighlights))}`);
  log(`  ├─ Notes:            ${c.info(String(stats.totalNotes))}`);
  log(`  ├─ Bookmarks:        ${c.info(String(stats.totalBookmarks))}`);
  log(`  └─ Clips/Articles:   ${c.info(String(stats.totalClips))}`);
  log("");
  log(`  Books:               ${c.highlight(String(stats.totalBooks))}`);
  log(`  Authors:             ${c.highlight(String(stats.totalAuthors))}`);
  log("");

  // Content stats
  log(c.bold("  Content"));
  log(c.dim("  ────────────────────────────────────────"));
  log(`  Total Words:         ${c.info(String(stats.totalWords))}`);
  log(`  Avg Words/Highlight: ${c.info(String(stats.avgWordsPerHighlight))}`);
  log(`  Avg Highlights/Book: ${c.info(String(stats.avgHighlightsPerBook))}`);
  log("");

  // Processing stats
  log(c.bold("  Processing"));
  log(c.dim("  ────────────────────────────────────────"));
  log(`  Duplicates Removed:  ${c.warn(String(stats.duplicatesRemoved))}`);
  log(`  Merged Highlights:   ${c.warn(String(stats.mergedHighlights))}`);
  log(`  Linked Notes:        ${c.warn(String(stats.linkedNotes))}`);
  log(`  Empty Removed:       ${c.warn(String(stats.emptyRemoved))}`);
  log(`  DRM Limit Reached:   ${c.warn(String(stats.drmLimitReached))}`);
  log("");

  // Date range
  if (stats.dateRange.earliest && stats.dateRange.latest) {
    log(c.bold("  Date Range"));
    log(c.dim("  ────────────────────────────────────────"));
    log(`  Earliest:           ${c.info(formatDate(stats.dateRange.earliest))}`);
    log(`  Latest:             ${c.info(formatDate(stats.dateRange.latest))}`);
    log("");
  }

  // Top books
  if (stats.booksList.length > 0) {
    log(c.bold("  Top 10 Books by Highlights"));
    log(c.dim("  ────────────────────────────────────────────────────────────"));
    const topBooks = stats.booksList.slice(0, 10);
    for (let i = 0; i < topBooks.length; i++) {
      const book = topBooks[i];
      if (!book) continue;
      const rank = String(i + 1).padStart(2, " ");
      const title = book.title.substring(0, 45) + (book.title.length > 45 ? "..." : "");
      log(`  ${c.dim(rank)}) ${title}`);
      log(`      ${c.dim(`by ${book.author}`)}`);
      log(
        `      ${c.info(`${book.highlights}`)} highlights | ${c.info(`${book.notes}`)} notes | ${c.dim(`${book.wordCount} words`)}`,
      );
    }
  }

  // Source distribution
  const kindleCount = clippings.filter((c) => c.source === "kindle").length;
  const sideloadCount = clippings.filter((c) => c.source === "sideload").length;
  log("");
  log(c.bold("  Source Distribution"));
  log(c.dim("  ────────────────────────────────────────"));
  log(
    `  Kindle Store:        ${c.info(String(kindleCount))} (${((kindleCount / stats.total) * 100).toFixed(1)}%)`,
  );
  log(
    `  Sideloaded:          ${c.info(String(sideloadCount))} (${((sideloadCount / stats.total) * 100).toFixed(1)}%)`,
  );

  log("");
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Write export result to file(s).
 */
async function writeExportResult(
  exporter: Exporter,
  result: ExportSuccess,
  outputPath: string,
): Promise<void> {
  // Handle Joplin JEX exports (TAR archive)
  if (exporter.name === "joplin" && result.files && result.files.length > 0) {
    // Create TAR archive from files
    const tarBuffer = createTarArchive(
      result.files.map((f) => ({
        name: f.path,
        content: f.content,
      })),
    );

    // Ensure output path ends with .jex
    const jexPath = outputPath.endsWith(".jex") ? outputPath : `${outputPath}.jex`;

    const dir = path.dirname(jexPath);
    if (dir && dir !== ".") {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(jexPath, tarBuffer);
    return;
  }

  // Handle ZIP export request for any exporter that produces multiple files
  if (outputPath.endsWith(".zip") && result.files && result.files.length > 0) {
    const zipBuffer = await createZipArchive(
      result.files.map((f) => ({
        name: f.path, // Keeps relative paths/folders
        content: f.content,
        date: new Date(), // Could be improved if we had clipping dates
      })),
    );

    const dir = path.dirname(outputPath);
    if (dir && dir !== ".") {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(outputPath, zipBuffer);
    return;
  }

  // Handle multi-file exports (Obsidian, etc)
  if (result.files && result.files.length > 0) {
    // Create output directory
    await fs.mkdir(outputPath, { recursive: true });

    for (const file of result.files) {
      const filePath = path.join(outputPath, file.path);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
    return;
  }

  // Single file export
  const dir = path.dirname(outputPath);
  if (dir && dir !== ".") {
    await fs.mkdir(dir, { recursive: true });
  }
  await fs.writeFile(outputPath, result.output);
}

/**
 * Format bytes to human readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format date to human readable string.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// =============================================================================
// Run CLI
// =============================================================================

main().catch((err: unknown) => {
  error(c.error("Fatal error:"), err);
  process.exit(1);
});
