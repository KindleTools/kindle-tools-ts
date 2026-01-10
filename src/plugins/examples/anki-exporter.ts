/**
 * Anki Exporter Plugin Example.
 *
 * This module demonstrates how to create an exporter plugin for KindleTools.
 * It exports clippings to Anki-compatible TSV format for flashcard creation.
 *
 * ## Anki TSV Format
 *
 * The exported file follows Anki's TSV import specification:
 * - UTF-8 encoding
 * - Tab-separated fields
 * - One note per line
 * - Optional header comments for configuration
 *
 * ## Card Structure
 *
 * Each highlight becomes a flashcard with:
 * - **Front**: Book title and author
 * - **Back**: The highlighted content
 * - **Tags**: Book-based tags for organization
 *
 * @example
 * ```typescript
 * import { pluginRegistry, type ExporterPlugin } from 'kindle-tools-ts/plugins';
 * import { ankiExporterPlugin, AnkiExporter } from 'kindle-tools-ts/plugins/examples';
 *
 * // Register the plugin
 * pluginRegistry.registerExporter(ankiExporterPlugin);
 *
 * // Or use directly
 * const exporter = new AnkiExporter();
 * const result = await exporter.export(clippings, { cardStyle: 'cloze' });
 * ```
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import { type ExportResult, exportNoClippings, exportSuccess, exportUnknownError } from "#errors";
import type { ExporterInstance, ExporterPlugin } from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Anki card style options.
 */
export type AnkiCardStyle = "basic" | "cloze" | "reversed";

/**
 * Options specific to the Anki exporter.
 */
export interface AnkiExporterOptions {
  /**
   * Card style to use.
   * - 'basic': Front (question) → Back (answer)
   * - 'cloze': Cloze deletion format
   * - 'reversed': Creates both forward and reverse cards
   * @default 'basic'
   */
  cardStyle?: AnkiCardStyle;

  /**
   * Deck name for imported cards.
   * @default 'Kindle Highlights'
   */
  deckName?: string;

  /**
   * Note type name in Anki.
   * @default 'Basic'
   */
  noteType?: string;

  /**
   * Include book author in the front of the card.
   * @default true
   */
  includeAuthor?: boolean;

  /**
   * Include location information in the card.
   * @default false
   */
  includeLocation?: boolean;

  /**
   * Tag prefix for book-based tags.
   * @default 'book::'
   */
  tagPrefix?: string;

  /**
   * Include HTML formatting in cards.
   * @default true
   */
  htmlEnabled?: boolean;

  /**
   * Export only highlights (skip notes and bookmarks).
   * @default true
   */
  highlightsOnly?: boolean;
}

// =============================================================================
// Anki Exporter Implementation
// =============================================================================

/**
 * Anki exporter - exports clippings to Anki-compatible TSV format.
 */
export class AnkiExporter implements ExporterInstance {
  readonly name = "Anki Exporter";
  readonly extension = ".txt";

  /**
   * Export clippings to Anki TSV format.
   */
  async export(clippings: Clipping[], options?: AnkiExporterOptions): Promise<ExportResult> {
    try {
      // Apply defaults
      const opts: Required<AnkiExporterOptions> = {
        cardStyle: options?.cardStyle ?? "basic",
        deckName: options?.deckName ?? "Kindle Highlights",
        noteType: options?.noteType ?? "Basic",
        includeAuthor: options?.includeAuthor ?? true,
        includeLocation: options?.includeLocation ?? false,
        tagPrefix: options?.tagPrefix ?? "book::",
        htmlEnabled: options?.htmlEnabled ?? true,
        highlightsOnly: options?.highlightsOnly ?? true,
      };

      // Filter clippings if needed
      const filtered = opts.highlightsOnly
        ? clippings.filter((c) => c.type === "highlight")
        : clippings;

      if (filtered.length === 0) {
        return exportNoClippings();
      }

      // Build TSV content
      const lines: string[] = [];

      // Add Anki header comments (Anki 2.1.54+)
      lines.push("#separator:tab");
      lines.push(`#html:${opts.htmlEnabled}`);
      lines.push(`#deck:${opts.deckName}`);
      lines.push(`#notetype:${opts.noteType}`);
      lines.push("#tags column:3");

      // Add cards
      for (const clip of filtered) {
        const card = this.createCard(clip, opts);
        if (card) {
          lines.push(card);
        }
      }

      const output = lines.join("\n");
      return exportSuccess(output);
    } catch (error) {
      return exportUnknownError(error);
    }
  }

