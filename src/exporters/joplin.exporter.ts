/**
 * Joplin Exporter for Kindle clippings.
 *
 * Generates JEX (Joplin Export) format which is essentially a tar archive
 * containing markdown files with specific metadata.
 *
 * Features:
 * - Deterministic IDs for idempotent imports
 * - Proper Joplin metadata (created_time, updated_time, etc.)
 * - Notebook organization by book
 * - Tag support
 *
 * @packageDocumentation
 */

import type { Clipping } from "../types/clipping.js";
import type { ExportedFile, Exporter, ExporterOptions, ExportResult } from "../types/exporter.js";
import { sha256Sync } from "../utils/hashing.js";
import { getPageInfo } from "../utils/page-utils.js";
import { groupByBook } from "../utils/stats.js";

/**
 * Extended options for Joplin export.
 */
export interface JoplinExporterOptions extends ExporterOptions {
  /** Root notebook name (default: "Kindle Highlights") */
  notebookName?: string;
  /** Add tags to notes */
  tags?: string[];
  /** Creator name for metadata */
  creator?: string;
  /**
   * Estimate page numbers from Kindle locations when not available.
   * Uses ~16 locations per page as a heuristic.
   * Estimated pages are prefixed with ~ (default: true)
   */
  estimatePages?: boolean;
}

/**
 * Joplin note metadata structure.
 */
interface JoplinNote {
  id: string;
  parent_id: string;
  title: string;
  body: string;
  created_time: number;
  updated_time: number;
  is_todo: number;
  todo_completed: number;
  source: string;
  source_url: string;
  source_application: string;
  order: number;
  user_created_time: number;
  user_updated_time: number;
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
 * Export clippings to Joplin JEX format.
 *
 * JEX format is a collection of markdown files with metadata headers.
 * This exporter generates the raw files; actual tar packaging should be
 * done by the consuming application or CLI.
 */
export class JoplinExporter implements Exporter {
  name = "joplin";
  extension = ".jex";

  private static readonly SOURCE_APP = "kindle-tools-ts";
  private static readonly TYPE_NOTE = 1;
  private static readonly TYPE_FOLDER = 2;
  private static readonly TYPE_TAG = 5;
  private static readonly TYPE_NOTE_TAG = 6;

