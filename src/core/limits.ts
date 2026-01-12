/**
 * Constants defining system limits and technical thresholds.
 *
 * These values represent hard limits of the processing engine,
 * file system constraints, and memory safety boundaries.
 */
export const SYSTEM_LIMITS = {
  /**
   * Files larger than this size (in MB) will trigger streaming mode
   * to prevent memory exhaustion (OutOfMemory errors).
   */
  LARGE_FILE_MB: 50,

  /**
   * Chunk size (in bytes) for streaming operations.
   * Default: 64KB (standard for Node.js streams is often 64KB).
   */
  STREAM_CHUNK_SIZE: 64 * 1024, // 64KB

  /**
   * Maximum length for generated filenames.
   * Ensures compatibility across different file systems (Windows MAX_PATH, etc.).
   */
  MAX_FILENAME_LENGTH: 100,

  /**
   * Maximum number of history entries to retain.
   * Used for limiting storage usage in state management.
   */
  HISTORY_MAX_ENTRIES: 1000,
} as const;
