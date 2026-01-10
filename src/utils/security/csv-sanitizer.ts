/**
 * CSV Injection Protection Utilities
 *
 * Protects against CSV/Formula Injection attacks where malicious content
 * in CSV fields can be interpreted as formulas by spreadsheet applications
 * (Excel, Google Sheets, LibreOffice Calc).
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 * @packageDocumentation
 */

/**
 * Characters that can trigger formula execution in spreadsheet applications.
 *
 * - `=` - Standard formula prefix
 * - `+` - Unary plus, can start formulas
 * - `-` - Unary minus, can start formulas
 * - `@` - Excel's implicit intersection operator
 * - `\t` - Tab character, can be used to escape cell context
 * - `\r` - Carriage return, can manipulate cell boundaries
 *
 * @internal
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"] as const;

/**
 * Sanitization mode for CSV fields.
 *
 * - `escape` - Prefix dangerous content with single quote (default, preserves data)
 * - `reject` - Return empty string for dangerous content (strict mode)
 */
export type SanitizeMode = "escape" | "reject";

/**
 * Options for CSV field sanitization.
 */
export interface SanitizeOptions {
  /**
   * Sanitization mode.
   * - `escape` (default): Prefix with single quote to neutralize formulas
   * - `reject`: Replace dangerous content with empty string
   */
  mode?: SanitizeMode;

  /**
   * Optional callback invoked when suspicious content is detected.
   * Useful for logging, telemetry, or alerting.
   *
   * @param value - The original suspicious value
   * @param sanitized - The sanitized result
   */
  onSuspicious?: (value: string, sanitized: string) => void;
}

/**
 * Sanitize a CSV field to prevent formula injection attacks.
 *
 * If the value starts with any character that could trigger formula execution
 * in spreadsheet applications, it applies the configured sanitization mode.
 *
 * @param value - The field value to sanitize
 * @param options - Optional sanitization options
 * @returns Sanitized value safe for CSV export
 *
 * @example
 * ```typescript
 * // Default mode (escape)
 * sanitizeCSVField("=SUM(A1:A10)")  // Returns "'=SUM(A1:A10)"
 * sanitizeCSVField("+1-2-3")        // Returns "'+1-2-3"
 * sanitizeCSVField("-100")          // Returns "'-100"
 * sanitizeCSVField("@username")     // Returns "'@username"
 * sanitizeCSVField("Normal text")   // Returns "Normal text" (unchanged)
 *
 * // Strict mode (reject)
 * sanitizeCSVField("=SUM(A1)", { mode: "reject" })  // Returns ""
 *
 * // With callback
 * sanitizeCSVField("=SUM(A1)", {
 *   onSuspicious: (val, result) => console.warn(`Sanitized: ${val}`)
 * })
 * ```
 */
export function sanitizeCSVField<T extends string | null | undefined>(
  value: T,
  options?: SanitizeOptions,
): T {
  if (!value) return value;

  const mode = options?.mode ?? "escape";
  const onSuspicious = options?.onSuspicious;

  // Check for formula prefixes on the original value first (catches \t and \r)
  if (FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    const sanitized = mode === "reject" ? "" : `'${value}`;
    onSuspicious?.(value, sanitized);
    return sanitized as T;
  }

  // Then check trimmed value for formulas hidden after whitespace
  const trimmed = value.trim();
  if (trimmed !== value && FORMULA_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    const sanitized = mode === "reject" ? "" : `'${trimmed}`;
    onSuspicious?.(value, sanitized);
    return sanitized as T;
  }

  return value;
}

/**
 * Check if a string value appears to be a formula injection attempt.
 *
 * Useful for logging or flagging potentially malicious content.
 *
 * @param value - The field value to check
 * @returns True if the value starts with a formula prefix
 *
 * @example
 * ```typescript
 * isFormulaSuspicious("=HYPERLINK(...)")  // Returns true
 * isFormulaSuspicious("Regular text")     // Returns false
 * ```
 */
export function isFormulaSuspicious(value: string | null | undefined): boolean {
  if (!value) return false;

  // Check original value first (catches \t and \r)
  if (FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return true;
  }

  // Then check trimmed value
  const trimmed = value.trim();
  return FORMULA_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * Get the list of formula prefixes that trigger sanitization.
 *
 * Useful for documentation or validation purposes.
 *
 * @returns Readonly array of formula prefix characters
 */
export function getFormulaPrefixes(): readonly string[] {
  return FORMULA_PREFIXES;
}
