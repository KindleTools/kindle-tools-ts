/**
 * Parser for Kindle clippings.
 *
 * This module provides the core parsing functionality for converting
 * raw Kindle clippings into structured Clipping objects.
 *
 * @packageDocumentation
 */

import type { Clipping, ClippingLocation, ClippingType } from "#app-types/clipping.js";
import type { ParseOptions, ParseResult, ParseWarning } from "#app-types/config.js";
import type { SupportedLanguage } from "#app-types/language.js";
import { process } from "#core/processor.js";
import { calculateStats } from "#domain/analytics/stats.js";
import { generateClippingId } from "#domain/core/identity.js";
import { parseKindleDate } from "#domain/parsing/dates.js";
import { LANGUAGE_MAP } from "#domain/parsing/languages.js";
import {
  extractAuthor,
  isSideloaded,
  sanitizeContent,
  sanitizeTitle,
} from "#domain/parsing/sanitizers.js";
import { countWords } from "#utils/text/counting.js";
import { normalizeWhitespace, removeBOM } from "#utils/text/normalizers.js";
import { detectLanguage } from "./language-detector.js";
import { cleanText } from "./text-cleaner.js";
import { tokenize } from "./tokenizer.js";

/**
 * Get byte length of a UTF-8 string (works in both Node.js and browser).
 * @param str - String to measure
 * @returns Byte length
 */
function getByteLength(str: string): number {
  // TextEncoder is available in both Node.js (v11+) and browsers
  return new TextEncoder().encode(str).length;
}

/**
 * Result of parsing a metadata line.
 */
interface MetadataParseResult {
  type: ClippingType;
  page: number | null;
  location: ClippingLocation;
  dateRaw: string;
}

export function parseString(content: string, options?: ParseOptions): ParseResult {
  const startTime = performance.now();
  const warnings: ParseWarning[] = [];

  // Step 1: Normalize the content (but preserve newlines for tokenization)
  // Note: We only do safe normalization here - BOM removal, line endings, Unicode, control chars
  // Whitespace normalization is done later on individual content pieces
  let normalizedContent = content;
  if (options?.normalizeUnicode !== false) {
    normalizedContent = removeBOM(normalizedContent);
    normalizedContent = normalizedContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    normalizedContent = normalizedContent.normalize("NFC");
  }

  // Step 2: Tokenize into blocks
  const blocks = tokenize(normalizedContent);
  const totalBlocks = blocks.length;

  // Step 3: Detect language
  const languageOption = options?.language ?? "auto";
  const detectedLanguage: SupportedLanguage =
    languageOption === "auto" ? detectLanguage(blocks) : languageOption;

  // Step 4: Parse each block
  const clippings: Clipping[] = [];
  let parsedBlocks = 0;

  for (const block of blocks) {
    const clipping = parseBlock(block.lines, block.index, detectedLanguage);

    if (clipping) {
      // Apply filtering options
      if (options?.excludeTypes?.includes(clipping.type)) {
        continue;
      }

      if (
        options?.minContentLength &&
        clipping.content.length < options.minContentLength &&
        clipping.type !== "bookmark"
      ) {
        continue;
      }

      if (
        options?.excludeBooks?.some((book) =>
          clipping.title.toLowerCase().includes(book.toLowerCase()),
        )
      ) {
        continue;
      }

      if (options?.onlyBooks && options.onlyBooks.length > 0) {
        const matchesAny = options.onlyBooks.some((book) =>
          clipping.title.toLowerCase().includes(book.toLowerCase()),
        );
        if (!matchesAny) {
          continue;
        }
      }

      clippings.push(clipping);
      parsedBlocks++;
    } else {
      // Add warning for unparseable block
      warnings.push({
        type: "unknown_format",
        message: `Could not parse block at index ${block.index}`,
        blockIndex: block.index,
        raw: block.raw.substring(0, 200),
      });
    }
  }

  // Step 5: Process clippings if any processing options are explicitly enabled
  // Processing includes: dedup, merge highlights, link notes, extract tags, filter to highlights only
  // Only process when options are explicitly passed and at least one processing option is true
  const needsProcessing =
    options !== undefined &&
    (options.removeDuplicates === true ||
      options.mergeOverlapping === true ||
      options.mergeNotes === true ||
      options.extractTags === true ||
      options.highlightsOnly === true);

  let finalClippings = clippings;
  let duplicatesRemoved = 0;
  let mergedHighlights = 0;
  let linkedNotes = 0;
  let emptyRemoved = 0;

  if (needsProcessing) {
    const processResult = process(clippings, {
      ...(options || {}),
      detectedLanguage,
    });
    finalClippings = processResult.clippings;
    duplicatesRemoved = processResult.duplicatesRemoved;
    mergedHighlights = processResult.mergedHighlights;
    linkedNotes = processResult.linkedNotes;
    emptyRemoved = processResult.emptyRemoved;
  }

  // Step 6: Calculate stats from processed clippings
  const stats = calculateStats(finalClippings);

  // Merge processing stats into main stats
  stats.duplicatesRemoved = duplicatesRemoved;
  stats.mergedHighlights = mergedHighlights;
  stats.linkedNotes = linkedNotes;
  stats.emptyRemoved = emptyRemoved;

  const parseTime = performance.now() - startTime;

  return {
    clippings: finalClippings,
    stats,
    warnings,
    meta: {
      fileSize: getByteLength(content),
      parseTime,
      detectedLanguage,
      totalBlocks,
      parsedBlocks,
    },
  };
}

