/**
 * Test fixtures for Kindle clippings.
 *
 * These fixtures provide sample data for testing the parser and exporters.
 */

import type { Clipping } from "@app-types/clipping.js";

/**
 * Sample English clippings file content.
 */
export const SAMPLE_CLIPPINGS_EN = `The Great Gatsby (F. Scott Fitzgerald)
- Your Highlight on page 5 | Location 100-105 | Added on Friday, January 1, 2024 10:30:45 AM

In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.
==========
The Great Gatsby (F. Scott Fitzgerald)
- Your Note on page 5 | Location 100 | Added on Friday, January 1, 2024 10:31:00 AM

This is my note about the opening line.
==========
1984 (George Orwell)
- Your Highlight on page 15 | Location 200-210 | Added on Saturday, January 2, 2024 3:45:00 PM

Big Brother is watching you.
==========
1984 (George Orwell)
- Your Bookmark on page 15 | Location 200 | Added on Saturday, January 2, 2024 3:46:00 PM


==========
Clean Code (Robert C. Martin)
- Your Highlight on page 42 | Location 500-520 | Added on Sunday, January 3, 2024 8:00:00 AM

The first rule of functions is that they should be small. The second rule of functions is that they should be smaller than that.
==========
`;

/**
 * Sample Spanish clippings file content.
 */
export const SAMPLE_CLIPPINGS_ES = `Don Quijote de la Mancha (Miguel de Cervantes)
- Tu subrayado en la página 10 | Ubicación 150-160 | Añadido el lunes, 1 de enero de 2024 11:00:00

En un lugar de la Mancha, de cuyo nombre no quiero acordarme
==========
Don Quijote de la Mancha (Miguel de Cervantes)
- Tu nota en la página 10 | Ubicación 150 | Añadido el lunes, 1 de enero de 2024 11:01:00

Inicio del libro
==========
`;

/**
 * Pre-built clipping objects for exporter tests.
 */
export const SAMPLE_CLIPPINGS: Clipping[] = [
  {
    id: "abc123def456",
    title: "The Great Gatsby",
    titleRaw: "The Great Gatsby (F. Scott Fitzgerald)",
    author: "F. Scott Fitzgerald",
    authorRaw: "F. Scott Fitzgerald",
    content: "In my younger and more vulnerable years my father gave me some advice.",
    contentRaw: "In my younger and more vulnerable years my father gave me some advice.",
    type: "highlight",
    page: 5,
    location: { raw: "100-105", start: 100, end: 105 },
    date: new Date("2024-01-01T10:30:45"),
    dateRaw: "Friday, January 1, 2024 10:30:45 AM",
    isLimitReached: false,
    isEmpty: false,
    language: "en",
    source: "kindle",
    wordCount: 14,
    charCount: 70,
    note: "This is my personal note about the opening.",
    linkedNoteId: "linked123",
    blockIndex: 0,
  },
  {
    id: "def789ghi012",
    title: "The Great Gatsby",
    titleRaw: "The Great Gatsby (F. Scott Fitzgerald)",
    author: "F. Scott Fitzgerald",
    authorRaw: "F. Scott Fitzgerald",
    content: "This is my personal note about the opening.",
    contentRaw: "This is my personal note about the opening.",
    type: "note",
    page: 5,
    location: { raw: "100", start: 100, end: null },
    date: new Date("2024-01-01T10:31:00"),
    dateRaw: "Friday, January 1, 2024 10:31:00 AM",
    isLimitReached: false,
    isEmpty: false,
    language: "en",
    source: "kindle",
    wordCount: 8,
    charCount: 43,
    linkedHighlightId: "abc123def456",
    blockIndex: 1,
  },
  {
    id: "ghi345jkl678",
    title: "1984",
    titleRaw: "1984 (George Orwell)",
    author: "George Orwell",
    authorRaw: "George Orwell",
    content: "Big Brother is watching you.",
    contentRaw: "Big Brother is watching you.",
    type: "highlight",
    page: 15,
    location: { raw: "200-210", start: 200, end: 210 },
    date: new Date("2024-01-02T15:45:00"),
    dateRaw: "Saturday, January 2, 2024 3:45:00 PM",
    isLimitReached: false,
    isEmpty: false,
    language: "en",
    source: "kindle",
    wordCount: 5,
    charCount: 28,
    blockIndex: 2,
  },
  {
    id: "jkl901mno234",
    title: "1984",
    titleRaw: "1984 (George Orwell)",
    author: "George Orwell",
    authorRaw: "George Orwell",
    content: "",
    contentRaw: "",
    type: "bookmark",
    page: 15,
    location: { raw: "200", start: 200, end: null },
    date: new Date("2024-01-02T15:46:00"),
    dateRaw: "Saturday, January 2, 2024 3:46:00 PM",
    isLimitReached: false,
    isEmpty: true,
    language: "en",
    source: "kindle",
    wordCount: 0,
    charCount: 0,
    blockIndex: 3,
  },
  {
    id: "mno567pqr890",
    title: "Clean Code",
    titleRaw: "Clean Code (Robert C. Martin)",
    author: "Robert C. Martin",
    authorRaw: "Robert C. Martin",
    content: "The first rule of functions is that they should be small.",
    contentRaw: "The first rule of functions is that they should be small.",
    type: "highlight",
    page: 42,
    location: { raw: "500-520", start: 500, end: 520 },
    date: new Date("2024-01-03T08:00:00"),
    dateRaw: "Sunday, January 3, 2024 8:00:00 AM",
    isLimitReached: false,
    isEmpty: false,
    language: "en",
    source: "kindle",
    wordCount: 10,
    charCount: 57,
    blockIndex: 4,
  },
];

/**
 * Empty clippings array for edge case testing.
 */
export const EMPTY_CLIPPINGS: Clipping[] = [];

/**
 * Single clipping for minimal tests.
 */
export const SINGLE_CLIPPING: Clipping[] = [SAMPLE_CLIPPINGS[0] as Clipping];

/**
 * Clippings with a sideloaded book (PDF).
 */
export const SIDELOADED_CLIPPING: Clipping = {
  id: "side123load",
  title: "My PDF Book",
  titleRaw: "My PDF Book.pdf",
  author: "Unknown",
  authorRaw: "",
  content: "Some content from a sideloaded book.",
  contentRaw: "Some content from a sideloaded book.",
  type: "highlight",
  page: 10,
  location: { raw: "50-55", start: 50, end: 55 },
  date: new Date("2024-01-05T12:00:00"),
  dateRaw: "Friday, January 5, 2024 12:00:00 PM",
  isLimitReached: false,
  isEmpty: false,
  language: "en",
  source: "sideload",
  wordCount: 6,
  charCount: 36,
  blockIndex: 0,
};

/**
 * Clipping with DRM limit reached.
 */
export const DRM_LIMITED_CLIPPING: Clipping = {
  id: "drm123limit",
  title: "Protected Book",
  titleRaw: "Protected Book (Famous Author)",
  author: "Famous Author",
  authorRaw: "Famous Author",
  content: "You have reached the clipping limit for this item",
  contentRaw: "You have reached the clipping limit for this item",
  type: "highlight",
  page: 1,
  location: { raw: "1-5", start: 1, end: 5 },
  date: new Date("2024-01-01T00:00:00"),
  dateRaw: "Monday, January 1, 2024 12:00:00 AM",
  isLimitReached: true,
  isEmpty: false,
  language: "en",
  source: "kindle",
  wordCount: 9,
  charCount: 49,
  blockIndex: 0,
};