  /**
   * Create a single Anki card line from a clipping.
   */
  private createCard(clip: Clipping, opts: Required<AnkiExporterOptions>): string | null {
    if (!clip.content?.trim()) {
      return null;
    }

    const front = this.createFront(clip, opts);
    const back = this.createBack(clip, opts);
    const tags = this.createTags(clip, opts);

    // Escape fields for TSV
    const escapedFront = this.escapeField(front);
    const escapedBack = this.escapeField(back);
    const escapedTags = this.escapeField(tags);

    return `${escapedFront}\t${escapedBack}\t${escapedTags}`;
  }

  /**
   * Create the front of the card (question side).
   */
  private createFront(clip: Clipping, opts: Required<AnkiExporterOptions>): string {
    const title = clip.title || "Unknown Book";
    const author = clip.author || "Unknown Author";

    if (opts.htmlEnabled) {
      let front = `<b>${this.escapeHtml(title)}</b>`;
      if (opts.includeAuthor) {
        front += `<br><i>${this.escapeHtml(author)}</i>`;
      }
      if (opts.includeLocation && clip.location) {
        const locStr =
          typeof clip.location === "object"
            ? `${clip.location.start}-${clip.location.end}`
            : String(clip.location);
        front += `<br><small>Location: ${locStr}</small>`;
      }
      return front;
    }

    let front = title;
    if (opts.includeAuthor) {
      front += ` — ${author}`;
    }
    return front;
  }

  /**
   * Create the back of the card (answer side).
   */
  private createBack(clip: Clipping, opts: Required<AnkiExporterOptions>): string {
    const content = clip.content || "";

    if (opts.cardStyle === "cloze") {
      // Wrap first sentence in cloze deletion
      const sentences = content.split(/(?<=[.!?])\s+/);
      if (sentences[0]) {
        return `{{c1::${sentences[0]}}}${sentences.length > 1 ? ` ${sentences.slice(1).join(" ")}` : ""}`;
      }
    }

    if (opts.htmlEnabled) {
      return `<p>${this.escapeHtml(content)}</p>`;
    }

    return content;
  }

  /**
   * Create tags for the card.
   */
  private createTags(clip: Clipping, opts: Required<AnkiExporterOptions>): string {
    const tags: string[] = [];

    // Book tag
    if (clip.title) {
      const sanitizedTitle = this.sanitizeTag(clip.title);
      tags.push(`${opts.tagPrefix}${sanitizedTitle}`);
    }

    // Author tag
    if (clip.author) {
      const sanitizedAuthor = this.sanitizeTag(clip.author);
      tags.push(`author::${sanitizedAuthor}`);
    }

    // Include existing tags from clipping
    if (clip.tags && clip.tags.length > 0) {
      tags.push(...clip.tags.map((t) => this.sanitizeTag(t)));
    }

    return tags.join(" ");
  }

  /**
   * Sanitize a string for use as an Anki tag.
   * Anki tags cannot contain spaces.
   */
  private sanitizeTag(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9-]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Escape a field for TSV format.
   * If the field contains tabs, newlines, or quotes, wrap in quotes.
   */
  private escapeField(value: string): string {
    if (!value) return "";

    // If field contains special characters, wrap in quotes
    if (/[\t\n\r"]/.test(value)) {
      // Escape internal quotes by doubling them
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    return value;
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

// =============================================================================
// Plugin Definition
// =============================================================================

/**
 * Anki exporter plugin ready for registration.
 *
 * @example
 * ```typescript
 * import { pluginRegistry } from 'kindle-tools-ts/plugins';
 * import { ankiExporterPlugin } from 'kindle-tools-ts/plugins/examples';
 *
 * pluginRegistry.registerExporter(ankiExporterPlugin);
 * ```
 */
export const ankiExporterPlugin: ExporterPlugin = {
  name: "anki-exporter",
  version: "1.0.0",
  format: "anki",
  aliases: ["anki-tsv", "flashcards"],
  description: "Export Kindle highlights to Anki-compatible TSV format for flashcard creation",
  author: "KindleTools",
  homepage: "https://github.com/KindleTools/kindle-tools-ts",
  create: () => new AnkiExporter(),
};
