/**
 * Language definitions and patterns for Kindle clippings.
 *
 * Defines supported languages and their specific parsing markers
 * (headers, date formats, etc).
 *
 * @packageDocumentation
 */

import type { LanguagePatterns, SupportedLanguage } from "#app-types/language.js";

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
    highlight: "subrayado", // Works with both "Tu subrayado" and "La subrayado"
    note: "nota", // Works with both "Tu nota" and "La nota"
    bookmark: "marcador", // Works with both "Tu marcador" and "El marcador"
    clip: "recorte", // Works with both "Tu recorte" and "El recorte"
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
