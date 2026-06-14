# TODO.md

## Milestone 0: Product And Technical Foundation

- [x] Initialize the repository structure.
- [x] Create the Electron + React + TypeScript desktop app.
- [x] Create the Vite + React + TypeScript web app scaffold for future reuse.
- [x] Create the Cloudflare Worker app structure.
- [x] Decide the monorepo layout, preferably `apps/desktop`, `apps/landing`, `apps/worker`, `packages/core`, `packages/shared`, and `packages/ui`.
- [x] Configure TypeScript across the workspace.
- [x] Configure linting and formatting.
- [x] Configure Turborepo workspace task runner.
- [x] Configure Tailwind CSS for web styling.
- [x] Add shared UI package structure.
- [x] Add core domain package structure.
- [x] Add basic test tooling.
- [x] Add local development scripts.
- [x] Document the local-first architecture.
- [x] Document the role of SQLite, IndexedDB, Yjs, D1, KV, and Durable Objects.

## Milestone 1: Electron Desktop Shell

- [x] Add `apps/desktop` package.
- [x] Configure Electron main process.
- [x] Configure Electron preload boundary.
- [x] Configure React renderer with Vite and Tailwind.
- [x] Reuse `packages/ui` from the desktop renderer.
- [x] Add root `pnpm dev:desktop` script.
- [x] Make `pnpm dev` run all app dev processes through Turbo.
- [x] Add a minimal native application menu.
- [x] Verify desktop window lifecycle on macOS.
- [x] Verify `pnpm check` and `pnpm build` include the desktop app.

## Milestone 2: Core Domain And Platform Boundaries

- [x] Add `packages/core` package.
- [x] Define document metadata types and operations in `packages/core`.
- [x] Define book metadata and document kind concepts in `packages/core`.
- [x] Define local document store interfaces in `packages/core`.
- [x] Define sync queue interfaces in `packages/core`.
- [x] Define recovery policy interfaces in `packages/core`.
- [x] Keep Electron, SQLite, IndexedDB, and browser APIs out of `packages/core`.
- [x] Keep shared IDs and API contracts in `packages/shared`.

## Milestone 3: Local-First Desktop Editor MVP

- [x] Add Tiptap/ProseMirror editor.
- [x] Add Yjs as the document model for editor content.
- [x] Connect Tiptap to Yjs using the appropriate ProseMirror/Yjs binding.
- [x] Create a desktop-first editor layout.
- [x] Add document creation.
- [x] Add document opening.
- [x] Add document title editing.
- [x] Add library-first book selection.
- [x] Add Quick Drafts for writing without choosing a book.
- [x] Allow empty book workspaces without forcing a placeholder document.
- [x] Support book-level episodes with `chapterId: null` inside normal books.
- [x] Keep Quick Drafts as a separate system book and inbox chapter for bookless writing.
- [x] Add local autosave status.
- [x] Persist editor content locally without relying on a server.
- [x] Verify that a document survives app restart.
- [x] Verify long-form writing performance with a large document.

## Milestone 4: Local Document Store

- [x] Choose the desktop local store implementation, preferably SQLite.
- [x] Keep the local store behind `packages/core` interfaces.
- [x] Store local document metadata separately from document content updates.
- [x] Store local book metadata separately from document content updates.
- [x] Store local chapter metadata separately from document content updates.
- [x] Store Yjs incremental updates locally.
- [x] Add local document snapshots or compacted state.
- [x] Add a local unsynced update queue.
- [x] Add document list indexing.
- [x] Add archive or soft-delete state.
- [x] Add archive or soft-delete state for books, chapters, and documents.
- [x] Verify that a document can be restored from local metadata plus local Yjs data.
- [x] Verify that local writes remain safe while offline.

## Milestone 5: CRDT Sync Core

