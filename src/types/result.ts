import type { Result, ResultAsync } from "neverthrow";
import type { Clipping } from "./clipping.js";

/**
 * Zod issue type re-definition to avoid hard dependency on zod in types
 */
export interface ValidationErrorDetail {
  path: (string | number | symbol)[];
  message: string;
  code: string;
}

export type ImportError =
  | {
      code: "PARSE_ERROR";
      message: string;
      path?: string;
      originalError?: unknown;
      warnings?: string[];
    }
  | { code: "EMPTY_FILE"; message: string; warnings?: string[] }
  | {
      code: "INVALID_FORMAT";
      message: string;
      details?: ValidationErrorDetail[];
      warnings?: string[];
    }
  | { code: "UNKNOWN_ERROR"; message: string; originalError?: unknown; warnings?: string[] };

export interface ImportSuccess {
  clippings: Clipping[];
  warnings: string[];
  meta?: {
    detectedLanguage?: string;
    [key: string]: unknown;
  };
}

export type ImportResultType = Result<ImportSuccess, ImportError>;
export type ImportResultAsyncType = ResultAsync<ImportSuccess, ImportError>;
