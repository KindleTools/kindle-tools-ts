import type { Clipping } from "#app-types/clipping.js";

/**
 * Create a minimal valid clipping for testing.
 */
export function createClipping(overrides: Partial<Clipping> = {}): Clipping {
    const defaults: Clipping = {
        id: "test-id",
        title: "Test Book",
        author: "Test Author",
        content: "Test Content",
        type: "highlight",
        date: new Date("2024-01-01T12:00:00Z"),
        location: { start: 100, end: 110, raw: "100-110" },
        page: 10,
        wordCount: 10, // Default word count if computed
    } as Clipping;

    return { ...defaults, ...overrides } as Clipping;
}