- [x] Implement Yjs update generation for local edits.
- [x] Implement Yjs update replay.
- [x] Implement state vector based comparison.
- [x] Implement duplicate update handling.
- [x] Implement out-of-order update handling.
- [x] Implement snapshot restore plus later update replay.
- [x] Add tests for two local clients editing the same document.
- [x] Add tests for offline edit then reconnect simulation.
- [x] Add tests for duplicated update delivery.
- [x] Add tests for out-of-order update delivery.
- [x] Add sync queue recovery for local updates and snapshots missing pending queue entries.

## Milestone 6: Worker And D1 Persistence

- [x] Add Cloudflare Worker health endpoint.
- [x] Configure Wrangler for local development.
- [x] Re-evaluate Drizzle or another typed SQL layer before building the D1 schema.
- [x] If adopting Drizzle, introduce it at the persistence boundary rather than in `packages/core`.
- [x] Create initial D1 schema.
- [x] Add `documents` table.
- [x] Add `document_updates` table.
- [x] Add `document_snapshots` table.
- [x] Add `document_revisions` or equivalent revision metadata table if needed.
- [x] Add `sync_clients` table if needed.
- [x] Add document metadata API.
- [x] Add CRDT update upload API.
- [x] Add CRDT update download API.
- [x] Add snapshot read/write API.
- [x] Ensure D1 remains the canonical remote store.
- [x] Ensure KV is not required to restore document content.

## Milestone 7: Incremental Remote Sync

- [x] Push local unsynced Yjs updates to the Worker.
- [x] Pull missing remote Yjs updates from the Worker.
- [x] Push local document snapshots to the Worker.
- [x] Pull the latest remote document snapshots into the desktop store.
- [x] Use state vectors or equivalent sync metadata to avoid full document transfer.
- [x] Add sync retry and backoff.
- [x] Add subtle sync status UI.
- [x] Handle offline mode without blocking local editing.
- [x] Handle reconnect after offline edits.
- [x] Verify same-document editing from two desktop app instances.
- [x] Verify duplicated sync requests are safe.
- [x] Verify delayed or out-of-order remote updates are safe.

## Milestone 8: Desktop Writing Experience

- [x] Add left-side document or project navigation.
- [x] Add move up/down document ordering controls.
- [x] Add move up/down chapter ordering controls.
- [x] Add calm central writing surface.
- [x] Add quiet toolbar or command surface.
- [x] Restore the last app state on launch, including the previous book, selected episode, sidebar collapse state, and chapter expansion state.
- [x] Persist app UI state locally, including last route, selected book, selected episode, sidebar collapse state, and chapter expansion state.
- [x] Add a startup restore flow that opens the last valid workspace state, falling back safely to the library if the saved book or episode was archived or deleted.
- [x] Add tests or manual verification for startup restore with normal books, Quick Drafts, archived items, and empty workspaces.
- [x] Persist focused writing mode once it is exposed as separate UI state.
- [x] Add a settings menu or settings surface for app-level preferences.
- [x] Add a settings storage foundation for app-level preferences.
- [x] Add a setting to enable or disable restoring the last workspace on launch.
- [x] Add initial settings sections for writing preferences, appearance placeholders, and future sync/account preferences.
- [x] Define a themeable appearance color system with a small fixed UI palette.
- [x] Defer dark theme and user theme selection until the settings surface is implemented.
- [x] Add keyboard shortcuts for primary writing actions.
- [x] Add keyboard shortcuts for sidebar toggle, new document, new chapter, focus editor, and return to library.
- [x] Add word count.
- [x] Add document status metadata.
- [x] Add focused writing mode.
- [x] Add collapsible sidebar navigation.
- [x] Add library-first book grid with book creation and accent color selection.
- [x] Add chapter creation modal and chapter delete confirmation.
- [x] Add book delete confirmation and soft archive flow.
- [x] Add shared context menu UI for sidebar empty space, chapters, and episodes.
- [x] Add empty-sidebar context menu actions for new document, new chapter, expand all, and collapse all.
- [x] Keep chapter expansion state independent from chapter or episode selection.
- [x] Focus titled episodes into the editor body and untitled episodes into the title input.
- [x] Protect Korean/IME title entry from Enter composition bugs.
- [x] Add search.
- [x] Support essay-style document workflows.
- [x] Support basic fiction chapter workflows.
- [x] Support fiction episode workflows inside and outside chapters.

