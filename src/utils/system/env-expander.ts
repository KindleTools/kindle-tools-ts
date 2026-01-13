/**
 * Utility for expanding environment variables in configuration objects.
 * Supports syntax: ${VAR_NAME} and ${VAR_NAME:-default}
 */

/**
 * Expands environment variables in a string.
 * @param value The string to expand.
 * @returns The string with environment variables expanded.
 */
export function expandString(value: string): string {
  // Regex matches ${VAR_NAME} or ${VAR_NAME:-default_value}
  return value.replace(/\$\{([a-zA-Z0-9_]+)(?::-(.*?))?\}/g, (_, varName, defaultValue) => {
    return process.env[varName] ?? defaultValue ?? "";
  });
}

/**
 * Recursively expands environment variables in an object or array.
 * @param target The object or array to expand.
 * @returns A new object/array with expanded values (or the original if primitive).
 */
export function expandEnvVars<T>(target: T): T {
  if (typeof target === "string") {
    return expandString(target) as unknown as T;
  }

  if (Array.isArray(target)) {
    return target.map((item) => expandEnvVars(item)) as unknown as T;
  }

  if (target !== null && typeof target === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(target)) {
      result[key] = expandEnvVars(value);
    }
    return result;
  }

  return target;
}
