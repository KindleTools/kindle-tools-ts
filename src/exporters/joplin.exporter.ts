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

import type { Clipping } from "@app-types/clipping.js";
import { formatDateHuman } from "@utils/dates.js";
import type { GeoLocation } from "@utils/geo-location.js";
import { sha256Sync } from "@utils/hashing.js";
import { formatPage, getEffectivePage } from "@utils/page-utils.js";
import { groupByBook } from "@utils/stats.js";
import type {
  AuthorCase,
  ExportedFile,
  ExporterOptions,
  ExportResult,
  FolderStructure,
} from "./index.js";
import { BaseExporter } from "./shared/index.js";

// ============================================================================
// Constants
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/**
 * Extended options for Joplin export.
 */
export interface JoplinExporterOptions extends ExporterOptions {
  /** Root notebook name (default: "Kindle Highlights") */
  notebookName?: string;

  /** Add tags to notes (default: []) */
  tags?: string[];

  /**
   * Creator/author name for note metadata.
   * This appears in the note body as attribution.
   * Example: "John Doe" -> "- author: John Doe"
   */
  creator?: string;

  /**
   * Estimate page numbers from Kindle locations when not available.
   * Uses ~16.69 locations per page as a heuristic.
   * Default: true
   */
  estimatePages?: boolean;

  /**
   * Folder structure for notebooks.
   * - 'flat': Root > Book
   * - 'by-author': Root > Author > Book (default, 3-level hierarchy)
   * - 'by-author-book': Same as 'by-author'
   * Note: 'by-book' behaves like 'flat' for Joplin.
   */
  folderStructure?: FolderStructure;

  /**
   * Case transformation for author notebook names.
   * - 'original': Keep original case
   * - 'uppercase': Convert to UPPERCASE (default, like Python version)
   * - 'lowercase': Convert to lowercase
   */
  authorCase?: AuthorCase;

  /**
   * Include clipping tags as Joplin tags.
   * Tags are merged with default tags. (default: true)
   */
  includeClippingTags?: boolean;

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
export class JoplinExporter extends BaseExporter {
  readonly name = "joplin";
  readonly extension = ".jex";

  private static readonly SOURCE = "kindle-to-jex";
  private static readonly SOURCE_APP = "kindle-tools-ts";
  private static readonly TYPE_NOTE = 1;
  private static readonly TYPE_FOLDER = 2;
  private static readonly TYPE_TAG = 5;
  private static readonly TYPE_NOTE_TAG = 6;
  private static readonly MARKUP_MARKDOWN = 1;