## Recent Implementation Notes

- [x] Implemented `Book -> top-level episodes -> Chapter -> episodes` navigation.
- [x] Migrated desktop SQLite `documents.chapter_id` to support nullable chapter ids.
- [x] Split reusable UI pieces including shared `ContextMenu`, book episode list, chapter dialogs, and chapter expansion state.
- [x] Added core tests for book-level episodes and chapter reordering.
- [x] Manually verify desktop restart restores books, chapters, book-level episodes, chapter episodes, ordering, archived state, and Yjs content.
- [x] Manually verify context menus open and close consistently via outside click and Escape across sidebar empty space, chapters, and episodes.
- [x] Manually verify sidebar hover affordances only appear for the row/card being hovered.
- [x] Decided not to switch the current desktop SQLite store to Drizzle immediately; prioritize local store invariants, snapshots, unsynced queue, and CRDT sync safety first.
- [x] Revisit Drizzle when adding Worker D1 persistence, where shared schema management and typed queries may provide more value.
- [x] Keep any future ORM or typed SQL layer out of `packages/core`; core should continue to expose platform-neutral store interfaces.
- [x] Added local snapshot storage with `lastUpdateId` checkpoints and document loading from latest snapshot plus later Yjs updates.
- [x] Added local unsynced queue entries for document updates and document snapshots.
- [x] Added `packages/core` CRDT adapter abstraction around Yjs with replay, duplicate, out-of-order, state vector, two-client, and offline reconnect tests.
- [x] Added document sync utilities that connect CRDT replay/state vectors with document update records, snapshots, pending queue selection, and sync queue recovery.
- [x] Verified local writes remain safe while offline.
- [x] Created Cloudflare D1 database `writer-sync` and initial Worker migration for documents, CRDT updates, snapshots, and sync clients.
- [x] Applied initial D1 migration locally and remotely with Wrangler CLI.
- [x] Added idempotent Worker CRDT update upload and ordered update download APIs using D1 as the canonical store.
- [x] Added idempotent Worker snapshot upload and latest snapshot read APIs using D1 as the canonical store.
- [x] Re-evaluated Drizzle for Worker D1 persistence and kept raw SQL migrations/queries for now to prioritize explicit CRDT update and snapshot storage semantics.
- [x] Verified remote document content can be restored from D1-backed update logs and snapshots without KV.
- [x] Added Worker document metadata upsert and read APIs backed by D1.
- [x] Added desktop main-process push sync for pending local Yjs updates, including remote metadata upsert before update upload and queue completion after successful push.
- [x] Added desktop main-process pull sync for missing remote Yjs updates using `afterUpdateId` and duplicate-safe local append.
- [x] Added desktop main-process snapshot push/pull sync and startup wiring after update sync.
- [x] Added sync queue retry tracking and exponential backoff for failed desktop update and snapshot pushes.
- [x] Added renderer sync status, offline detection, reconnect sync, and quiet sidebar status text without blocking local writing.
- [x] Verified remote duplicate update and snapshot requests return idempotent results and cleaned up test D1 rows.
- [x] Verified out-of-order remote update upload is returned in replay order by `created_at, id` and cleaned up test D1 rows.
- [x] Verified two-client remote CRDT update replay preserves both clients' edits and cleaned up test D1 rows.
- [x] Treat `afterUpdateId` pull checkpoints as the current equivalent sync metadata for avoiding full document transfer; state-vector diff remains available in core for future finer-grained sync.
- [x] Added desktop-local `app_ui_state` persistence for last screen, active book/chapter/document, sidebar collapse, and expanded chapters.
- [x] Added startup restore fallback tests for valid documents, missing books, Quick Drafts, and empty workspaces.
- [x] Treated chapterless book documents as the initial essay workflow without adding project-type schema or rigid book templates.
- [x] Added desktop app settings storage and a library settings surface with writing, appearance, and sync/account sections.
- [x] Added a non-destructive launch restore preference that starts in the library without deleting saved workspace state when disabled.
- [x] Added preset light and dark writing themes, custom color chip sharing, and theme color editing in Settings.
- [x] Expand font diversity support with more writing fonts, interface fonts, Korean-friendly type choices, and genre-appropriate presets.
- [x] Bundled open-source Inter, Noto Sans KR, Noto Serif KR, Literata, Source Serif 4, and Source Code Pro fonts behind preview dropdowns with system/English/Korean language-controlled samples.
- [x] Added local recovery point metadata backed by desktop SQLite snapshots.
- [x] Added automatic checkpoint recovery points using the existing editor snapshot cadence and core recovery policy.
- [x] Added a quiet writing toolbar action for manual restore point creation from the current Yjs document state.
- [x] Added core recovery tests for checkpoint policy, recovery point retention, and update log compaction candidates.
- [x] Added desktop APIs for recovery point listing/saving and archived document listing/restoration foundations.
- [x] Identified that restore-as-copy needs a Yjs fragment migration because current snapshots are keyed by source `documentId`.
- [x] Added Yjs snapshot fragment copy support so recovery snapshots can be restored into a new document id.
- [x] Added restore-as-copy from document recovery points without mutating the source document.
- [x] Added a quiet document-level restore points strip with refresh and restore-copy actions.
- [x] Added Settings Recovery section for deleted documents with original-location restore and Quick Drafts copy fallback.
- [x] Added sync failure summary, forced retry-now action, and Settings sync recovery card that separates remote sync issues from local writing safety.
- [x] Added export-only local JSON backup for books, chapters, documents, CRDT updates, snapshots, and recovery points.
- [x] Treated local `document_recovery_points` as the current revision metadata equivalent; defer remote `document_revisions` until auth and ownership are defined.
- [x] Added remote snapshot policy: pulled remote snapshots are saved as local snapshots and recorded as `remote-snapshot` recovery points without adding a D1 revisions table.
- [x] Verified recovery from local data after remote sync failure via local checkpoints, restore-as-copy, deleted-document recovery, sync attention status, retry-now, and export-only backup paths.
- [x] Verified snapshot plus later update recovery through existing snapshot replay/load tests and the latest-snapshot-plus-`listAfter(lastUpdateId)` desktop loading path.
- [x] Added single-document export from the active editor to plain text, Markdown, and HTML without depending on remote sync state.
- [x] Added active chapter export for fiction workflows by combining ordered chapter episodes into plain text, Markdown, or HTML.
- [x] Evaluated PDF export: prefer reusing HTML export with an Electron print-to-PDF path once export styling is stabilized.
- [x] Evaluated DOCX export: defer implementation until a `docx` package integration can map document/chapter structure explicitly.
- [x] Evaluated EPUB export: defer until book-level export is stable because EPUB needs XHTML packaging, metadata, and spine generation.

