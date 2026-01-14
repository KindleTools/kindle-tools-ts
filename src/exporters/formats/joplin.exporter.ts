/**
 * Joplin Exporter for Kindle clippings.
 *
 * Generates JEX (Joplin Export) format which is essentially a tar archive
 * containing markdown files with specific metadata.
 *
 * Features:
 * - Deterministic IDs for idempotent imports
 * - Proper Joplin metadata (created_time, updated_time, etc.)
 * - Notebook organization by book/author
 * - Tag support with note-tag associations
 * - Geolocation support (latitude, longitude, altitude)
 * - Configurable author field for creator attribution
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import type { GeoLocation } from "#app-types/geo.js";
import { formatPage, getEffectivePage } from "#domain/core/locations.js";
import type { TemplateEngine, TemplatePreset } from "#templates/index.js";
import { sha256Sync } from "#utils/security/hashing.js";
import { PROCESSING_THRESHOLDS } from "../../domain/rules.js";
import type { ExportedFile } from "../core/types.js";
import { MultiFileExporter, type MultiFileExporterOptions } from "../shared/multi-file-exporter.js";

// ============================================================================
// Constants
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/**
 * Extended options for Joplin export.
 * Extends ExporterOptionsParsed with Joplin-specific options.
 */
export interface JoplinExporterOptions extends MultiFileExporterOptions {
  /** Root notebook name (default: "Kindle Highlights") */
  notebookName?: string | undefined;

  /** Add tags to notes (default: []) */
  tags?: string[];

  /**
   * Estimate page numbers from Kindle locations when not available.
   * Uses ~16.69 locations per page as a heuristic.
   * Default: true
   */
  estimatePages?: boolean;

  /**
   * Geographic location where the reading took place.
   * If provided, latitude/longitude/altitude will be added to each note.
   * Useful for personal knowledge management.
   *
   * @example
   * { latitude: 40.7128, longitude: -74.0060, altitude: 10 }
   */
  geoLocation?: GeoLocation;
}

/**
 * Joplin note metadata structure (complete fields).
 */
interface JoplinNote {
  id: string;
  parent_id: string;
  title: string;
  body: string;
  created_time: number;
  updated_time: number;
  user_created_time: number;
  user_updated_time: number;
  is_todo: number;
  todo_completed: number;
  source: string;
  source_url: string;
  source_application: string;
  order: number;
  latitude: number;
  longitude: number;
  altitude: number;
  author: string;
  is_shared: number;
  encryption_applied: number;
  markup_language: number;
  type_: number;
}

/**
 * Joplin notebook metadata structure.
 */
interface JoplinNotebook {
  id: string;
  parent_id: string;
  title: string;
  created_time: number;
  updated_time: number;
  type_: number;
}

/**
 * Joplin tag structure.
 */
interface JoplinTag {
  id: string;
  title: string;
  parent_id: string;
  created_time: number;
  updated_time: number;
  type_: number;
}

/**
 * Joplin note-tag association.
 */
interface JoplinNoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  created_time: number;
  updated_time: number;
  type_: number;
}

/**
 * Ephemeral context for a single export operation.
 * Replaces mutable class state for stateless exports.
 */
interface JoplinExportContext {
  rootNotebookId: string;
  rootNotebookName: string;
  authorNotebookIds: Map<string, string>;
  tagMap: Map<string, string>;
  orderCounter: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Exporter
// ============================================================================

/**
 * Export clippings to Joplin JEX format.
 *
 * JEX format is a collection of markdown files with metadata headers.
 * This exporter generates the raw files; actual tar packaging should be
 * done by the consuming application or CLI.
 */
export class JoplinExporter extends MultiFileExporter {
  readonly name = "joplin";
  readonly extension = ".jex";

  private static readonly SOURCE = "kindle-to-jex";
  private static readonly SOURCE_APP = "kindle-tools-ts";
  private static readonly TYPE_NOTE = 1;
  private static readonly TYPE_FOLDER = 2;
  private static readonly TYPE_TAG = 5;
  private static readonly TYPE_NOTE_TAG = 6;
  private static readonly MARKUP_MARKDOWN = 1;

