/**
 * Tag extraction utilities.
 *
 * Extracts tags from Kindle notes that use a specific format:
 * - Comma-separated: "tag1, tag2, tag3"
 * - Semicolon-separated: "tag1; tag2; tag3"
 * - Newline-separated (one tag per line)
 * - Mixed separators
 *
 * This is useful for users who use their Kindle notes as a tagging system.
 *
 * @packageDocumentation
 */

/**
 * Case transformation for extracted tags.
 */
export type TagCase = "original" | "uppercase" | "lowercase";

/**
 * Options for tag extraction.
 */
export interface TagExtractionOptions {
  /**
   * Case transformation for extracted tags.
   * - 'original': Keep original case as typed in notes
   * - 'uppercase': Convert to UPPERCASE
   * - 'lowercase': Convert to lowercase (default)
   */
  tagCase?: TagCase;
}

/**
 * Result of tag extraction.
 */
export interface TagExtractionResult {
  /** Extracted tags, cleaned and normalized */
  tags: string[];

  /** True if any tags were found */
  hasTags: boolean;

  /** True if the note looks like a tag-only note (vs a regular note with some tags) */
  isTagOnlyNote: boolean;
}

/**
 * Separators used to split notes into potential tags.
 * Supports comma, semicolon, period, and newline separators.
 */
const TAG_SEPARATORS = /[,;.\n\r]+/;

/**
 * Maximum length for a single tag.
 */
const MAX_TAG_LENGTH = 50;

/**
 * Minimum length for a single tag.
 */
const MIN_TAG_LENGTH = 2;

/**
 * Extract tags from a note's content.
 *
 * The function detects notes that look like tag lists:
 * - "productivity, psychology, habits"
 * - "business; self-help"
 * - Single words on each line
 *
 * It excludes:
 * - Very long "words" (likely sentences)
 * - Numbers only
 * - Strings with too many spaces (likely sentences)
 *
 * @param noteContent - Content of the note
 * @returns Extraction result with tags and metadata
 *
 * @example
 * ```typescript
 * const result = extractTagsFromNote("productivity, psychology, habits");
 * // result.tags = ["productivity", "psychology", "habits"]
 * // result.hasTags = true
 * // result.isTagOnlyNote = true
 * ```
 */
export function extractTagsFromNote(
  noteContent: string,
  options: TagExtractionOptions = {},
): TagExtractionResult {
  if (!noteContent || noteContent.trim().length === 0) {
    return { tags: [], hasTags: false, isTagOnlyNote: false };
  }

  const trimmed = noteContent.trim();
  const tagCase = options.tagCase ?? "lowercase";

  // Split by separators
  const parts = trimmed.split(TAG_SEPARATORS);

  // Process each part as a potential tag
  const tags: string[] = [];

  for (const part of parts) {
    const cleaned = cleanTag(part, tagCase);

    if (isValidTag(cleaned)) {
      tags.push(cleaned);
    }
  }

  // Deduplicate (case-insensitive comparison, but preserve the chosen case)
  const seen = new Set<string>();
  const uniqueTags: string[] = [];
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTags.push(tag);
    }
  }

  // Determine if this looks like a tag-only note
  // (all parts became valid tags, no long text fragments)
  const isTagOnlyNote =
    uniqueTags.length > 0 && uniqueTags.length === parts.filter((p) => p.trim().length > 0).length;

  return {
    tags: uniqueTags,
    hasTags: uniqueTags.length > 0,
    isTagOnlyNote,
  };
}

/**
 * Clean a potential tag string.
 *
 * @param tag - Raw tag text
 * @returns Cleaned tag
 */
function cleanTag(tag: string, tagCase: TagCase): string {
  let cleaned = tag.trim();

  // Remove leading # if present (hashtag style)
  if (cleaned.startsWith("#")) {
    cleaned = cleaned.slice(1);
  }

  // Remove leading @ if present (mention style)
  if (cleaned.startsWith("@")) {
    cleaned = cleaned.slice(1);
  }

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:!?]+$/, "");

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Apply case transformation
  switch (tagCase) {
    case "uppercase":
      cleaned = cleaned.toUpperCase();
      break;
    case "lowercase":
      cleaned = cleaned.toLowerCase();
      break;
    case "original":
      // Keep original case
      break;
  }

  return cleaned;
}

/**
 * Check if a string is a valid tag.
 *
 * @param tag - Potential tag
 * @returns True if it's a valid tag
 */
function isValidTag(tag: string): boolean {
  // Check length
  if (tag.length < MIN_TAG_LENGTH || tag.length > MAX_TAG_LENGTH) {
    return false;
  }

  // Must start with a letter
  if (!/^[a-zA-ZáéíóúñüàèìòùâêîôûäëïöçÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÇ]/.test(tag)) {
    return false;
  }

  // Reject if too many internal spaces (likely a sentence fragment)
  const spaceCount = (tag.match(/ /g) || []).length;
  if (spaceCount > 3) {
    return false;
  }

  // Reject if contains typical sentence patterns
  if (/\b(the|is|are|was|were|have|has|will|would|could|should|does|did)\b/i.test(tag)) {
    return false;
  }

  return true;
}

/**
 * Check if a note looks like it contains tags.
 *
 * Quick check without full extraction. Useful for filtering.
 *
 * @param noteContent - Content of the note
 * @returns True if the note likely contains tags
 */
export function looksLikeTagNote(noteContent: string): boolean {
  if (!noteContent || noteContent.trim().length === 0) {
    return false;
  }

  const trimmed = noteContent.trim();

  // Short notes with separators are likely tags
  if (trimmed.length < 200 && TAG_SEPARATORS.test(trimmed)) {
    return true;
  }

  // Short notes without spaces are likely tags
  if (trimmed.length < 50 && !trimmed.includes(" ")) {
    return true;
  }

  return false;
}