## Milestone 9: Recovery And Version Safety

- [x] Add automatic local checkpoints.
- [x] Add remote snapshot policy.
- [x] Add manual restore points.
- [x] Add deleted document recovery.
- [x] Add sync failure recovery path.
- [x] Add local backup export.
- [x] Add update log compaction policy.
- [x] Verify recovery from local data after remote sync failure.
- [x] Verify recovery from snapshot plus later updates.

## Milestone 10: Realtime Same-Document Editing

- [ ] Add Durable Object per document or collaboration room.
- [ ] Add WebSocket connection handling.
- [ ] Broadcast Yjs updates between connected clients.
- [ ] Track connected clients.
- [ ] Add ephemeral cursor or selection presence.
- [ ] Batch and persist updates to D1.
- [ ] Fall back to normal sync when realtime is unavailable.
- [ ] Verify realtime editing from two clients.
- [ ] Verify Durable Object restart recovery from D1 and local updates.

## Milestone 11: Export

- [x] Add plain text export.
- [x] Add Markdown export.
- [x] Add HTML export.
- [x] Evaluate PDF export.
- [x] Evaluate DOCX export.
- [x] Evaluate EPUB export.
- [x] Support essay export.
- [x] Support fiction chapter export.
- [x] Verify export works independently from remote sync state.

