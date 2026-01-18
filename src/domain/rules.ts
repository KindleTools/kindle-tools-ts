/**
 * Constants related to content analysis and domain rules.
 *
 * These values define business rules for duplicate detection,
 * note linking, and data quality checks.
 */
export const ANALYSIS_THRESHOLDS = {
  /**
   * Default threshold for Jaccard similarity in fuzzy duplicate detection.
   * 0.8 means 80% word overlap is considered a possible duplicate.
   */
  DEFAULT_SIMILARITY_THRESHOLD: 0.8,

  /**
   * Maximum distance for linking notes to highlights.
   * Defined as number of lines or proximity metric (implementation specific).
   */
  LINKER_MAX_DISTANCE: 10,
} as const;

/**
 * Thresholds for suspicious highlight detection.
 */
export const SUSPICIOUS_HIGHLIGHT_THRESHOLDS: {
  readonly GARBAGE_LENGTH: 5;
  readonly SHORT_LENGTH: 75;
  readonly VALID_ENDINGS: RegExp;
} = {
  /** Highlights shorter than this are likely garbage */
  GARBAGE_LENGTH: 5,

  /** Short highlights below this length need additional checks */
  SHORT_LENGTH: 75,

  /** Valid ending punctuation for complete sentences */
  VALID_ENDINGS: /[.!?"")\]]$/,
} as const;

/**
 * Common file patterns used in Kindle ecosystem.
 */
export const COMMON_PATTERNS: {
  readonly SIDELOAD_EXTENSIONS: RegExp;
  readonly EBOK_SUFFIX: RegExp;
} = {
  /** Sideloaded book extensions (matches anywhere in title) */
  SIDELOAD_EXTENSIONS: /\.(pdf|epub|mobi|azw3?|txt|doc|docx|html|fb2|rtf)/i,

  /** Amazon _EBOK suffix */
  EBOK_SUFFIX: /_EBOK$/i,
} as const;

/**
 * Patterns to remove from book titles for cleaner display.
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
 * Messages indicating DRM clipping limit was reached.
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
