/**
 * Template-related type definitions.
 *
 * @packageDocumentation
 */

/**
 * Available template presets.
 */
export type TemplatePreset =
  | "default"
  | "minimal"
  | "obsidian"
  | "notion"
  | "academic"
  | "compact"
  | "verbose";

/**
 * Template preset collections.
 */
export interface TemplateCollection {
  clipping: string;
  book: string;
  export: string;
}

/**
 * User-provided custom templates.
 */
export interface CustomTemplates {
  /** Template for a single clipping */
  clipping?: string;
  /** Template for a book (collection of clippings) */
  book?: string;
  /** Template for full export */
  export?: string;
}

/**
 * Available template types.
 */
export type TemplateType = "clipping" | "book" | "export";