  // Ephemeral context for the current export operation (stateless pattern)
  private ctx: JoplinExportContext | null = null;

  protected override getDefaultPreset(): TemplatePreset {
    return "joplin";
  }

  /**
   * Initialize context and generate preamble files (root notebook, tags).
   * Now receives clippings to generate global tags upfront.
   */
  protected override async exportPreamble(
    clippings: Clipping[],
    options: JoplinExporterOptions,
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];
    const now = Date.now();

    // Initialize ephemeral context for this export
    const rootNotebookName = options.notebookName ?? this.DEFAULT_EXPORT_TITLE;
    const rootNotebookId = this.generateId("notebook", rootNotebookName);

    this.ctx = {
      rootNotebookId,
      rootNotebookName,
      authorNotebookIds: new Map(),
      tagMap: new Map(),
      orderCounter: 0,
    };

    // Create root notebook
    const rootNotebook: JoplinNotebook = {
      id: rootNotebookId,
      parent_id: "",
      title: rootNotebookName,
      created_time: now,
      updated_time: now,
      type_: JoplinExporter.TYPE_FOLDER,
    };
    files.push({
      path: `${rootNotebookId}.md`,
      content: this.serializeNotebook(rootNotebook),
    });

    // Generate all tags upfront (now possible since we have clippings)
    const defaultTags = options.tags ?? [];
    const includeClippingTags = options.includeClippingTags;
    const allTagNames = this.collectAllTags(clippings, defaultTags, includeClippingTags);

    for (const tagName of allTagNames) {
      const tagId = this.generateId("tag", tagName);
      this.ctx.tagMap.set(tagName, tagId);

      const tag: JoplinTag = {
        id: tagId,
        title: tagName,
        parent_id: "",
        created_time: now,
        updated_time: now,
        type_: JoplinExporter.TYPE_TAG,
      };
      files.push({
        path: `${tagId}.md`,
        content: this.serializeTag(tag),
      });
    }

    return files;
  }

  /**
   * Generate a lightweight summary instead of concatenating all content.
   * Prevents memory issues with large exports.
   */
  protected override generateSummaryContent(files: ExportedFile[]): string {
    // Count by type using type_ field in content
    let noteCount = 0;
    let notebookCount = 0;
    let tagCount = 0;
    let noteTagCount = 0;

    for (const file of files) {
      // Joplin files are always strings
      const content = file.content as string;
      if (content.includes("type_: 1")) noteCount++;
      else if (content.includes("type_: 2")) notebookCount++;
      else if (content.includes("type_: 5")) tagCount++;
      else if (content.includes("type_: 6")) noteTagCount++;
    }

    return [
      `Joplin Export Summary`,
      `=====================`,
      `Notes: ${noteCount}`,
      `Notebooks: ${notebookCount}`,
      `Tags: ${tagCount}`,
      `Note-Tag associations: ${noteTagCount}`,
      `Total files: ${files.length}`,
    ].join("\n");
  }

