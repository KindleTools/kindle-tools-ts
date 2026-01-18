/**
 * Constants defining system limits and technical thresholds.
 *
 * These values represent hard limits of the processing engine
 * and file system constraints.
 */
export const SYSTEM_LIMITS = {
  /**
   * Maximum length for generated filenames.
   * Ensures compatibility across different file systems (Windows MAX_PATH, etc.).
   */
  MAX_FILENAME_LENGTH: 100,
} as const;
