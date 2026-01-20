/**
 * Serialization functions for Joplin entities.
 *
 * Converts Joplin entities (notes, notebooks, tags) to their
 * markdown-based file format representation.
 *
 * @packageDocumentation
 */

import type { JoplinNote, JoplinNotebook, JoplinNoteTag, JoplinTag } from "./types.js";

/**
 * Format a timestamp as ISO string.
 */
export function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Serialize a Joplin note to its file format.
 */
export function serializeNote(note: JoplinNote): string {
  const lines: string[] = [];
  lines.push(note.title);
  lines.push("");
  lines.push(note.body);
  lines.push("");
  lines.push(`id: ${note.id}`);
  lines.push(`parent_id: ${note.parent_id}`);
  lines.push(`created_time: ${formatTimestamp(note.created_time)}`);
  lines.push(`updated_time: ${formatTimestamp(note.updated_time)}`);
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
  lines.push(`user_created_time: ${formatTimestamp(note.user_created_time)}`);
  lines.push(`user_updated_time: ${formatTimestamp(note.user_updated_time)}`);
  lines.push(`is_shared: ${note.is_shared}`);
  lines.push(`encryption_applied: ${note.encryption_applied}`);
  lines.push(`markup_language: ${note.markup_language}`);
  lines.push(`type_: ${note.type_}`);
  return lines.join("\n");
}

/**
 * Serialize a Joplin notebook to its file format.
 */
export function serializeNotebook(notebook: JoplinNotebook): string {
  const lines: string[] = [];
  lines.push(notebook.title);
  lines.push("");
  lines.push(`id: ${notebook.id}`);
  lines.push(`parent_id: ${notebook.parent_id}`);
  lines.push(`created_time: ${formatTimestamp(notebook.created_time)}`);
  lines.push(`updated_time: ${formatTimestamp(notebook.updated_time)}`);
  lines.push(`type_: ${notebook.type_}`);
  return lines.join("\n");
}

/**
 * Serialize a Joplin tag to its file format.
 */
export function serializeTag(tag: JoplinTag): string {
  const lines: string[] = [];
  // Tag title is already NFC-normalized during import if normalizeUnicode option is enabled
  lines.push(tag.title);
  lines.push("");
  lines.push(`id: ${tag.id}`);
  lines.push(`parent_id: ${tag.parent_id}`);
  lines.push(`created_time: ${formatTimestamp(tag.created_time)}`);
  lines.push(`updated_time: ${formatTimestamp(tag.updated_time)}`);
  lines.push(`type_: ${tag.type_}`);
  return lines.join("\n");
}

/**
 * Serialize a Joplin note-tag association to its file format.
 */
export function serializeNoteTag(noteTag: JoplinNoteTag): string {
  const lines: string[] = [];
  lines.push(`id: ${noteTag.id}`);
  lines.push(`note_id: ${noteTag.note_id}`);
  lines.push(`tag_id: ${noteTag.tag_id}`);
  lines.push(`created_time: ${formatTimestamp(noteTag.created_time)}`);
  lines.push(`updated_time: ${formatTimestamp(noteTag.updated_time)}`);
  lines.push(`type_: ${noteTag.type_}`);
  return lines.join("\n");
}