  /**
   * Process a single book: create notebooks and notes.
   */
  protected override async processBook(
    clippings: Clipping[],
    options: JoplinExporterOptions,
    engine: TemplateEngine,
  ): Promise<ExportedFile[]> {
    const first = clippings[0];
    if (!first || !this.ctx) return [];

    const { ctx } = this;
    const files: ExportedFile[] = [];
    const now = Date.now();
    const folderStructure = options.folderStructure;
    const authorCase = options.authorCase;
    const estimatePages = options.estimatePages ?? true;
    const creator = options.creator ?? "";
    const geoLocation = options.geoLocation ?? { latitude: 0, longitude: 0, altitude: 0 };

    // Determine hierarchy
    const useAuthorLevel = folderStructure === "by-author" || folderStructure === "by-author-book";
    let parentNotebookId = ctx.rootNotebookId;

    // Create author notebook
    if (useAuthorLevel) {
      const authorName = this.applyCase(first.author || this.DEFAULT_UNKNOWN_AUTHOR, authorCase);
      let authorNotebookId = ctx.authorNotebookIds.get(authorName);

      if (!authorNotebookId) {
        authorNotebookId = this.generateId("notebook", `${ctx.rootNotebookName}/${authorName}`);
        ctx.authorNotebookIds.set(authorName, authorNotebookId);

        const authorNotebook: JoplinNotebook = {
          id: authorNotebookId,
          parent_id: ctx.rootNotebookId,
          title: authorName,
          created_time: now,
          updated_time: now,
          type_: JoplinExporter.TYPE_FOLDER,
        };
        files.push({
          path: `${authorNotebookId}.md`,
          content: this.serializeNotebook(authorNotebook),
        });
      }
      parentNotebookId = authorNotebookId;
    }

    // Create book notebook
    const bookNotebookPath = useAuthorLevel
      ? `${ctx.rootNotebookName}/${first.author}/${first.title}`
      : `${ctx.rootNotebookName}/${first.title}`;

    const bookNotebookId = this.generateId("notebook", bookNotebookPath);
    const bookNotebook: JoplinNotebook = {
      id: bookNotebookId,
      parent_id: parentNotebookId,
      title: first.title,
      created_time: now,
      updated_time: now,
      type_: JoplinExporter.TYPE_FOLDER,
    };
    files.push({
      path: `${bookNotebookId}.md`,
      content: this.serializeNotebook(bookNotebook),
    });

    // Create notes for each clipping
    for (const clipping of clippings) {
      const noteId = this.generateId("note", clipping.id);
      const noteTitle = this.generateNoteTitle(clipping, estimatePages);
      const noteBody = engine.renderClipping(clipping);
      const clippingDate = clipping.date?.getTime() ?? now;

      const note: JoplinNote = {
        id: noteId,
        parent_id: bookNotebookId,
        title: noteTitle,
        body: noteBody,
        created_time: clippingDate,
        updated_time: now,
        user_created_time: clippingDate,
        user_updated_time: now,
        is_todo: 0,
        todo_completed: 0,
        source: JoplinExporter.SOURCE,
        source_url: "",
        source_application: JoplinExporter.SOURCE_APP,
        order: ctx.orderCounter++,
        latitude: geoLocation.latitude ?? 0,
        longitude: geoLocation.longitude ?? 0,
        altitude: geoLocation.altitude ?? 0,
        author: creator,
        is_shared: 0,
        encryption_applied: 0,
        markup_language: JoplinExporter.MARKUP_MARKDOWN,
        type_: JoplinExporter.TYPE_NOTE,
      };

      files.push({
        path: `${noteId}.md`,
        content: this.serializeNote(note),
      });

      // Note-tag associations
      const defaultTags = options.tags ?? [];
      const includeClippingTags = options.includeClippingTags;
      const noteTags = new Set<string>(defaultTags);
      if (includeClippingTags && clipping.tags) {
        for (const tag of clipping.tags) noteTags.add(tag);
      }

      for (const tagName of noteTags) {
        const tagId = ctx.tagMap.get(tagName);
        if (!tagId) continue;

        const noteTagId = this.generateId("note-tag", `${noteId}-${tagId}`);
        const noteTag: JoplinNoteTag = {
          id: noteTagId,
          note_id: noteId,
          tag_id: tagId,
          created_time: now,
          updated_time: now,
          type_: JoplinExporter.TYPE_NOTE_TAG,
        };
        files.push({
          path: `${noteTagId}.md`,
          content: this.serializeNoteTag(noteTag),
        });
      }
    }

    return files;
  }

  // ... keep existing private methods ...
  /**
   * Generate a deterministic ID for Joplin entities.
   * Uses MD5-equivalent length (32 chars) for compatibility with Python version.
   */
  private generateId(type: string, content: string): string {
    const input = `${type}:${content.toLowerCase().trim()}`;
    const hash = sha256Sync(input);
    // Joplin uses 32-character hex IDs
    return hash.slice(0, 32);
  }

