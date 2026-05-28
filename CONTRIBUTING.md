# Contributing to SenderKit SDK

Thanks for your interest in contributing! This repo is a pnpm monorepo containing
the `@senderkit/sdk`, `@senderkit/cli`, and `@senderkit/react-email` packages.

## Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io) 10+ (`corepack enable` will pick up the pinned version)

## Development loop

```bash
pnpm install      # install all workspace dependencies
pnpm build        # build every publishable package
pnpm test         # run the full test suite
pnpm -r typecheck # type-check every workspace project
```

Per-package scripts (`build`, `test`, `test:watch`, `typecheck`) are available via
`pnpm --filter @senderkit/<pkg> <script>`.

## Making a change

1. Create a branch off `main`.
2. Make your change and add tests — every package uses [Vitest](https://vitest.dev).
3. Make sure `pnpm build`, `pnpm test`, and `pnpm -r typecheck` all pass.
4. **Add a changeset** describing your change:

   ```bash
   pnpm changeset
   ```

   Pick the affected package(s) and bump level (patch/minor/major) and write a short,
   user-facing summary. Releases are automated from changesets on merge to `main`.
5. Open a pull request. CI runs build, test, and typecheck on every PR.

## Pre-release / beta channel

Use the Changesets pre-release workflow to publish a beta version without touching the `latest` dist-tag. This is useful for testing infrastructure changes (e.g. CI, publishing pipeline) or getting early feedback on breaking changes.

**Enter pre-release mode on a dedicated branch:**

```bash
git checkout -b beta
pnpm changeset pre enter beta
```

Add changesets and commit normally. When merged to `beta`, the release workflow publishes with the `beta` dist-tag:

```bash
npm install @senderkit/sdk@beta
```

**Exit pre-release mode** (merge back to `main` once stable):

```bash
pnpm changeset pre exit
git add .changeset/pre.json
git commit -m "chore: exit pre-release mode"
```

> Only maintainers with npm publish access should merge to `beta` or manage pre-release mode.

## Reporting bugs & requesting features

Use the GitHub issue templates. For security issues, **do not** open a public
issue — see [SECURITY.md](./SECURITY.md).

## Code of conduct

By participating you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).
