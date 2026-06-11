# AGENTS.md

## Project

This project is a writing app for essays and fiction. The first target is an Electron desktop app focused on distraction-free long-form writing, with a web app planned later using as much shared code as possible.

The product should prioritize calm long-form writing, drafting, revision, organization, and safe synchronization across devices.

## Product Priorities

- Build the Electron desktop writing experience first.
- Keep the architecture web-compatible, but do not prioritize the browser web app in the first milestone.
- Support essays and fiction without forcing one rigid writing model.
- Preserve user writing above all else.
- Avoid destructive conflict handling.
- Keep the editor fast, quiet, and keyboard-friendly.

## Stack Direction

- Primary app: Electron desktop app.
- Future app: browser web app using shared packages where practical.
- Renderer: React and TypeScript.
- Styling: Tailwind CSS.
- Sync API: Cloudflare Workers.
- Durable storage: Cloudflare D1.
- Cache: Cloudflare KV.
- Realtime document coordination: Cloudflare Durable Objects if realtime multi-client editing is implemented.
- Collaborative document model: CRDT, preferably Yjs.
- Desktop packaging and update tooling should be selected when packaging becomes a milestone; Electron is the desktop runtime direction.

## Workspace And Tooling

- Use `pnpm` as the package manager and workspace runner.
- Keep the workspace layout as `apps/desktop`, `apps/web`, `apps/worker`, `packages/core`, `packages/shared`, and `packages/ui` unless there is a concrete reason to change it.
- `apps/desktop` is the primary app and should contain Electron main/preload/renderer composition, native lifecycle, IPC boundaries, and desktop-specific integration.
- `apps/web` is retained for the future browser app and should reuse packages rather than duplicate app logic.
- Put reusable UI components in `packages/ui`; keep app packages focused on app composition, routing, feature wiring, and platform-specific integration.
- Put editor-agnostic product/domain logic in `packages/core`, including document operations, sync state machines, recovery policies, and local store interfaces.
- Keep shared IDs, API contracts, and cross-runtime TypeScript types in `packages/shared`.
- Prefer Tailwind utility classes for styling. Avoid adding separate CSS files unless they are needed for global styles, editor-specific resets, or third-party integration.
- Prefer the relevant CLI for workspace/package operations instead of hand-editing generated package metadata when the CLI can do the job safely.
- Use Biome for formatting and linting.
- Use Knip for unused dependency, export, and file checks.
- Use TypeScript project checks for type safety.
- Prefer writing tests before implementation when behavior is non-trivial, especially in `packages/core`.
- Run `pnpm check` before considering a development slice complete.
- If `pnpm check` reports Biome, Knip, lint, or typecheck issues, fix the reported issues instead of bypassing them.
- Use `pnpm check:write` when safe automatic Biome fixes are appropriate, then rerun `pnpm check`.
- Include tests in the root validation harness once test tooling is configured; `pnpm check` should cover formatting/linting, Knip, typechecking, and tests.
- Use root scripts for common workflows: `pnpm dev`, `pnpm dev:desktop`, `pnpm dev:web`, `pnpm dev:worker`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm knip`, and `pnpm check`.

## Desktop Architecture

- Treat Electron as the primary runtime.
- Keep Electron main process code responsible for native window lifecycle, native menus, auto-update integration when added, filesystem access, and local database access when needed.
- Keep preload code as a narrow, typed, security-conscious IPC boundary.
- Keep renderer code focused on React app composition and interaction with `packages/ui`, `packages/editor` if added, `packages/core`, and the preload API.
- Do not put reusable domain logic directly in Electron main, preload, or renderer code if it can live in `packages/core`.
- Prefer platform interfaces in `packages/core` over importing Electron, SQLite, IndexedDB, or browser-only APIs directly into core logic.
- Desktop local persistence should prefer a durable local database such as SQLite when implementation begins, while preserving an abstraction that can later support IndexedDB for the browser web app.

## Concurrent Editing

The app must support the case where the same document is open in two or more app instances at the same time.

Do not use last-write-wins for document content. Do not silently overwrite document text from another client.

Use a CRDT-based document model for editable document content. Yjs is the preferred default unless there is a strong reason to choose another CRDT library.

Document changes should be represented as incremental CRDT updates. Clients should be able to apply local edits immediately and merge remote updates without manual conflict resolution.

## Sync Principles

- D1 is the canonical durable source of truth.
- KV may be used only for cache, derived state, recent metadata, or non-critical acceleration.
- KV must not be the canonical store for document content.
- Sync writes should be idempotent where possible.
- The system should tolerate duplicated, delayed, or out-of-order document updates.
- The system should prefer preserving conflicting user intent over choosing one writer as the winner.

## Realtime Collaboration Direction

For realtime same-document editing, use a Durable Object per document or per collaboration room.

A document Durable Object may:

- Accept WebSocket connections from active clients.
- Broadcast CRDT updates between clients.
- Track ephemeral presence state such as cursor, selection, and active users.
- Batch and persist CRDT updates to D1.
- Create compact document snapshots when needed.

Presence state should be treated as ephemeral and should not be stored as canonical document data.

## Persistence Direction

The storage model should distinguish between:

- Document metadata.
- CRDT update log.
- Compacted document snapshot.
- Revision or version history.
- Ephemeral presence.

D1 should store durable document data and update history. Snapshots may be used to avoid replaying an unbounded update log.

## Conflict And Recovery Rules

- Never discard local user edits because a remote version is newer.
- If automatic merge cannot preserve intent, keep both versions or expose a recovery path.
- Keep enough history to recover from sync bugs during early development.
- Avoid irreversible destructive operations unless explicitly confirmed by the user.

## UX Principles

- The editor should feel like a writing surface, not an admin dashboard.
- Keep primary writing actions close and secondary actions quiet.
- Support keyboard-first desktop usage.
- Make sync status visible but not distracting.
- If a document is open elsewhere, communicate that clearly.
- Presence and collaboration indicators should be subtle.

## Engineering Rules

- Make the smallest correct change.
- Prefer readable code over clever abstractions.
- Keep frontend, Worker, D1, KV, and Durable Object responsibilities clear.
- Do not add compatibility layers unless persisted data, external consumers, or explicit requirements make them necessary.
- Do not introduce new frameworks, services, or storage layers without documenting why.
- For `packages/core`, use a test-first workflow when adding document operations, sync state machines, local store interfaces, recovery policies, or CRDT update handling.
- Core tests should describe observable behavior and invariants, not implementation details.
- Keep core tests platform-agnostic; do not require Electron, DOM, SQLite, IndexedDB, network access, or Cloudflare runtime.
- When a bug is found in core logic, add or update a failing test before fixing it unless the issue is purely mechanical.

## Security And Privacy

- User writing is private by default.
- Do not log document contents.
- Treat sync endpoints as untrusted input boundaries.
- Check document ownership and authorization explicitly.
- Avoid storing sensitive document content in cache unless there is a clear reason and expiration policy.

## Testing And Verification

Prefer tests before implementation for domain behavior. This is not strict TDD for every UI or wiring change, but `packages/core` should lean TDD because it protects user writing, sync safety, and recovery behavior.

The validation harness should eventually include:

- Biome formatting and linting.
- Knip unused dependency, export, and file checks.
- TypeScript project checks.
- Unit tests.

Test sync behavior with:

- Two clients editing the same document simultaneously.
- One client going offline, editing, then reconnecting.
- Duplicated sync requests.
- Out-of-order CRDT updates.
- Snapshot restore plus later update replay.
- Unauthorized document access attempts.

Manual verification should start with desktop viewport behavior.

## Future Considerations

- Offline-first editing.
- Version history.
- Export to Markdown, PDF, DOCX, or EPUB.
- Mobile writing mode.
- Conflict recovery UI.
- Full collaborative presence.
