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
import type { ExportedFile } from "#exporters/core/types.js";
import { MultiFileExporter } from "#exporters/shared/multi-file-exporter.js";
import type { TemplateEngine, TemplatePreset } from "#templates/index.js";
import { sha256Sync } from "#utils/security/hashing.js";
import { createBookNote, createClippingNotes } from "./note-builders.js";
import { serializeNotebook, serializeTag } from "./serializers.js";
import {
  JOPLIN_TYPES,
  type JoplinExportContext,
  type JoplinExporterOptions,
  type JoplinNotebook,
  type JoplinTag,
} from "./types.js";

// Re-export types for consumers
export type { JoplinExporterOptions } from "./types.js";

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
      type_: JOPLIN_TYPES.FOLDER,
    };
    files.push({
      path: `${rootNotebookId}.md`,
      content: serializeNotebook(rootNotebook),
    });

    // Generate all tags upfront (now possible since we have clippings)
    const defaultTags = options.tags ?? [];
    const includeClippingTags = options.includeClippingTags;
    const allTagNames = this.collectAllTags(clippings, defaultTags, includeClippingTags);

    for (const tagName of allTagNames) {
      // Normalize to lowercase + NFC to work around Joplin's SQLite Unicode case-sensitivity limitation
      // SQLite's COLLATE NOCASE doesn't work correctly with accented characters (ó, é, ñ, etc.)
      // See: https://github.com/laurent22/joplin/issues/11179
      const normalizedTagName = tagName.normalize("NFC").toLowerCase();
      const tagId = this.generateId("tag", normalizedTagName);
      // Map original tagName to tagId for note-tag association lookup
      this.ctx.tagMap.set(tagName, tagId);

      const tag: JoplinTag = {
        id: tagId,
        title: normalizedTagName,
        parent_id: "",
        created_time: now,
        updated_time: now,
        type_: JOPLIN_TYPES.TAG,
      };
      files.push({
        path: `${tagId}.md`,
        content: serializeTag(tag),
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
   * Supports two granularities:
   * - per-clipping: One note per highlight/note (default, current behavior)
   * - per-book: One note per book with all clippings consolidated
   */
  protected override async processBook(
    clippings: Clipping[],
    options: JoplinExporterOptions,
    engine: TemplateEngine,
  ): Promise<ExportedFile[]> {
    const first = clippings[0];
    if (!first) return [];

    // Context must be initialized by exportPreamble before processing books
    if (!this.ctx) {
      throw new Error(
        "JoplinExporter: context not initialized. exportPreamble must be called first.",
      );
    }

    const { ctx } = this;
    const files: ExportedFile[] = [];
    const now = Date.now();
    const folderStructure = options.folderStructure;
    const authorCase = options.authorCase;
    const estimatePages = options.estimatePages ?? true;
    const creator = options.creator ?? "";
    const geoLocation = {
      latitude: options.geoLocation?.latitude ?? 0,
      longitude: options.geoLocation?.longitude ?? 0,
      altitude: options.geoLocation?.altitude ?? 0,
    };
    const granularity = options.noteGranularity ?? "per-clipping";

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
          type_: JOPLIN_TYPES.FOLDER,
        };
        files.push({
          path: `${authorNotebookId}.md`,
          content: serializeNotebook(authorNotebook),
        });
      }
      parentNotebookId = authorNotebookId;
    }

    // Create book notebook only for "by-author-book", "by-book", or "flat" structures
    // For "by-author", notes go directly into the author's notebook
    const createBookNotebook = folderStructure !== "by-author";
    let notesParentId = parentNotebookId;

    if (createBookNotebook) {
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
        type_: JOPLIN_TYPES.FOLDER,
      };
      files.push({
        path: `${bookNotebookId}.md`,
        content: serializeNotebook(bookNotebook),
      });

      notesParentId = bookNotebookId;
    }

    // Branch based on granularity
    if (granularity === "per-book") {
      // Generate a single note for all clippings in the book
      const noteFiles = createBookNote(
        clippings,
        notesParentId,
        engine,
        options,
        now,
        creator,
        geoLocation,
        ctx,
        this.generateId.bind(this),
        this.collectAllTags.bind(this),
      );
      files.push(...noteFiles);
    } else {
      // Default: one note per clipping
      const noteFiles = createClippingNotes(
        clippings,
        notesParentId,
        engine,
        options,
        now,
        estimatePages,
        creator,
        geoLocation,
        ctx,
        this.generateId.bind(this),
      );
      files.push(...noteFiles);
    }

    return files;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate a deterministic ID for Joplin entities.
   * Uses MD5-equivalent length (32 chars) for compatibility with Python version.
   */
  private generateId(type: string, content: string): string {
    // Normalize to NFC before lowercasing to ensure consistent IDs for accented characters
    const normalized = content.normalize("NFC").toLowerCase().trim();
    const input = `${type}:${normalized}`;
    const hash = sha256Sync(input);
    // Joplin uses 32-character hex IDs
    return hash.slice(0, 32);
  }
}
