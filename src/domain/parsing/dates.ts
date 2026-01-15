/**
 * Date parsing logic specifically for Kindle clippings.
 *
 * Contains business logic regarding supported languages and date formats.
 *
 * @packageDocumentation
 */

import type { Locale } from "date-fns";
import { isValid, parse as parseDateFns } from "date-fns";
import type { SupportedLanguage } from "#app-types/language.js";
import { LANGUAGE_MAP, SUPPORTED_LANGUAGES } from "#domain/parsing/languages.js";

/**
 * Lazy loaders for date-fns locales.
 * Each locale is loaded on-demand to reduce bundle size in browser environments.
 */
const LOCALE_LOADERS: Record<SupportedLanguage, () => Promise<Locale>> = {
  en: () => import("date-fns/locale/en-US").then((m) => m.enUS),
  es: () => import("date-fns/locale/es").then((m) => m.es),
  pt: () => import("date-fns/locale/pt").then((m) => m.pt),
  de: () => import("date-fns/locale/de").then((m) => m.de),
  fr: () => import("date-fns/locale/fr").then((m) => m.fr),
  it: () => import("date-fns/locale/it").then((m) => m.it),
  zh: () => import("date-fns/locale/zh-CN").then((m) => m.zhCN),
  ja: () => import("date-fns/locale/ja").then((m) => m.ja),
  ko: () => import("date-fns/locale/ko").then((m) => m.ko),
  nl: () => import("date-fns/locale/nl").then((m) => m.nl),
  ru: () => import("date-fns/locale/ru").then((m) => m.ru),
};

/**
 * Cache for loaded locales to avoid repeated dynamic imports.
 */
const localeCache = new Map<SupportedLanguage, Locale>();

/**
 * Get locale for a language, loading it dynamically if needed.
 * @param lang - Language code
 * @returns Promise resolving to the date-fns Locale
 */
async function getLocale(lang: SupportedLanguage): Promise<Locale> {
  const cached = localeCache.get(lang);
  if (cached) return cached;

  const loader = LOCALE_LOADERS[lang];
  if (!loader) {
    throw new Error(`No locale loader for language: ${lang}`);
  }

  const locale = await loader();
  localeCache.set(lang, locale);
  return locale;
}

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
 * @returns Promise resolving to parsed Date or null if parsing failed
 *
 * @example
 * await parseKindleDate("Friday, January 1, 2024 10:30:45 AM", "en")
 * // Returns: Date object for Jan 1, 2024 10:30:45
 */
export async function parseKindleDate(
  dateString: string,
  language: SupportedLanguage,
): Promise<Date | null> {
  const patterns = LANGUAGE_MAP[language];

  if (!patterns) {
    return null;
  }

  const locale = await getLocale(language);
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
 * @returns Promise resolving to parsed date and detected language
 *
 * @example
 * await parseKindleDateAuto("viernes, 1 de enero de 2024 10:30:45")
 * // Returns: { date: Date, detectedLanguage: "es" }
 */
export async function parseKindleDateAuto(dateString: string): Promise<DateParseAutoResult> {
  for (const language of SUPPORTED_LANGUAGES) {
    const date = await parseKindleDate(dateString, language);

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
