/**
 * Core domain constants used across the application.
 *
 * These constants are agnostic of the input format (TXT, JSON, CSV)
 * and define business logic thresholds and common patterns.
 *
 * @packageDocumentation
 */

/**
 * Messages indicating DRM clipping limit was reached.
 * These appear when a book's publisher restricts how much can be highlighted.
 */
export const DRM_LIMIT_MESSAGES: readonly string[] = [
  "You have reached the clipping limit",
  "Has alcanzado el límite de recortes",
  "Você atingiu o limite de recortes",
  "Sie haben das Markierungslimit erreicht",
  "Vous avez atteint la limite",
  "<You have reached the clipping limit for this item>",
  "您已达到本书的剪贴限制",
  "このアイテムのクリップ上限に達しました",
] as const;

/**
 * Patterns to remove from book titles for cleaner display.
 *
 * These patterns match common noise in Kindle book titles:
 * - Edition markers: "(Spanish Edition)", "(Kindle Edition)", etc.
 * - E-book markers: "[eBook]", "[Print Replica]"
 * - Leading numbers: "01 Book Title"
 * - Empty parentheses left after other removals
 */
export const TITLE_NOISE_PATTERNS: readonly RegExp[] = [
  // Edition markers in parentheses
  /\s*\(Spanish Edition\)/i,
  /\s*\(English Edition\)/i,
  /\s*\(Edición española\)/i,
  /\s*\(Edición en español\)/i,
  /\s*\(French Edition\)/i,
  /\s*\(Edition française\)/i,
  /\s*\(Version française\)/i,
  /\s*\(German Edition\)/i,
  /\s*\(Deutsche Ausgabe\)/i,
  /\s*\(Italian Edition\)/i,
  /\s*\(Edizione italiana\)/i,
  /\s*\(Portuguese Edition\)/i,
  /\s*\(Edição portuguesa\)/i,
  /\s*\(Kindle Edition\)/i,
  /\s*\(Edition \d+\)/i,

  // E-book markers in brackets
  /\s*\[Print Replica\]/i,
  /\s*\[eBook\]/i,
  /\s*\[Kindle\]/i,

  // Leading numbers (e.g., "01 Book Title" from series)
  /^\d+\s+/,

  // Empty parentheses/brackets left after other removals
  /\s*\(\s*\)$/,
  /\s*\[\s*\]$/,
] as const;

/**
 * Thresholds for suspicious highlight detection.
 */
export const SUSPICIOUS_HIGHLIGHT_THRESHOLDS = {
  /** Highlights shorter than this are likely garbage */
  GARBAGE_LENGTH: 5,

  /** Short highlights below this length need additional checks */
  SHORT_LENGTH: 75,

  /** Valid ending punctuation for complete sentences */
  VALID_ENDINGS: /[.!?"")\]]$/,
} as const;

/**
 * Default threshold for Jaccard similarity in fuzzy duplicate detection.
 * 0.8 means 80% word overlap is considered a possible duplicate.
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.8;