  /**
   * Export clippings to Joplin format.
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with JEX files
   */
  async export(clippings: Clipping[], options?: JoplinExporterOptions): Promise<ExportResult> {
    try {
      const files: ExportedFile[] = [];
      const now = Date.now();
      const rootNotebookName = options?.notebookName ?? "Kindle Highlights";
      const tags = options?.tags ?? ["kindle"];

      // Generate deterministic IDs
      const rootNotebookId = this.generateId("notebook", rootNotebookName);
      const grouped = groupByBook(clippings);

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

      // Create tags and track their IDs
      const tagMap = new Map<string, string>();
      for (const tagName of tags) {
        const tagId = this.generateId("tag", tagName);
        tagMap.set(tagName, tagId);

        const tag: JoplinTag = {
          id: tagId,
          title: tagName,
          created_time: now,
          updated_time: now,
          type_: JoplinExporter.TYPE_TAG,
        };
        files.push({
          path: `${tagId}.md`,
          content: this.serializeTag(tag),
        });
      }

      let orderCounter = 0;

      // Create a notebook and notes for each book
      for (const [title, bookClippings] of grouped) {
        const first = bookClippings[0];
        if (!first) continue;

        // Create book notebook (child of root)
        const bookNotebookId = this.generateId("notebook", `${rootNotebookName}/${title}`);
        const bookNotebook: JoplinNotebook = {
          id: bookNotebookId,
          parent_id: rootNotebookId,
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
        for (const clipping of bookClippings) {
          const noteId = this.generateId("note", clipping.id);
          const estimatePages = options?.estimatePages ?? true;
          const noteTitle = this.generateNoteTitle(clipping, estimatePages);
          const noteBody = this.generateNoteBody(clipping, options);

          const clippingDate = clipping.date?.getTime() ?? now;

          const note: JoplinNote = {
            id: noteId,
            parent_id: bookNotebookId,
            title: noteTitle,
            body: noteBody,
            created_time: clippingDate,
            updated_time: now,
            is_todo: 0,
            todo_completed: 0,
            source: "kindle",
            source_url: "",
            source_application: JoplinExporter.SOURCE_APP,
            order: orderCounter++,
            user_created_time: clippingDate,
            user_updated_time: now,
            type_: JoplinExporter.TYPE_NOTE,
          };
          files.push({
            path: `${noteId}.md`,
            content: this.serializeNote(note),
          });

          // Create note-tag associations
          for (const tagName of tags) {
            const tagId = tagMap.get(tagName);
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
      }

      // Combined output for single-string representation
      const output = files.map((f) => `# ${f.path}\n${f.content}`).join("\n\n---\n\n");

      return {
        success: true,
        output,
        files,
      };
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Generate a deterministic ID for Joplin entities.
   */
  private generateId(type: string, content: string): string {
    const input = `${type}:${content.toLowerCase().trim()}`;
    const hash = sha256Sync(input);
    // Joplin uses 32-character hex IDs
    return hash.slice(0, 32);
  }

  /**
   * Generate a title for the note based on clipping type.
   */
  private generateNoteTitle(clipping: Clipping, estimatePages = true): string {
    const pageInfo = getPageInfo(clipping.page, clipping.location, estimatePages);
    const typeEmoji = clipping.type === "highlight" ? "📖" : clipping.type === "note" ? "📝" : "🔖";
    const preview = clipping.content.slice(0, 50).replace(/\n/g, " ");
    const ellipsis = clipping.content.length > 50 ? "..." : "";

    return `${pageInfo.formatted} ${typeEmoji} ${preview}${ellipsis}`;
  }

  /**
   * Generate the body content for a Joplin note.
   */
  private generateNoteBody(clipping: Clipping, options?: JoplinExporterOptions): string {
    const lines: string[] = [];

    // Metadata section
    lines.push(`**Book:** ${clipping.title}`);
    lines.push(`**Author:** ${clipping.author}`);
    lines.push(`**Type:** ${clipping.type}`);
    lines.push(`**Page:** ${clipping.page ?? "N/A"}`);
    lines.push(`**Location:** ${clipping.location.raw}`);

    if (clipping.date) {
      lines.push(`**Date:** ${clipping.date.toISOString()}`);
    }

    lines.push("");
    lines.push("---");
    lines.push("");

    // Content
    if (clipping.type === "highlight") {
      lines.push(`> ${clipping.content.replace(/\n/g, "\n> ")}`);
    } else if (clipping.type === "note") {
      lines.push(clipping.content);
    } else if (clipping.type === "bookmark") {
      lines.push(`*Bookmark at Location ${clipping.location.raw}*`);
    }

    // Linked note
    if (clipping.note) {
      lines.push("");
      lines.push("### My Note");
      lines.push("");
      lines.push(clipping.note);
    }

    // Creator info
    if (options?.creator) {
      lines.push("");
      lines.push("---");
      lines.push("");
      lines.push(`*Exported by ${options.creator}*`);
    }

    return lines.join("\n");
  }

  /**
   * Serialize a Joplin note to its file format.
   */
  private serializeNote(note: JoplinNote): string {
    const lines: string[] = [];

    // Title comes first in Joplin format
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
    lines.push(`order: ${note.order}`);
    lines.push(`user_created_time: ${this.formatTimestamp(note.user_created_time)}`);
    lines.push(`user_updated_time: ${this.formatTimestamp(note.user_updated_time)}`);
    lines.push(`type_: ${note.type_}`);

    return lines.join("\n");
  }

  /**
   * Serialize a Joplin notebook to its file format.
   */
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

  /**
   * Serialize a Joplin tag to its file format.
   */
  private serializeTag(tag: JoplinTag): string {
    const lines: string[] = [];

    lines.push(tag.title);
    lines.push("");
    lines.push(`id: ${tag.id}`);
    lines.push(`created_time: ${this.formatTimestamp(tag.created_time)}`);
    lines.push(`updated_time: ${this.formatTimestamp(tag.updated_time)}`);
    lines.push(`type_: ${tag.type_}`);

    return lines.join("\n");
  }

  /**
   * Serialize a Joplin note-tag association to its file format.
   */
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

  /**
   * Format a timestamp for Joplin (ISO 8601).
   */
  private formatTimestamp(ms: number): string {
    return new Date(ms).toISOString();
  }
}
