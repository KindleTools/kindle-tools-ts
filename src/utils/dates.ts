/**
 * Date parsing utilities for Kindle clippings.
 *
 * @packageDocumentation
 */

import type { Locale } from "date-fns";
import { isValid, parse as parseDateFns } from "date-fns";
import { de, enUS, es, fr, it, ja, ko, nl, pt, ru, zhCN } from "date-fns/locale";
import { LANGUAGE_MAP, SUPPORTED_LANGUAGES } from "../core/constants.js";
import type { SupportedLanguage } from "../types/language.js";

/**
 * Locale map for date-fns.
 */
const LOCALE_MAP: Record<SupportedLanguage, Locale> = {
  en: enUS,
  es: es,
  pt: pt,
  de: de,
  fr: fr,
  it: it,
  zh: zhCN,
  ja: ja,
  ko: ko,
  nl: nl,
  ru: ru,
};

/**
 * Result of automatic date parsing.
 */
export interface DateParseAutoResult {
  date: Date | null;
  detectedLanguage: SupportedLanguage | null;
}

/**
 * Parse a Kindle date string for a specific language.
 *
 * @param dateString - Raw date string from the file
 * @param language - Language to use for parsing
 * @returns Parsed Date or null if parsing failed
 *
 * @example
 * parseKindleDate("Friday, January 1, 2024 10:30:45 AM", "en")
 * // Returns: Date object for Jan 1, 2024 10:30:45
 */
export function parseKindleDate(dateString: string, language: SupportedLanguage): Date | null {
  const patterns = LANGUAGE_MAP[language];
  const locale = LOCALE_MAP[language];

  const cleanDate = dateString.trim();

  // Try each date format for this language
  for (const format of patterns.dateFormats) {
    try {
      const parsed = parseDateFns(cleanDate, format, new Date(), { locale });

      if (isValid(parsed)) {
        return parsed;
      }
    } catch {}
  }

  // If strict parsing failed, try a more lenient approach
  try {
    // Try parsing with just the Date constructor as fallback
    const fallback = new Date(cleanDate);
    if (isValid(fallback)) {
      return fallback;
    }
  } catch {
    // Fallback failed too
  }

  return null;
}

/**
 * Try to parse a date string by testing all supported languages.
 *
 * @param dateString - Raw date string
 * @returns Parsed date and detected language
 *
 * @example
 * parseKindleDateAuto("viernes, 1 de enero de 2024 10:30:45")
 * // Returns: { date: Date, detectedLanguage: "es" }
 */
export function parseKindleDateAuto(dateString: string): DateParseAutoResult {
  for (const language of SUPPORTED_LANGUAGES) {
    const date = parseKindleDate(dateString, language);

    if (date) {
      return {
        date,
        detectedLanguage: language,
      };
    }
  }

  return {
    date: null,
    detectedLanguage: null,
  };
}

/**
 * Format a date to ISO string (YYYY-MM-DD).
 * Useful for YAML frontmatter and stable machine-readable dates.
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0] || "";
}

/**
 * Format a date to human-readable string (YYYY-MM-DD HH:mm:ss).
 * Useful for logs or simple display.
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD HH:mm:ss format
 */
export function formatDateHuman(date: Date): string {
  // Use date-fns isValid for consistency if imported, or strict check
  if (isNaN(date.getTime())) return "Invalid Date";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
