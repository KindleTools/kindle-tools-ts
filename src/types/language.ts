/**
 * Supported languages for Kindle clippings parsing.
 *
 * The language code follows ISO 639-1 standard.
 */
export type SupportedLanguage =
  | "en" // English
  | "es" // Spanish
  | "pt" // Portuguese
  | "de" // German
  | "fr" // French
  | "it" // Italian
  | "zh" // Chinese (Simplified)
  | "ja" // Japanese
  | "ko" // Korean
  | "nl" // Dutch
  | "ru"; // Russian

/**
 * Language-specific patterns for parsing Kindle clippings.
 *
 * These patterns are used to detect the type of clipping,
 * extract metadata, and parse dates.
 */
export interface LanguagePatterns {
  /** Pattern for "Added on" text (e.g., "Añadido el" in Spanish) */
  addedOn: string;

  /** Pattern for "Your Highlight" text */
  highlight: string;

  /** Pattern for "Your Note" text */
  note: string;

  /** Pattern for "Your Bookmark" text */
  bookmark: string;

  /** Pattern for "Your Clip" text (web articles) */
  clip: string;

  /** Pattern for "page" text */
  page: string;

  /** Pattern for "Location" text */
  location: string;

  /** Possible date formats for this language (date-fns format strings) */
  dateFormats: string[];
}
