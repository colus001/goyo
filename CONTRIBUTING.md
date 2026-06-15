# Contributing to Goyo

Thanks for your interest in Goyo. This guide covers everything you need to
make a change and open a pull request.

## Before you start

- Goyo is an early-preview project. APIs, schemas, and project structure
  change often. Open an issue before starting non-trivial work so the
  direction is clear before you spend time on it.
- For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a
  public issue.
- By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development environment

Required:

- **Node.js 24** (matches CI)
- **pnpm 10.33.4** (the repo pins `packageManager` in `package.json`; use
  Corepack or install it manually)
- A POSIX shell

Optional but useful:

- Wrangler for the Worker and Cloudflare deploys
- An Apple Developer account for macOS code signing
- A Windows code signing certificate for Windows release builds

## Setup

```sh
pnpm install --frozen-lockfile
```

If `better-sqlite3` needs to be rebuilt for your Electron version (e.g. after
pulling a new Electron), run:

```sh
pnpm rebuild better-sqlite3
```

## Workspace layout

| Path | Purpose |
| --- | --- |
| `apps/desktop` | Electron desktop app. `apps/desktop/package.json` is the source of truth for the published desktop version. |
| `apps/landing` | Public marketing site. |
| `apps/web` | Goyo Cloud product web app. |
| `apps/worker` | Cloudflare Worker sync and auth API. |
| `packages/core` | Platform-agnostic writing, sync, recovery, and domain logic. |
| `packages/editor` | Shared editor integration. |
| `packages/shared` | Shared types and cross-runtime constants. |
| `packages/ui` | Reusable UI components. |

The `apps/desktop` package is the primary runtime. Other apps and packages
are kept web-compatible where practical, but the browser app is not the
first milestone.

## Running one app

The full `pnpm dev` task runs every dev server through Turbo. For a tight
inner loop, run a single target:

```sh
pnpm dev:desktop
pnpm dev:landing
pnpm dev:web
pnpm dev:worker
```

## Validation

Before opening a pull request, run:

```sh
pnpm check
```

This runs, in order:

1. Biome (format and lint)
2. Knip (unused dependencies, exports, files)
3. TypeScript project checks across all workspace packages
4. Vitest

To auto-fix what Biome can safely fix:

```sh
pnpm check:write
```

Re-run `pnpm check` after `check:write` to confirm.

If `pnpm check` reports issues, fix them. Do not bypass with `--no-verify`,
inline ignores, or unrelated refactors.

## Code style

- TypeScript everywhere. Avoid `any`; the Biome rule `noExplicitAny` is set to
  `error`.
- Prefer the existing shared utilities in `packages/core` and `packages/ui`
  over introducing new ones.
- Use Tailwind utility classes for styling. Do not add new global CSS files
  unless they are required for editor resets or third-party integration.
- Editor and `packages/core` changes that affect observable behavior must
  include tests. See `AGENTS.md` for the test-first rule on domain logic.
- Keep changes minimal. Prefer the smallest correct change over a clever
  abstraction.

## Commit messages

This repo uses Conventional Commits with a scope:

```text
type(scope): subject

body (optional)
```

Common types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `build`,
`ci`. Scopes usually match a workspace: `desktop`, `web`, `worker`,
`landing`, `core`, `editor`, `ui`, `shared`, or `deps`. Examples from the
history: `feat(desktop): add auto-updater main process`, `fix(worker): add
CORS headers to all API responses`, `chore: bump version to 0.1.6`.

The subject line stays under ~72 characters and uses an imperative mood
("add", not "added").

## Pull requests

- Open a draft PR early if you want feedback before the work is done.
- Fill in the pull request template. Link the issue it resolves.
- Make sure CI is green. CI runs `pnpm check` and `pnpm build`.
- Keep PRs focused. Split unrelated changes into separate PRs.
- New workspace dependencies must be justified in the PR description. Knip
  must not flag them.
- For changes that affect user writing, sync behavior, or recovery paths,
  describe the failure modes considered and how the change handles them.

## Releases

Tagged desktop releases (`v*`) trigger the `release-desktop.yml` workflow.
The version is read from `apps/desktop/package.json`. Do not bump the
desktop version unless you intend to ship a release.

## Documentation

- `AGENTS.md` is the canonical product and engineering guide. If your change
  affects the writing model, sync principles, or UX rules, update it.
- `README.md` covers public setup and self-hosting.
- `docs/local-first-architecture.md` describes the storage and runtime model.
- `TODO.md` tracks planned milestones. When you finish a TODO item, mark it
  done in the same PR.
