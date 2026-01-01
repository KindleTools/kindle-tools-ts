/**
 * Language patterns and constants for Kindle clippings parsing.
 *
 * @packageDocumentation
 */

import type { LanguagePatterns, SupportedLanguage } from "../types/language.js";

/**
 * List of all supported languages.
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  "en",
  "es",
  "pt",
  "de",
  "fr",
  "it",
  "zh",
  "ja",
  "ko",
  "nl",
  "ru",
] as const;

/**
 * Language-specific patterns for parsing Kindle clippings.
 *
 * Each language has different patterns for metadata like "Added on",
 * "Your Highlight", page numbers, and date formats.
 */
export const LANGUAGE_MAP: Record<SupportedLanguage, LanguagePatterns> = {
  en: {
    addedOn: "Added on",
    highlight: "Your Highlight",
    note: "Your Note",
    bookmark: "Your Bookmark",
    clip: "Your Clip",
    page: "page",
    location: "Location",
    dateFormats: [
      "EEEE, MMMM d, yyyy h:mm:ss a", // Friday, January 1, 2024 10:30:45 AM
      "EEEE, d MMMM yyyy HH:mm:ss", // Friday, 1 January 2024 10:30:45
      "EEEE, MMMM d, yyyy, h:mm a", // Friday, January 1, 2024, 10:30 AM
    ],
  },
  es: {
    addedOn: "Añadido el",
    highlight: "Tu subrayado",
    note: "Tu nota",
    bookmark: "Tu marcador",
    clip: "Tu recorte",
    page: "página",
    location: "posición",
    dateFormats: [
      "EEEE, d 'de' MMMM 'de' yyyy H:mm:ss", // viernes, 1 de enero de 2024 10:30:45
      "EEEE d 'de' MMMM 'de' yyyy H:mm:ss",
    ],
  },
  pt: {
    addedOn: "Adicionado em",
    highlight: "Seu destaque",
    note: "Sua nota",
    bookmark: "Seu marcador",
    clip: "Seu recorte",
    page: "página",
    location: "posição",
    dateFormats: [
      "EEEE, d 'de' MMMM 'de' yyyy HH:mm:ss", // sexta-feira, 1 de janeiro de 2024 10:30:45
    ],
  },
  de: {
    addedOn: "Hinzugefügt am",
    highlight: "Ihre Markierung",
    note: "Ihre Notiz",
    bookmark: "Ihr Lesezeichen",
    clip: "Ihr Ausschnitt",
    page: "Seite",
    location: "Position",
    dateFormats: [
      "EEEE, d. MMMM yyyy HH:mm:ss", // Freitag, 1. Januar 2024 10:30:45
      "EEEE, d. MMMM yyyy 'um' HH:mm:ss",
    ],
  },
  fr: {
    addedOn: "Ajouté le",
    highlight: "Votre surlignage",
    note: "Votre note",
    bookmark: "Votre signet",
    clip: "Votre extrait",
    page: "page",
    location: "emplacement",
    dateFormats: [
      "EEEE d MMMM yyyy HH:mm:ss", // vendredi 1 janvier 2024 10:30:45
      "EEEE d MMMM yyyy 'à' HH:mm:ss",
    ],
  },
  it: {
    addedOn: "Aggiunto il",
    highlight: "La tua evidenziazione",
    note: "La tua nota",
    bookmark: "Il tuo segnalibro",
    clip: "Il tuo ritaglio",
    page: "pagina",
    location: "posizione",
    dateFormats: [
      "EEEE d MMMM yyyy HH:mm:ss", // venerdì 1 gennaio 2024 10:30:45
    ],
  },
  zh: {
    addedOn: "添加于",
    highlight: "您的标注",
    note: "您的笔记",
    bookmark: "您的书签",
    clip: "您的剪贴",
    page: "页",
    location: "位置",
    dateFormats: [
      "yyyy年M月d日EEEE ahh:mm:ss", // 2024年1月1日星期五 上午10:30:45
      "yyyy年M月d日EEEE H:mm:ss",
    ],
  },
  ja: {
    addedOn: "追加日",
    highlight: "ハイライト",
    note: "メモ",
    bookmark: "ブックマーク",
    clip: "クリップ",
    page: "ページ",
    location: "位置",
    dateFormats: [
      "yyyy年M月d日EEEE H:mm:ss", // 2024年1月1日金曜日 10:30:45
    ],
  },
  ko: {
    addedOn: "추가됨",
    highlight: "하이라이트",
    note: "메모",
    bookmark: "북마크",
    clip: "클립",
    page: "페이지",
    location: "위치",
    dateFormats: [
      "yyyy년 M월 d일 EEEE a h:mm:ss", // 2024년 1월 1일 금요일 오전 10:30:45
    ],
  },
  nl: {
    addedOn: "Toegevoegd op",
    highlight: "Uw markering",
    note: "Uw notitie",
    bookmark: "Uw bladwijzer",
    clip: "Uw knipsel",
    page: "pagina",
    location: "locatie",
    dateFormats: [
      "EEEE d MMMM yyyy HH:mm:ss", // vrijdag 1 januari 2024 10:30:45
    ],
  },
  ru: {
    addedOn: "Добавлено",
    highlight: "Ваше выделение",
    note: "Ваша заметка",
    bookmark: "Ваша закладка",
    clip: "Ваша вырезка",
    page: "страница",
    location: "позиция",
    dateFormats: [
      "EEEE, d MMMM yyyy 'г.' H:mm:ss", // пятница, 1 января 2024 г. 10:30:45
    ],
  },
};

/**
 * Regular expression patterns for parsing.
 */
export const PATTERNS = {
  /** Separator between clippings (10 or more equals signs) */
  SEPARATOR: /={10,}/,

  /** Separator with surrounding newlines */
  SEPARATOR_WITH_NEWLINES: /\r?\n={10,}\r?\n/,

  /** Byte Order Mark (BOM) at start of file */
  BOM: /^\uFEFF/,

  /** Extract title and author: "Title (Author)" */
  TITLE_AUTHOR: /^(.+?)\s*\(([^)]+)\)\s*$/,

  /** Sideloaded book extensions */
  SIDELOAD_EXTENSIONS: /\.(pdf|epub|mobi|azw3?|txt|doc|docx|html|fb2|rtf)$/i,

  /** Amazon _EBOK suffix */
  EBOK_SUFFIX: /_EBOK$/i,

  /** Location range (e.g., "123-456") */
  LOCATION_RANGE: /(\d+)-(\d+)/,

  /** Single location (e.g., "123") */
  LOCATION_SINGLE: /(\d+)/,

  /** Page number */
  PAGE_NUMBER: /\d+/,

  /** Multiple consecutive spaces */
  MULTIPLE_SPACES: /\s{2,}/g,

  /** Control characters to remove (U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F) */
  CONTROL_CHARS: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,

  /** Non-breaking space */
  NBSP: /\u00A0/g,

  /** Zero-width characters (ZWS, ZWNJ, ZWJ, BOM) */
  ZERO_WIDTH: /(?:\u200B|\u200C|\u200D|\uFEFF)/g,
} as const;

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