/**
 * Parse Kindle clippings (alias for parseString).
 *
 * @param content - Raw file content
 * @param options - Parse options
 * @returns Parse result with clippings and stats
 */
export function parse(content: string, options?: ParseOptions): ParseResult {
  return parseString(content, options);
}

/**
 * Parse a single block into a Clipping.
 *
 * Block structure:
 * - Line 0: Title (Author)
 * - Line 1: - Your Highlight on page X | Location Y | Added on Date
 * - Line 2+: Content (may be empty for bookmarks)
 *
 * @param lines - Lines of the block
 * @param blockIndex - Index of this block
 * @param language - Language for parsing
 * @returns Parsed Clipping or null if parsing failed
 */
export function parseBlock(
  lines: string[],
  blockIndex: number,
  language: SupportedLanguage,
): Clipping | null {
  // Need at least 2 lines (title + metadata)
  if (lines.length < 2) {
    return null;
  }

  const titleLine = lines[0];
  const metadataLine = lines[1];

  if (!titleLine || !metadataLine) {
    return null;
  }

  // Parse title and author (extractAuthor now returns clean title)
  const { title: extractedTitle, author } = extractAuthor(titleLine);

  // Apply additional title cleaning (edition markers, etc)
  const titleCleanResult = sanitizeTitle(extractedTitle);
  const title = titleCleanResult.title;
  const titleWasCleaned = titleCleanResult.wasCleaned;

  // Parse metadata line (type, page, location, date)
  const metadata = parseMetadataLine(metadataLine, language);

  if (!metadata) {
    return null;
  }

  // Extract content (everything after line 1, joined)
  const contentLines = lines.slice(2);
  const rawContent = contentLines.join("\n");
  const { content: sanitizedContent, isEmpty, isLimitReached } = sanitizeContent(rawContent);

  // Apply advanced text cleaning (de-hyphenation, spacing fixes)
  const textCleanResult = cleanText(sanitizedContent);
  const content = textCleanResult.text;
  const contentWasCleaned = textCleanResult.wasCleaned;

  // Determine source (Kindle or sideloaded)
  const source = isSideloaded(titleLine) ? "sideload" : "kindle";

  // Parse date
  const date = metadata.dateRaw ? parseKindleDate(metadata.dateRaw, language) : null;

  // Generate deterministic ID
  const id = generateClippingId(title, metadata.location.raw, metadata.type, content);

  // Calculate word and character counts
  const wordCount = countWords(content);
  const charCount = content.length;

  // Build base clipping
  const clipping: Clipping = {
    id,
    title,
    titleRaw: titleLine,
    author,
    authorRaw: titleLine,
    content,
    contentRaw: rawContent,
    type: metadata.type,
    page: metadata.page,
    location: metadata.location,
    date,
    dateRaw: metadata.dateRaw,
    isLimitReached,
    isEmpty,
    language,
    source,
    wordCount,
    charCount,
    blockIndex,
  };

  // Add quality flags only when content was cleaned
  if (titleWasCleaned) {
    clipping.titleWasCleaned = true;
  }
  if (contentWasCleaned) {
    clipping.contentWasCleaned = true;
  }

  return clipping;
}

