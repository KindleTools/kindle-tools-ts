/**
 * Date formatting utilities.
 *
 * @packageDocumentation
 */

/**
 * Format a date to ISO string (YYYY-MM-DD).
 * Useful for YAML frontmatter and stable machine-readable dates.
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0] || "";
}

/**
 * Format a date to human-readable string (YYYY-MM-DD HH:mm:ss).
 * Useful for logs or simple display.
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD HH:mm:ss format
 */
export function formatDateHuman(date: Date): string {
  // Simple check for valid date
  if (Number.isNaN(date.getTime())) return "Invalid Date";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
