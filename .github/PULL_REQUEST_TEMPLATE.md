name: Pull request
description: Open a pull request against the Goyo repository.
---

## Summary

What does this change and why? Keep it short. Reference the issue this
resolves with `Closes #123` or `Refs #123`.

## Changes

- ...
- ...

## Affected areas

Check the parts of the codebase that this PR touches.

- [ ] `apps/desktop` (Electron main / preload / renderer)
- [ ] `apps/worker` (Cloudflare sync API)
- [ ] `apps/web` (Goyo Cloud product web app)
- [ ] `apps/landing` (public marketing site)
- [ ] `packages/core` (domain logic, sync, recovery)
- [ ] `packages/editor` (Tiptap integration)
- [ ] `packages/ui` (shared React components)
- [ ] `packages/shared` (cross-runtime types)
- [ ] Documentation (`README.md`, `AGENTS.md`, `docs/`, `TODO.md`)
- [ ] CI / GitHub Actions
- [ ] Build, packaging, or release flow

## Tests

Describe the tests you added or changed and why. If you did not add tests,
explain why (e.g. docs-only, mechanical change).

For changes in `packages/core`, attach the failing test you wrote first.

## User writing or sync impact

If this PR changes anything that touches user documents, sync behavior,
or recovery paths, describe:

- What failure modes you considered
- How the change handles each one
- Whether it is destructive in any case (and if so, why that is safe)

## Validation

- [ ] `pnpm install --frozen-lockfile` was run
- [ ] `pnpm check` passes locally
- [ ] `pnpm build` passes locally (when relevant)
- [ ] Knip does not flag new dead dependencies, exports, or files
- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md) and [AGENTS.md](../AGENTS.md)
- [ ] I updated `TODO.md` if I finished a planned item

## Screenshots / recordings (UI only)

Attach before/after for UI changes. Short clips are appreciated for
animations or transitions.

## Notes for reviewers

Anything the reviewer should pay extra attention to. Optional questions
where you want a second opinion.
