# Error Handling Pattern

This project uses the `neverthrow` library for type-safe error handling following the **Result pattern**.

## Core Concepts

### Types

```typescript
// src/types/result.ts
import type { Result, ResultAsync } from 'neverthrow';

export type ImportError =
  | { code: 'PARSE_ERROR'; message: string; originalError?: unknown; warnings?: string[] }
  | { code: 'EMPTY_FILE'; message: string; warnings?: string[] }
  | { code: 'INVALID_FORMAT'; message: string; details?: ValidationErrorDetail[]; warnings?: string[] }
  | { code: 'UNKNOWN_ERROR'; message: string; originalError?: unknown; warnings?: string[] };

export type ImportResultType = Result<ImportSuccess, ImportError>;
export type ImportResultAsyncType = ResultAsync<ImportSuccess, ImportError>;
```

## Usage Patterns

### ✅ CORRECT: Check with isOk()/isErr() then access value/error

```typescript
const result = await importer.import(content);

if (result.isErr()) {
  const err = result.error;  // TypeScript knows this is ImportError
  console.error(`Error [${err.code}]: ${err.message}`);
  return;
}

const data = result.value;  // TypeScript knows this is ImportSuccess
process(data.clippings);
```

### ❌ INCORRECT: Using _unsafeUnwrap()

```typescript
// DON'T DO THIS - defeats type safety
const data = result._unsafeUnwrap();  // Will throw at runtime if Err
```

### ❌ INCORRECT: Throwing inside .match()

```typescript
// DON'T DO THIS - mixing paradigms
await result.match(
  (success) => success,
  (error) => { throw error; }  // Anti-pattern!
);
```

## In Tests

```typescript
it("should import successfully", async () => {
  const result = await importer.import(content);

  expect(result.isOk()).toBe(true);
  if (!result.isOk()) return;  // Early return acts as type guard
  
  const { clippings } = result.value;  // Safe access
  expect(clippings).toHaveLength(1);
});

it("should fail on invalid input", async () => {
  const result = await importer.import("invalid");

  expect(result.isErr()).toBe(true);
  if (!result.isErr()) return;
  
  expect(result.error.code).toBe("PARSE_ERROR");
});
```

## BaseImporter Pattern

All importers extend `BaseImporter` which provides:

1. **Automatic empty file handling** - Returns `EMPTY_FILE` error
2. **Exception capture** - Uses `ResultAsync.fromPromise()` to catch unexpected throws
3. **Helper methods** - `success()` and `error()` for creating Results

```typescript
export abstract class BaseImporter implements Importer {
  import(content: string): ImportResultAsync {
    if (!content.trim()) {
      return errAsync({ code: "EMPTY_FILE", message: "File is empty" });
    }

    return ResultAsync.fromPromise(
      this.doImport(content),
      (error) => this.error(error)._unsafeUnwrapErr()
    ).andThen((result) => new ResultAsync(Promise.resolve(result)));
  }

  protected abstract doImport(content: string): Promise<ImportResult>;
  
  protected success(clippings: Clipping[], warnings?: string[]): ImportResult;
  protected error(err: unknown, warnings?: string[], code?: string): ImportResult;
}
```

## Error Codes

| Code | When Used |
|------|-----------|
| `PARSE_ERROR` | JSON/CSV syntax invalid, clipping parsing failed |
| `EMPTY_FILE` | File content is empty or whitespace only |
| `INVALID_FORMAT` | Structure doesn't match expected schema (includes Zod details) |
| `UNKNOWN_ERROR` | Unexpected runtime exception |

## Zod Integration

For JSON imports, validation errors include detailed field information:

```typescript
if (result.isErr() && result.error.code === 'INVALID_FORMAT') {
  const details = result.error.details;  // ValidationErrorDetail[]
  for (const issue of details ?? []) {
    console.log(`Field ${issue.path.join('.')}: ${issue.message}`);
  }
}
```
