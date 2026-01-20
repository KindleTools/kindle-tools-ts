import type { ParseResult } from "#app-types/config.js";
import * as StatUtils from "#domain/analytics/stats.js";
import * as TarUtils from "#utils/fs/tar.js";
import * as ZipUtils from "#utils/fs/zip.js";
import * as GeoUtils from "#utils/geo/index.js";
import * as DateUtils from "#utils/system/dates.js";
import * as TextUtils from "#utils/text/normalizers.js";

export const UTILS = {
  ...DateUtils,
  ...GeoUtils,
  ...TextUtils,
  ...StatUtils,
  ...TarUtils,
  ...ZipUtils,
};

// =============================================================================
// State
// =============================================================================

export interface AppState {
  fileContent: string | null;
  fileName: string | null;
  parseResult: ParseResult | null;
}

export const state: AppState = {
  fileContent: null,
  fileName: null,
  parseResult: null,
};

// =============================================================================
// Formatter Utilities
// =============================================================================

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, maxLength))}...`;
}

/**
 * Detect input file format from filename.
 */
export function detectInputFormat(fileName: string): "txt" | "json" | "csv" {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  switch (ext) {
    case "json":
      return "json";
    case "csv":
      return "csv";
    default:
      return "txt";
  }
}

// =============================================================================
// Storage Defaults
// =============================================================================

export const STORAGE_KEY = "kindle-workbench-options";
