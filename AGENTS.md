# AGENTS.md

## Project

This project is a writing app for essays and fiction. The first target is an Electron desktop app focused on distraction-free long-form writing, with a web app planned later using as much shared code as possible.

The product should prioritize calm long-form writing, drafting, revision, organization, and safe synchronization across devices.

## Product Priorities

- Build the Electron desktop writing experience first.
- Keep the architecture web-compatible, but do not prioritize the browser web app in the first milestone.
- Support essays and fiction without forcing one rigid writing model.
- Use books/projects as the top-level writing container and documents as chapter/note/draft units inside a book.
- The current writing hierarchy is `Book -> optional top-level episodes -> Chapter -> episodes`. A document always belongs to a book, but `DocumentMetadata.chapterId` may be `null` for book-level episodes.
- Do not force every episode into a chapter. Chapterless episodes inside a normal book are valid writing units, not Quick Drafts or orphaned data.
- Start writers in a library view where they can select a book, create a book, or start writing without choosing a book.
- Treat bookless writing as a product concept backed by a non-destructive `Quick Drafts` system book until a true nullable-book model is needed.
- Keep Quick Drafts backed by the system book and inbox chapter. This is separate from normal book-level episodes with `chapterId: null`.
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

- Use `pnpm` as the package manager and Turborepo as the workspace task runner.
- Keep the workspace layout as `apps/desktop`, `apps/web`, `apps/worker`, `packages/core`, `packages/shared`, and `packages/ui` unless there is a concrete reason to change it.
- `apps/desktop` is the primary app and should contain Electron main/preload/renderer composition, native lifecycle, IPC boundaries, and desktop-specific integration.
- `apps/web` is retained for the future browser app and should reuse packages rather than duplicate app logic.
- Put reusable UI components in `packages/ui`; keep app packages focused on app composition, routing, feature wiring, and platform-specific integration.
- Put editor-agnostic product/domain logic in `packages/core`, including document operations, sync state machines, recovery policies, and local store interfaces.
- Keep book, chapter, note, and draft metadata behavior in `packages/core`; app layers should compose these concepts rather than redefining them.
- Allow books to exist without documents; empty book workspaces should show creation actions instead of forcing a placeholder document.
- Keep document ordering explicit with metadata and prefer simple move up/down behavior before drag-and-drop.
- Keep chapter ordering explicit with metadata and simple move up/down behavior.
- Keep shared IDs, API contracts, and cross-runtime TypeScript types in `packages/shared`.
- Prefer Tailwind utility classes for styling. Avoid adding separate CSS files unless they are needed for global styles, editor-specific resets, or third-party integration.
- Prefer the relevant CLI for workspace/package operations instead of hand-editing generated package metadata when the CLI can do the job safely.
- Use Biome for formatting and linting.
- Use Knip for unused dependency, export, and file checks.
- Use TypeScript project checks for type safety.
- Use `turbo.json` to define workspace task behavior, dependencies, caching, and persistent dev tasks.
- Root `pnpm dev`, `pnpm build`, and `pnpm typecheck` should execute through Turbo so all relevant workspace packages participate consistently.
- Prefer writing tests before implementation when behavior is non-trivial, especially in `packages/core`.
- Run `pnpm check` before considering a development slice complete.
- If `pnpm check` reports Biome, Knip, lint, or typecheck issues, fix the reported issues instead of bypassing them.
- Use `pnpm check:write` when safe automatic Biome fixes are appropriate, then rerun `pnpm check`.
- Include tests in the root validation harness once test tooling is configured; `pnpm check` should cover formatting/linting, Knip, typechecking, and tests.
- Use root scripts for common workflows: `pnpm dev`, `pnpm dev:desktop`, `pnpm dev:web`, `pnpm dev:worker`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm knip`, and `pnpm check`.
- `pnpm dev` should run all app dev processes through Turbo; use `pnpm dev:desktop`, `pnpm dev:web`, or `pnpm dev:worker` only when intentionally running one target.

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
- Empty space in the writing surface should behave like editable paper: show a text cursor and focus the editor instead of becoming dead space.
- Keep primary writing actions close and secondary actions quiet.
- Buttons should use the global button cursor style. Do not add Tailwind `cursor-pointer` to individual `<button>` elements unless a special state needs an override; keep `cursor-pointer` only for non-button interactive elements that need it.
- Keep sidebar insertion affordances quiet. Prefer contextual floating insert buttons and context menus over large persistent add buttons in the chapter tree.
- Book-level episode creation belongs in the empty-sidebar context menu or book empty state, not as a floating `+` above the first chapter. That UI was noisy and should not be reintroduced.
- Empty chapter episode insertion should reuse the existing floating insert `+` affordance anchored to the chapter card, not a large `+ New episode` row.
- Sidebar chapter expansion is local UI state, not the same as selection. Chapter clicks should toggle that chapter open/closed without collapsing other chapters. Selecting an episode may expand its parent chapter, but must not collapse unrelated chapters.
- Context menus in `packages/ui` should use the shared `ContextMenu` component so icons, spacing, separators, destructive styling, and close behavior remain consistent.
- Context menus should close on outside pointer down and Escape. Do not attach a global `contextmenu` close handler that races with opening a new context menu.
- Dropdowns, popovers, and non-context menus must also close on outside pointer down and Escape. The outside check must include the trigger plus the floating panel, otherwise clicking the trigger can close and immediately reopen the menu.
- Tailwind named groups must be scoped carefully. Do not reuse the same named group for nested sidebar rows; chapter and episode rows need distinct group names so hovering an episode does not reveal chapter controls.
- Row move arrows should not appear just because a row is selected or focus is inside an expanded section. They should be quiet hover affordances or available through context menus.
- Support keyboard-first desktop usage.
- Make sync status visible but not distracting; prefer subtle indicators over prominent status text.
- Support a collapsible navigation/sidebar so writers can focus on the current draft.
- If a document is open elsewhere, communicate that clearly.
- Presence and collaboration indicators should be subtle.

## Engineering Rules

- Make the smallest correct change.
- Prefer readable code over clever abstractions.
- When refining UI, avoid introducing new layout space for an affordance unless that is explicitly desired. Floating controls should be anchored to the intended row/card, not placed in arbitrary wrapper heights.
- Before adding a new UI pattern, check whether an existing component already expresses the same interaction. Reuse existing affordances such as the floating insert button and shared context menu instead of creating near-duplicates.
- For React IME-sensitive text inputs, do not blur or submit on Enter while composition is active. Check `event.nativeEvent.isComposing` or `event.keyCode === 229` before handling Enter.
- Focus behavior for episodes: newly selected titled episodes should focus the editor body at the end; untitled episodes should focus the title input. Pressing Enter from an episode title should focus the editor body.
- When changing hover behavior in nested UI, remember that CSS `:hover` applies to ancestors. Scope hover groups to the exact card/row that owns the control.
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