## Milestone 12: Auth And Multi-Device Accounts

- [x] Choose an authentication approach.
- [x] Add user identity model.
- [x] Add document ownership checks.
- [x] Add device or sync client identity.
- [x] Add sync client registration if needed.
- [x] Block unauthorized document metadata access.
- [x] Block unauthorized document update access.
- [x] Verify multiple devices can sync documents for the same user.
- [x] Verify one user cannot access another user's document updates.

## Milestone 13: Goyo Cloud Web Account And Login

### 13A: Product Scope And Deployment Shape

- [x] Add `apps/web` as the Goyo Cloud product web app, separate from the public `apps/landing` marketing site.
- [ ] Deploy the Goyo Cloud web app at `goyo-cloud.seokjun.kim`.
- [x] Keep `apps/landing` focused on marketing, downloads, and public product information without account or billing state.
- [x] Keep Goyo Cloud signup open; do not add invite-only or closed beta gating.
- [x] Defer payment implementation until the auth/account foundation is working.
- [x] Add a billing placeholder in `apps/web` without implementing payment yet.
- [ ] Add billing and entitlement data structures only where they help future payment integration.
- [x] Do not enforce sync usage limits in this milestone so login and sync can be tested freely.

### 13B: Web App Foundation

- [x] Scaffold `apps/web` with React, Vite, TypeScript, and Tailwind using the current workspace conventions.
- [x] Add root `pnpm dev:web` script.
- [x] Ensure root `pnpm dev`, `pnpm build`, `pnpm typecheck`, and `pnpm check` include `apps/web` through Turbo.
- [x] Add `apps/web` routes for `/login`, `/verify`, `/account`, and `/billing`.
- [x] Add a minimal authenticated account shell showing email, account status, sync status, and billing placeholder.
- [x] Keep browser writing/editor functionality out of `apps/web` for this milestone.

### 13C: Shared Auth Contracts

- [x] Add shared auth API contracts in `packages/shared` for login start, login verification, current user, and logout.
- [x] Define `AuthStartRequest` and `AuthStartResponse`.
- [x] Define `AuthVerifyRequest` and `AuthVerifyResponse`.
- [x] Define `AuthUser`, `AuthMeResponse`, and `AuthLogoutResponse`.
- [x] Define shared auth error response types.
- [x] Reuse shared auth contracts from Worker, Web, and Desktop.

### 13D: Worker Auth Storage And Email

- [x] Add Worker D1 tables for users, email login codes, and auth sessions.
- [x] Add future-ready billing or entitlement tables without enforcing plan limits yet.
- [x] Store user emails normalized and unique.
- [x] Store only hashed login codes and hashed session tokens in D1.
- [x] Add login code expiry, attempt limits, and resend cooldowns.
- [ ] Add Cloudflare Email Service integration for sending one-time email login codes.
- [ ] Send login emails from `Goyo <no-reply@goyo.seokjun.kim>`.
- [ ] Keep email existence private by returning the same start-login response for new and existing users.

### 13E: Worker Auth Endpoints

