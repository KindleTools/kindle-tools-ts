# Test Fixtures

This directory contains static files used for testing the KindleToolsTS project.

## Structure

- **`clippings/`**: Raw text files containing Kindle clippings.
  - `sample-en.txt`: Standard English clippings (from `My Clippings.txt`).
  - `sample-es.txt`: Standard Spanish clippings.
  - `standard.txt`: Used for snapshot testing.
  - **`edge-cases/`**: Specific scenarios (malformed blocks, extra whitespace, etc.).
- **`expected-output/`**: Expected JSON results for snapshot tests.

## Usage

Use the `loadFixture` helper to read these files in your tests:

```typescript
import { loadFixture } from "../helpers/fixtures.js";

const content = loadFixture("sample-en.txt");
```

## Adding New Fixtures

1. Create a new `.txt` file in `clippings/` (or a subdirectory).
2. If it's for a specific bug report, consider naming it after the issue or description (e.g., `issue-123-crlf.txt`).
3. Use `loadFixture` in your test to read it.
