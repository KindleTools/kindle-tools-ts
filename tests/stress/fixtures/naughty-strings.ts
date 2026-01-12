/**
 * A curated subset of the "Big List of Naughty Strings" intended to break
 * text parsers, file system operations, and display logic.
 */
export const NAUGHTY_STRINGS = [
  // Reserved Strings
  "undefined",
  "null",
  "NaN",
  "TRUE",
  "FALSE",
  "None",
  "nil",

  // Numeric Edge Cases
  "0",
  "1",
  "-1",
  "1.00",
  "999999999999999999999",
  "Infinity",
  "-Infinity",
  "0.0000000000000000001",

  // Special Characters & Punctuation
  ",",
  ".",
  ";",
  ":",
  "|",
  "!",
  "?",
  "'",
  '"',
  "`",
  "^",
  "~",
  "*",
  "&",
  "#",
  "%",
  "$",
  "@",
  "+",
  "=",
  "\\",
  "/",
  "<",
  ">",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",

  // Whitespace
  " ",
  "   ",
  "\t",
  "\n",
  "\r",
  "\r\n",
  "\v",
  "\f",
  "\u00A0", // No-break space
  "\u200B", // Zero-width space
  "\u2028", // Line Common separator
  "\u2029", // Paragraph separator

  // Unicode / Emoji
  "ñ",
  "Ñ",
  "á",
  "ü",
  "ß",
  "👍",
  "👨‍👩‍👧‍👦", // Complex emoji (combining chars)
  "🏳️‍🌈", // Flag sequence
  "﷽", // Single character that is very wide
  "å",
  "Ω",

  // Zalgo Text (diacritics overload)
  "H̡̢aRg̡̢d̶̢gu",
  "Ṯh̖i̱s i̱s Ẕa̱ḻg̱o",

  // Script Injection / XSS vectors (if eventually rendered to HTML)
  "<script>alert(1)</script>",
  '"><script>alert(1)</script>',
  "javascript:alert(1)",
  "onload=alert(1)",

  // SQL Injection (if stored in DB)
  "'; DROP TABLE users; --",
  "1 OR 1=1",

  // Path Traversal / OS Interaction
  "../",
  "..\\",
  "/etc/passwd",
  "C:\\Windows\\System32\\calc.exe",
  "COM1",
  "LPT1",
  "NUL",
  "PRN",

  // Format Strings
  "%s",
  "%d",
  "%x",
  "%n",

  // Long Strings
  "A".repeat(1000), // 1KB string
];