  /**
   * Generate a title for the note.
   * Format: "[0042] snippet..." (Python-compatible, no emojis)
   */
  private generateNoteTitle(clipping: Clipping, estimate = true): string {
    const preview = clipping.content
      .slice(0, PROCESSING_THRESHOLDS.PREVIEW_CONTENT_LENGTH)
      .replace(/\n/g, " ");

    let pageNum = 0;
    if (clipping.page !== null) {
      pageNum = clipping.page;
    } else if (estimate && clipping.location.start > 0) {
      pageNum = getEffectivePage(null, clipping.location);
    }

    const ref = pageNum > 0 ? formatPage(pageNum) : "";
    return ref ? `${ref} ${preview}` : preview;
  }

  private serializeNote(note: JoplinNote): string {
    const lines: string[] = [];
    lines.push(note.title);
    lines.push("");
    lines.push(note.body);
    lines.push("");
    lines.push(`id: ${note.id}`);
    lines.push(`parent_id: ${note.parent_id}`);
    lines.push(`created_time: ${this.formatTimestamp(note.created_time)}`);
    lines.push(`updated_time: ${this.formatTimestamp(note.updated_time)}`);
    lines.push(`is_todo: ${note.is_todo}`);
    lines.push(`todo_completed: ${note.todo_completed}`);
    lines.push(`source: ${note.source}`);
    lines.push(`source_url: ${note.source_url}`);
    lines.push(`source_application: ${note.source_application}`);
    lines.push(`latitude: ${note.latitude.toFixed(8)}`);
    lines.push(`longitude: ${note.longitude.toFixed(8)}`);
    lines.push(`altitude: ${note.altitude.toFixed(4)}`);
    lines.push(`author: ${note.author}`);
    lines.push(`order: ${note.order}`);
    lines.push(`user_created_time: ${this.formatTimestamp(note.user_created_time)}`);
    lines.push(`user_updated_time: ${this.formatTimestamp(note.user_updated_time)}`);
    lines.push(`is_shared: ${note.is_shared}`);
    lines.push(`encryption_applied: ${note.encryption_applied}`);
    lines.push(`markup_language: ${note.markup_language}`);
    lines.push(`type_: ${note.type_}`);
    return lines.join("\n");
  }

  private serializeNotebook(notebook: JoplinNotebook): string {
    const lines: string[] = [];
    lines.push(notebook.title);
    lines.push("");
    lines.push(`id: ${notebook.id}`);
    lines.push(`parent_id: ${notebook.parent_id}`);
    lines.push(`created_time: ${this.formatTimestamp(notebook.created_time)}`);
    lines.push(`updated_time: ${this.formatTimestamp(notebook.updated_time)}`);
    lines.push(`type_: ${notebook.type_}`);
    return lines.join("\n");
  }

  private serializeTag(tag: JoplinTag): string {
    const lines: string[] = [];
    lines.push(tag.title);
    lines.push("");
    lines.push(`id: ${tag.id}`);
    lines.push(`parent_id: ${tag.parent_id}`);
    lines.push(`created_time: ${this.formatTimestamp(tag.created_time)}`);
    lines.push(`updated_time: ${this.formatTimestamp(tag.updated_time)}`);
    lines.push(`type_: ${tag.type_}`);
    return lines.join("\n");
  }

  private serializeNoteTag(noteTag: JoplinNoteTag): string {
    const lines: string[] = [];
    lines.push(`id: ${noteTag.id}`);
    lines.push(`note_id: ${noteTag.note_id}`);
    lines.push(`tag_id: ${noteTag.tag_id}`);
    lines.push(`created_time: ${this.formatTimestamp(noteTag.created_time)}`);
    lines.push(`updated_time: ${this.formatTimestamp(noteTag.updated_time)}`);
    lines.push(`type_: ${noteTag.type_}`);
    return lines.join("\n");
  }

  private formatTimestamp(ms: number): string {
    return new Date(ms).toISOString();
  }
}
