# Contributing to kindle-tools-ts

First off, thanks for taking the time to contribute!

## Development

This project uses [pnpm](https://pnpm.io/) for dependency management.

### Setup

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install dependencies
pnpm install
```

### Commands

- `pnpm dev`: Start compilation in watch mode
- `pnpm build`: Build the project (ESM, CJS, and types)
- `pnpm test`: Run tests
- `pnpm lint`: Run Biome linter
- `pnpm format`: Format code with Biome

## Pull Requests

1. Fork the repo and create your branch from `main`.
2. Make sure your code passes `pnpm lint` and `pnpm test`.
3. If you've added code that should be tested, add tests.
4. **Changesets**: If you are making a valid change to the codebase (feature, fix, etc.), please run `pnpm changeset` to generate a changeset file. This helps us automate releases.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
