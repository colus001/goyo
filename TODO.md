# TODO.md

## Milestone 0: Product And Technical Foundation

- [x] Initialize the repository structure.
- [x] Create the Electron + React + TypeScript desktop app.
- [x] Create the Vite + React + TypeScript web app scaffold for future reuse.
- [x] Create the Cloudflare Worker app structure.
- [x] Decide the monorepo layout, preferably `apps/desktop`, `apps/web`, `apps/worker`, `packages/core`, `packages/shared`, and `packages/ui`.
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
- [ ] Keep the local store behind `packages/core` interfaces.
- [x] Store local document metadata separately from document content updates.
- [x] Store local book metadata separately from document content updates.
- [x] Store local chapter metadata separately from document content updates.
- [x] Store Yjs incremental updates locally.
- [x] Add local document snapshots or compacted state.
- [x] Add a local unsynced update queue.
- [ ] Add document list indexing.
- [ ] Add archive or soft-delete state.
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
- [ ] Re-evaluate Drizzle or another typed SQL layer before building the D1 schema.
- [ ] If adopting Drizzle, introduce it at the persistence boundary rather than in `packages/core`.
- [x] Create initial D1 schema.
- [x] Add `documents` table.
- [x] Add `document_updates` table.
- [x] Add `document_snapshots` table.
- [ ] Add `document_revisions` or equivalent revision metadata table if needed.
- [x] Add `sync_clients` table if needed.
- [ ] Add document metadata API.
- [ ] Add CRDT update upload API.
- [ ] Add CRDT update download API.
- [ ] Add snapshot read/write API.
- [ ] Ensure D1 remains the canonical remote store.
- [ ] Ensure KV is not required to restore document content.

## Milestone 7: Incremental Remote Sync

- [ ] Push local unsynced Yjs updates to the Worker.
- [ ] Pull missing remote Yjs updates from the Worker.
- [ ] Use state vectors or equivalent sync metadata to avoid full document transfer.
- [ ] Add sync retry and backoff.
- [ ] Add subtle sync status UI.
- [ ] Handle offline mode without blocking local editing.
- [ ] Handle reconnect after offline edits.
- [ ] Verify same-document editing from two desktop app instances.
- [ ] Verify duplicated sync requests are safe.
- [ ] Verify delayed or out-of-order remote updates are safe.

## Milestone 8: Desktop Writing Experience

- [x] Add left-side document or project navigation.
- [x] Add move up/down document ordering controls.
- [x] Add move up/down chapter ordering controls.
- [x] Add calm central writing surface.
- [ ] Add quiet toolbar or command surface.
- [ ] Restore the last app state on launch, including the previous book, selected episode, sidebar state, and focused writing mode where practical.
- [ ] Persist app UI state locally, including last route, selected book, selected episode, sidebar collapse state, chapter expansion state, and focused writing mode.
- [ ] Add a startup restore flow that opens the last valid workspace state, falling back safely to the library if the saved book or episode was archived or deleted.
- [ ] Add tests or manual verification for startup restore with normal books, Quick Drafts, archived items, and empty workspaces.
- [ ] Add a settings menu or settings surface for app-level preferences.
- [ ] Add a settings storage foundation for app-level preferences.
- [ ] Add a setting to enable or disable restoring the last workspace on launch.
- [ ] Add initial settings sections for writing preferences, appearance placeholders, and future sync/account preferences.
- [ ] Add keyboard shortcuts for primary writing actions.
- [ ] Add keyboard shortcuts for sidebar toggle, new episode, new chapter, focus editor, and return to library.
- [x] Add word count.
- [x] Add document status metadata.
- [x] Add focused writing mode.
- [x] Add collapsible sidebar navigation.
- [x] Add library-first book grid with book creation and accent color selection.
- [x] Add chapter creation modal and chapter delete confirmation.
- [x] Add book delete confirmation and soft archive flow.
- [x] Add shared context menu UI for sidebar empty space, chapters, and episodes.
- [x] Add empty-sidebar context menu actions for new episode, new chapter, expand all, and collapse all.
- [x] Keep chapter expansion state independent from chapter or episode selection.
- [x] Focus titled episodes into the editor body and untitled episodes into the title input.
- [x] Protect Korean/IME title entry from Enter composition bugs.
- [ ] Add search.
- [ ] Add basic tags or labels.
- [ ] Support essay-style document workflows.
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

## Milestone 9: Recovery And Version Safety

- [ ] Add automatic local checkpoints.
- [ ] Add remote snapshot policy.
- [ ] Add manual restore points.
- [ ] Add deleted document recovery.
- [ ] Add sync failure recovery path.
- [ ] Add local backup export.
- [ ] Add update log compaction policy.
- [ ] Verify recovery from local data after remote sync failure.
- [ ] Verify recovery from snapshot plus later updates.

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

- [ ] Add plain text export.
- [ ] Add Markdown export.
- [ ] Add HTML export.
- [ ] Evaluate PDF export.
- [ ] Evaluate DOCX export.
- [ ] Evaluate EPUB export.
- [ ] Support essay export.
- [ ] Support fiction chapter export.
- [ ] Verify export works independently from remote sync state.

## Milestone 12: Auth And Multi-Device Accounts

- [ ] Choose an authentication approach.
- [ ] Add user identity model.
- [ ] Add document ownership checks.
- [ ] Add device or sync client identity.
- [ ] Add sync client registration if needed.
- [ ] Block unauthorized document metadata access.
- [ ] Block unauthorized document update access.
- [ ] Verify multiple devices can sync documents for the same user.
- [ ] Verify one user cannot access another user's document updates.

## Milestone 13: Future Browser Web App

- [ ] Reuse `packages/ui` in `apps/web`.
- [ ] Reuse `packages/core` in `apps/web`.
- [ ] Add IndexedDB implementation for core local store interfaces.
- [ ] Add responsive baseline for primary browser screens.
- [ ] Review web editor constraints separately from Electron desktop constraints.
- [ ] Test offline and reconnect behavior in browser runtime.
- [ ] Ensure web app does not duplicate desktop-only logic.

## Milestone 14: Mobile-Compatible Pass

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
