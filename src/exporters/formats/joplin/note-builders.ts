/**
 * Note builder functions for Joplin exporter.
 *
 * Contains the logic for creating Joplin notes from clippings
 * in both per-book and per-clipping granularity modes.
 *
 * @packageDocumentation
 */

import type { Clipping } from "#app-types/clipping.js";
import { formatPage, getEffectivePage } from "#domain/core/locations.js";
import type { ExportedFile } from "#exporters/core/types.js";
import type { TemplateEngine } from "#templates/index.js";
import { serializeNote, serializeNoteTag } from "./serializers.js";
import {
  JOPLIN_MARKUP,
  JOPLIN_SOURCE,
  JOPLIN_TYPES,
  type JoplinExportContext,
  type JoplinExporterOptions,
  type JoplinNote,
  type JoplinNoteTag,
} from "./types.js";

/**
 * Generate a deterministic ID for Joplin entities.
 * Uses SHA-256 for compatibility with Python version.
 */
export type IdGenerator = (type: string, content: string) => string;

/**
 * Get the formatted page number for a clipping.
 * Returns "[0042]" or "" if no page is available.
 */
export function getFormattedPage(clipping: Clipping, estimate = true): string {
  let pageNum = 0;
  if (clipping.page !== null) {
    pageNum = clipping.page;
  } else if (estimate && clipping.location.start > 0) {
    pageNum = getEffectivePage(null, clipping.location);
  }

  return pageNum > 0 ? (formatPage(pageNum) ?? "") : "";
}

/**
 * Create a single note containing all clippings from a book (per-book mode).
 */
export function createBookNote(
  clippings: Clipping[],
  parentNotebookId: string,
  engine: TemplateEngine,
  options: JoplinExporterOptions,
  now: number,
  creator: string,
  geoLocation: { latitude: number; longitude: number; altitude?: number },
  ctx: JoplinExportContext,
  generateId: IdGenerator,
  collectAllTags: (
    clippings: Clipping[],
    defaultTags: string[],
    includeClippingTags: boolean,
  ) => Set<string>,
): ExportedFile[] {
  const files: ExportedFile[] = [];
  const first = clippings[0];
  if (!first) return [];

  // Generate note ID based on book title for determinism
  const noteId = generateId("book-note", `${first.author}/${first.title}`);
  const noteTitle = engine.renderBookTitle(clippings);
  const noteBody = engine.renderBook(clippings);
  const clippingDate = first.date?.getTime() ?? now;

  const note: JoplinNote = {
    id: noteId,
    parent_id: parentNotebookId,
    title: noteTitle,
    body: noteBody,
    created_time: clippingDate,
    updated_time: now,
    user_created_time: clippingDate,
    user_updated_time: now,
    is_todo: 0,
    todo_completed: 0,
    source: JOPLIN_SOURCE.SOURCE,
    source_url: "",
    source_application: JOPLIN_SOURCE.SOURCE_APP,
    order: ctx.orderCounter++,
    latitude: geoLocation.latitude ?? 0,
    longitude: geoLocation.longitude ?? 0,
    altitude: geoLocation.altitude ?? 0,
    author: creator,
    is_shared: 0,
    encryption_applied: 0,
    markup_language: JOPLIN_MARKUP.MARKDOWN,
    type_: JOPLIN_TYPES.NOTE,
  };

  files.push({
    path: `${noteId}.md`,
    content: serializeNote(note),
  });

  // Add note-tag associations (collect all tags from all clippings)
  const defaultTags = options.tags ?? [];
  const includeClippingTags = options.includeClippingTags;
  const allTags = collectAllTags(clippings, defaultTags, includeClippingTags ?? false);

  for (const tagName of allTags) {
    const tagId = ctx.tagMap.get(tagName);
    if (!tagId) continue;

    const noteTagId = generateId("note-tag", `${noteId}-${tagId}`);
    const noteTag: JoplinNoteTag = {
      id: noteTagId,
      note_id: noteId,
      tag_id: tagId,
      created_time: now,
      updated_time: now,
      type_: JOPLIN_TYPES.NOTE_TAG,
    };
    files.push({
      path: `${noteTagId}.md`,
      content: serializeNoteTag(noteTag),
    });
  }

  return files;
}

/**
 * Create one note per clipping (per-clipping mode, default).
 */
export function createClippingNotes(
  clippings: Clipping[],
  parentNotebookId: string,
  engine: TemplateEngine,
  options: JoplinExporterOptions,
  now: number,
  estimatePages: boolean,
  creator: string,
  geoLocation: { latitude: number; longitude: number; altitude?: number },
  ctx: JoplinExportContext,
  generateId: IdGenerator,
): ExportedFile[] {
  const files: ExportedFile[] = [];

  for (const clipping of clippings) {
    const noteId = generateId("note", clipping.id);
    const formattedPage = getFormattedPage(clipping, estimatePages);
    const noteTitle = engine.renderClippingTitle(clipping, formattedPage);
    const noteBody = engine.renderClipping(clipping);
    const clippingDate = clipping.date?.getTime() ?? now;

    const note: JoplinNote = {
      id: noteId,
      parent_id: parentNotebookId,
      title: noteTitle,
      body: noteBody,
      created_time: clippingDate,
      updated_time: now,
      user_created_time: clippingDate,
      user_updated_time: now,
      is_todo: 0,
      todo_completed: 0,
      source: JOPLIN_SOURCE.SOURCE,
      source_url: "",
      source_application: JOPLIN_SOURCE.SOURCE_APP,
      order: ctx.orderCounter++,
      latitude: geoLocation.latitude ?? 0,
      longitude: geoLocation.longitude ?? 0,
      altitude: geoLocation.altitude ?? 0,
      author: creator,
      is_shared: 0,
      encryption_applied: 0,
      markup_language: JOPLIN_MARKUP.MARKDOWN,
      type_: JOPLIN_TYPES.NOTE,
    };

    files.push({
      path: `${noteId}.md`,
      content: serializeNote(note),
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

      const noteTagId = generateId("note-tag", `${noteId}-${tagId}`);
      const noteTag: JoplinNoteTag = {
        id: noteTagId,
        note_id: noteId,
        tag_id: tagId,
        created_time: now,
        updated_time: now,
        type_: JOPLIN_TYPES.NOTE_TAG,
      };
      files.push({
        path: `${noteTagId}.md`,
        content: serializeNoteTag(noteTag),
      });
    }
  }

  return files;
}
