# Contributing to kindle-tools-ts

First off, **thank you** for taking the time to contribute! 🎉

This document provides guidelines for contributing to kindle-tools-ts. Following these guidelines helps communicate that you respect the time of the developers maintaining this project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Adding Features](#adding-features)
- [Reporting Issues](#reporting-issues)
- [Questions](#questions)

---

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you are expected to:

- **Be respectful** — Treat everyone with respect. No harassment, discrimination, or personal attacks.
- **Be constructive** — Provide helpful feedback. Focus on the idea, not the person.
- **Be collaborative** — Work together toward common goals. Help others when you can.

Report any unacceptable behavior to the maintainers.

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18.18.0+ | Runtime (use `.nvmrc`) |
| **pnpm** | 8.0+ | Package manager |
| **Git** | 2.0+ | Version control |

### Quick Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/kindle-tools-ts.git
cd kindle-tools-ts

# 3. Install dependencies
pnpm install

# 4. Create a branch
git checkout -b feat/my-feature

# 5. Start development
pnpm dev
```

---

## Development Setup

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Watch mode for development |
| `pnpm build` | Build ESM + CJS + types |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Run Biome linter |
| `pnpm format` | Format with Biome |
| `pnpm check` | Lint + format + typecheck |
| `pnpm gui` | Open visual workbench |

### Project Structure

```
src/
├── core/         # Orchestration (processor.ts)
├── domain/       # Business logic (rules, identity, stats)
├── importers/    # Input formats (txt, json, csv)
├── exporters/    # Output formats (6 formats)
├── utils/        # Generic utilities
├── schemas/      # Zod validation
├── templates/    # Handlebars templates
├── errors/       # Error handling (neverthrow)
├── ports/        # Dependency injection
├── types/        # TypeScript definitions
└── index.ts      # Public API

tests/
├── unit/         # Unit tests
├── integration/  # Pipeline tests
└── fixtures/     # Test data
```

> **Deep Dive:** See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

---

## Making Changes

### Branch Naming

Use descriptive branch names:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/description` | `feat/turkish-language` |
| Bug fix | `fix/description` | `fix/csv-encoding` |
| Docs | `docs/description` | `docs/api-examples` |
| Refactor | `refactor/description` | `refactor/exporter-base` |
| Chore | `chore/description` | `chore/update-deps` |

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `perf` | Performance improvement |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

**Examples:**

```bash
feat(exporter): add EPUB export format
fix(parser): handle malformed dates in German locale
docs(readme): add browser usage example
refactor(core): extract deduplication logic
```

### Changesets

For any user-facing change (feature, fix), create a changeset:

```bash
pnpm changeset
```

1. Select the package (`kindle-tools-ts`)
2. Choose version bump (`patch`, `minor`, `major`)
3. Write a changelog entry
4. Commit the generated file

---

## Pull Request Process

### Before Submitting

1. **Run all checks:**
   ```bash
   pnpm check   # Lint + format + typecheck
   pnpm test    # All tests pass
   pnpm build   # Build succeeds
   ```

2. **Update documentation** if needed (README, ARCHITECTURE)

3. **Add tests** for new features

4. **Create a changeset** for user-facing changes

### PR Checklist

When opening a PR, ensure:

- [ ] Branch is up-to-date with `main`
- [ ] All checks pass (`pnpm check && pnpm test && pnpm build`)
- [ ] Changeset created (if applicable)
- [ ] Tests added for new functionality
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow Conventional Commits

### Review Process

1. **Automated checks** run on every PR (CI)
2. **Maintainer review** within 3-5 business days
3. **Feedback** may be requested – please respond within a week
4. **Merge** once approved and all checks pass

---

## Coding Standards

### Import Conventions

We use a **Hybrid Import Approach**:

```typescript
// ✅ Local imports (same directory or subdirectories)
import { Helper } from "./helper.js";
import { Child } from "./child/index.js";

// ✅ Distant imports (other modules) - use subpath aliases
import { Utils } from "#utils/index.js";
import type { Clipping } from "#app-types/clipping.js";

// ❌ Avoid relative parent paths
import { Utils } from "../../utils/index.js";  // NO
```

### Code Style

- **Biome** handles formatting and linting
- **TypeScript strict mode** is enabled
- **No `any` types** — use `unknown` and type guards
- **Prefer `const`** over `let`
- **Explicit return types** on exported functions

### Error Handling

We use `neverthrow` for type-safe errors:

```typescript
import { ok, err, Result } from "neverthrow";

function parse(input: string): Result<Data, ParseError> {
  if (!input) return err({ code: "EMPTY_INPUT", message: "..." });
  return ok(parsedData);
}
```

---

## Testing

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test -- --coverage # With coverage
pnpm test -- <pattern>  # Run specific test file
```

### Writing Tests

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../src/module.js";

describe("myFunction", () => {
  it("should handle normal input", () => {
    expect(myFunction("input")).toBe("expected");
  });

  it("should handle edge case", () => {
    expect(myFunction("")).toBeNull();
  });
});
```

### Test Coverage Requirements

| Metric | Target |
|--------|--------|
| Lines | 80%+ |
| Functions | 80%+ |
| Branches | 80%+ |
| Statements | 80%+ |

---

## Documentation

### When to Update Docs

| Change | README | ARCHITECTURE |
|--------|--------|--------------|
| New API function | ✅ | ✅ |
| New exporter | ✅ | ✅ |
| New language | ✅ | ✅ |
| Bug fix | ❌ | ❌ |
| Internal refactor | ❌ | Consider |
| New config option | ✅ | ✅ |

### Documentation Style

- **Use tables** for structured information
- **Include code examples** with comments
- **Keep it concise** — link to details rather than duplicating

---

## Adding Features

### Adding an Exporter

See [ARCHITECTURE.md → How to Add a New Exporter](ARCHITECTURE.md#how-to-add-a-new-exporter)

### Adding a Language

See [ARCHITECTURE.md → How to Add a New Language](ARCHITECTURE.md#how-to-add-a-new-language)

### Summary Checklist

1. Create implementation in `src/`
2. Export from appropriate `index.ts`
3. Add tests in `tests/`
4. Update README.md tables
5. Update ARCHITECTURE.md if significant
6. Create changeset

---

## Reporting Issues

### Bug Reports

Please include:

1. **Version:** `kindle-tools-ts` version and Node.js version
2. **Environment:** OS, relevant dependencies
3. **Reproduction:** Minimal code/steps to reproduce
4. **Expected:** What you expected to happen
5. **Actual:** What actually happened
6. **Logs:** Any error messages or stack traces

### Feature Requests

Please include:

1. **Problem:** What problem does this solve?
2. **Proposal:** How do you propose solving it?
3. **Alternatives:** What alternatives did you consider?
4. **Use case:** Real-world scenario where this is needed

---

## Questions

- **Usage questions:** Open a [Discussion](https://github.com/KindleTools/kindle-tools-ts/discussions)
- **Bug reports:** Open an [Issue](https://github.com/KindleTools/kindle-tools-ts/issues)
- **Feature ideas:** Open an [Issue](https://github.com/KindleTools/kindle-tools-ts/issues) with `[Feature]` prefix

---

## Recognition

Contributors are recognized in:

- GitHub's contributor list
- Release notes (via changesets)
- Our gratitude 🙏

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

*Thank you for contributing to kindle-tools-ts!*