/**
 * Parse the metadata line to extract type, page, location, and date.
 *
 * Format varies by language, but generally:
 * "- Your Highlight on page 42 | Location 100-105 | Added on Friday, January 1, 2024 10:30:45 AM"
 *
 * @param line - Metadata line
 * @param language - Language for pattern matching
 * @returns Parsed metadata or null if parsing failed
 */
function parseMetadataLine(line: string, language: SupportedLanguage): MetadataParseResult | null {
  if (!line.startsWith("-")) {
    return null;
  }

  // Remove leading dash and trim
  const cleaned = line.slice(1).trim();

  // Determine clipping type
  const type = detectClippingType(cleaned, language);

  // Parse page number
  const page = parsePageNumber(cleaned, language);

  // Parse location
  const location = parseLocation(cleaned, language);

  // Parse date (everything after "Added on" or equivalent)
  const dateRaw = parseDateString(cleaned, language);

  return {
    type,
    page,
    location,
    dateRaw,
  };
}

/**
 * Detect the type of clipping from the metadata line.
 */
function detectClippingType(text: string, language: SupportedLanguage): ClippingType {
  const patterns = LANGUAGE_MAP[language];
  const lowerText = text.toLowerCase();

  if (lowerText.includes(patterns.highlight.toLowerCase())) {
    return "highlight";
  }
  if (lowerText.includes(patterns.note.toLowerCase())) {
    return "note";
  }
  if (lowerText.includes(patterns.bookmark.toLowerCase())) {
    return "bookmark";
  }
  if (lowerText.includes(patterns.clip.toLowerCase())) {
    return "clip";
  }

  // Default to highlight if unrecognized
  return "highlight";
}

/**
 * Parse page number from the metadata line.
 */
function parsePageNumber(text: string, language: SupportedLanguage): number | null {
  const patterns = LANGUAGE_MAP[language];
  const pageKeyword = patterns.page.toLowerCase();

  const lowerText = text.toLowerCase();
  const pageIndex = lowerText.indexOf(pageKeyword);

  if (pageIndex === -1) {
    return null;
  }

  // Extract the portion after "page"
  const afterPage = text.slice(pageIndex + pageKeyword.length);

  // Match the first number
  const match = afterPage.match(/\s*(\d+)/);

  return match?.[1] ? Number.parseInt(match[1], 10) : null;
}

/**
 * Parse location from the metadata line.
 */
function parseLocation(text: string, language: SupportedLanguage): ClippingLocation {
  const patterns = LANGUAGE_MAP[language];
  const locationKeyword = patterns.location.toLowerCase();

  const lowerText = text.toLowerCase();
  const locationIndex = lowerText.indexOf(locationKeyword);

  if (locationIndex === -1) {
    return { raw: "", start: 0, end: null };
  }

  // Extract the portion after "Location"
  const afterLocation = text.slice(locationIndex + locationKeyword.length);

  // Match location range (e.g., "100-105" or "100")
  const rangeMatch = afterLocation.match(/\s*(\d+)\s*-\s*(\d+)/);
  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    const start = Number.parseInt(rangeMatch[1], 10);
    const end = Number.parseInt(rangeMatch[2], 10);
    return {
      raw: `${start}-${end}`,
      start,
      end,
    };
  }

  // Single location
  const singleMatch = afterLocation.match(/\s*(\d+)/);
  if (singleMatch?.[1]) {
    const start = Number.parseInt(singleMatch[1], 10);
    return {
      raw: `${start}`,
      start,
      end: null,
    };
  }

  return { raw: "", start: 0, end: null };
}

/**
 * Parse date string from the metadata line.
 */
function parseDateString(text: string, language: SupportedLanguage): string {
  const patterns = LANGUAGE_MAP[language];
  const addedOnKeyword = patterns.addedOn.toLowerCase();

  const lowerText = text.toLowerCase();
  const addedOnIndex = lowerText.indexOf(addedOnKeyword);

  if (addedOnIndex === -1) {
    return "";
  }

  // Everything after "Added on" is the date
  const dateString = text.slice(addedOnIndex + patterns.addedOn.length).trim();

  return normalizeWhitespace(dateString);
}