  /**
   * Export clippings to Joplin format.
   *
   * @param clippings - Clippings to export
   * @param options - Export options
   * @returns Export result with JEX files
   */
  protected async doExport(
    clippings: Clipping[],
    options?: JoplinExporterOptions,
  ): Promise<ExportResult> {
    const files: ExportedFile[] = [];
    const now = Date.now();

    // Extract options with defaults
    const rootNotebookName = options?.notebookName ?? this.DEFAULT_EXPORT_TITLE;
    const defaultTags = options?.tags ?? [];
    const folderStructure = options?.folderStructure ?? "by-author";
    const authorCase = options?.authorCase ?? "uppercase"; // Python default
    const includeClippingTags = options?.includeClippingTags ?? true;
    const estimatePages = options?.estimatePages ?? true;
    const creator = options?.creator ?? "";
    const geoLocation = options?.geoLocation ?? { latitude: 0, longitude: 0, altitude: 0 };

    // Determine if we use 3-level hierarchy (Root > Author > Book)
    const useAuthorLevel = folderStructure === "by-author" || folderStructure === "by-author-book";

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

    // Collect all unique tags (default + clipping tags)
    const allTagNames = this.collectAllTags(clippings, defaultTags, includeClippingTags);

    // Create tags and track their IDs
    const tagMap = new Map<string, string>();
    for (const tagName of allTagNames) {
      const tagId = this.generateId("tag", tagName);
      tagMap.set(tagName, tagId);

      const tag: JoplinTag = {
        id: tagId,
        title: tagName,
        parent_id: "", // Tags don't have parents
        created_time: now,
        updated_time: now,
        type_: JoplinExporter.TYPE_TAG,
      };
      files.push({
        path: `${tagId}.md`,
        content: this.serializeTag(tag),
      });
    }

    // Track created author notebooks to avoid duplicates
    const authorNotebookIds = new Map<string, string>();

    let orderCounter = 0;

    // Create a notebook and notes for each book
    for (const [title, bookClippings] of grouped) {
      const first = bookClippings[0];
      if (!first) continue;

      let parentNotebookId = rootNotebookId;

      // Create author notebook if using 3-level hierarchy
      if (useAuthorLevel) {
        const authorName = this.applyCase(first.author || this.DEFAULT_UNKNOWN_AUTHOR, authorCase);
        let authorNotebookId = authorNotebookIds.get(authorName);

        if (!authorNotebookId) {
          authorNotebookId = this.generateId("notebook", `${rootNotebookName}/${authorName}`);
          authorNotebookIds.set(authorName, authorNotebookId);

          const authorNotebook: JoplinNotebook = {
            id: authorNotebookId,
            parent_id: rootNotebookId,
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

      // Create book notebook (child of root or author)
      const bookNotebookPath = useAuthorLevel
        ? `${rootNotebookName}/${first.author}/${title}`
        : `${rootNotebookName}/${title}`;
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
      for (const clipping of bookClippings) {
        const noteId = this.generateId("note", clipping.id);
        const noteTitle = this.generateNoteTitle(clipping, estimatePages);
        const noteBody = this.generateNoteBody(clipping);

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
          order: orderCounter++,
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

        // Determine which tags to apply to this note
        const noteTags = new Set<string>(defaultTags);
        if (includeClippingTags && clipping.tags) {
          for (const tag of clipping.tags) {
            noteTags.add(tag);
          }
        }

        // Create note-tag associations
        for (const tagName of noteTags) {
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

    return this.success(output, files);
  }

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
    const preview = clipping.content.slice(0, 50).replace(/\n/g, " ");

    // Determine page number
    let pageNum = 0;

    if (estimate || clipping.page !== null) {
      // If we are estimating or have an actual page, use getEffectivePage
      // getEffectivePage handles both cases: returns actual if present, or estimates if not
      // However, if estimate is false, we want to skip estimation.
      // So logic:
      if (clipping.page !== null) {
        pageNum = clipping.page;
      } else if (estimate) {
        pageNum = getEffectivePage(null, clipping.location);
      }
    }

    // Actually simpler:
    // pageNum = estimate ? getEffectivePage(clipping.page, clipping.location) : (clipping.page ?? 0);
    // But getEffectivePage handles the null check.

    // Let's stick to explicit logic to match previous behavior exactly.
    if (clipping.page !== null) {
      pageNum = clipping.page;
    } else if (estimate && clipping.location.start > 0) {
      pageNum = getEffectivePage(null, clipping.location);
    }

    // Format the reference
    const ref = pageNum > 0 ? formatPage(pageNum) : "";

    return ref ? `${ref} ${preview}` : preview;
  }

  /**
   * Generate the body content for a Joplin note.
   * Python-compatible format: content first, metadata footer at bottom.
   */
  private generateNoteBody(clipping: Clipping): string {
    const parts: string[] = [];

    // Content first
    parts.push(clipping.content);

    // Linked note (if any)
    // Only show if the note wasn't consumed as tags
    // (if clipping has tags, the note was used for tag extraction)
    const noteWasConsumedAsTags = clipping.tags && clipping.tags.length > 0;
    if (clipping.note && !noteWasConsumedAsTags) {
      parts.push("");
      parts.push("---");
      parts.push("");
      parts.push("**My Note:**");
      parts.push(clipping.note);
    }

    // Metadata footer (Python style)
    parts.push("");
    parts.push("");
    parts.push("-----");

    // Build metadata list (Python-compatible format)
    const meta: string[] = [];
    if (clipping.date) {
      meta.push(`- date: ${formatDateHuman(clipping.date)}`);
    }
    meta.push(`- author: ${clipping.author}`);
    meta.push(`- book: ${clipping.title}`);
    if (clipping.page !== null) {
      meta.push(`- page: ${clipping.page}`);
    }
    if (clipping.tags && clipping.tags.length > 0) {
      meta.push(`- tags: ${clipping.tags.join(", ")}`);
    }

    parts.push(meta.join("\n"));
    parts.push("-----");

    return parts.join("\n");
  }

  /**
   * Serialize a Joplin note to its file format.
   * Complete format with all Joplin fields.
   */
  private serializeNote(note: JoplinNote): string {
    const lines: string[] = [];

    // Title comes first (required by Joplin)
    lines.push(note.title);
    lines.push("");

    // Body
    lines.push(note.body);
    lines.push("");

    // Properties (type_ must be LAST)
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
    lines.push(`type_: ${note.type_}`); // MUST be last

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
    lines.push(`parent_id: ${tag.parent_id}`);
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
   * Format a timestamp for Joplin metadata (ISO 8601 with Z suffix).
   * This format is required by Joplin's internal parser.
   */
  private formatTimestamp(ms: number): string {
    return new Date(ms).toISOString();
  }
}