- [ ] Add Worker auth endpoint `POST /v1/auth/start`.
- [ ] Add Worker auth endpoint `POST /v1/auth/verify`.
- [ ] Add Worker auth endpoint `GET /v1/auth/me`.
- [ ] Add Worker auth endpoint `POST /v1/auth/logout`.
- [ ] Add open signup with email code verification; create a user automatically when a verified email has no existing account.
- [ ] Use secure httpOnly, Secure, SameSite=Lax cookies for web sessions.
- [ ] Return a Desktop bearer token from verification when the request is from Desktop.
- [ ] Revoke sessions on logout.
- [ ] Add account status response that reports sync availability without enforcing paid limits.

### 13F: Hosted Sync Auth

- [ ] Extend Worker sync auth so hosted Goyo Cloud sessions use `ownerId = user.id` while self-hosted tokens continue to use `ownerId = 'self'`.
- [ ] Keep self-hosted bearer-token auth working independently from Goyo Cloud sessions.
- [ ] Add sync status response fields that identify local/self-hosted/Goyo Cloud auth mode without exposing secrets.
- [ ] Keep all document metadata, update, and snapshot ownership checks based on authenticated `ownerId`.

### 13G: Web Login And Account UI

- [ ] Add `apps/web` login, verify-code, and account screens.
- [ ] Add email-code send, verify, resend, and logout interactions.
- [ ] Use cookie-based web auth; do not expose the web session token to client JavaScript.
- [ ] Add unauthenticated redirects from `/account` and `/billing` to `/login`.
- [ ] Add signed-in redirects from `/login` to `/account`.

### 13H: Desktop Goyo Cloud Login And Status

- [ ] Add Desktop Goyo Cloud login UI that uses the same Worker auth flow and stores the hosted session separately from self-hosted tokens.
- [ ] Add Desktop logout and account status display for Goyo Cloud.
- [ ] Add a Desktop "Manage account" link that opens `https://goyo-cloud.seokjun.kim/account`.
- [ ] Split Desktop credential storage between self-hosted sync tokens and Goyo Cloud hosted sessions.
- [ ] Hide manual token entry for the Goyo Cloud provider.
- [ ] Keep manual token entry only for the self-hosted Worker provider.
- [ ] Show whether Goyo Cloud is signed in, signed out, expired, or unable to connect.

### 13I: Verification

- [ ] Verify hosted user A cannot access hosted user B document metadata, updates, or snapshots.
- [ ] Verify self-hosted sync still works independently from hosted Goyo Cloud auth.
- [ ] Verify open signup, login, logout, expired code, invalid code, and revoked session behavior.
- [ ] Verify web cookie sessions work without exposing tokens to client JavaScript.
- [ ] Verify Desktop bearer sessions work without sharing self-hosted token storage.
- [ ] Verify sync remains available for all signed-in Goyo Cloud users while payment enforcement is disabled.
- [ ] Verify local writing remains safe when Goyo Cloud login or session refresh fails.

## Milestone 14: Future Browser Writing App

- [ ] Reuse `packages/ui` in the future browser writing app.
- [ ] Reuse `packages/core` in the future browser writing app.
- [ ] Add IndexedDB implementation for core local store interfaces.
- [ ] Add responsive baseline for primary browser writing screens.
- [ ] Review web editor constraints separately from Electron desktop constraints.
- [ ] Test offline and reconnect behavior in browser runtime.
- [ ] Ensure the browser writing app does not duplicate desktop-only logic.

## Milestone 15: Mobile-Compatible Pass

- [ ] Add responsive baseline for primary screens.
- [ ] Review mobile editor constraints.
- [ ] Review touch selection behavior.
- [ ] Test offline and reconnect behavior on mobile-sized viewports.
- [ ] Sketch compact navigation for mobile.
- [ ] Ensure desktop-first structure does not block mobile support.

## Ongoing Principles

- [ ] Do not store canonical document content in KV.
- [ ] Do not use last-write-wins for document content.
- [ ] Do not silently overwrite local edits with remote data.
- [ ] Do not log document contents.
- [ ] Keep sync writes idempotent where possible.
- [ ] Preserve user writing above all else.
- [ ] Prefer small, readable changes over clever abstractions.
