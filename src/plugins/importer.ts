/**
 * Wrapper for dynamic imports to allow mocking in tests.
 * @packageDocumentation
 */

export async function dynamicImport(packageName: string): Promise<any> {
  return import(packageName);
}
