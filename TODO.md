# TODO.md

## Milestone 0: Product And Technical Foundation

- [x] Initialize the repository structure.
- [x] Create the Electron + React + TypeScript desktop app.
- [x] Create the Vite + React + TypeScript web app scaffold for future reuse.
- [x] Create the Cloudflare Worker app structure.
- [x] Decide the monorepo layout, preferably `apps/desktop`, `apps/web`, `apps/worker`, `packages/core`, `packages/shared`, and `packages/ui`.
- [x] Configure TypeScript across the workspace.
- [x] Configure linting and formatting.
- [x] Configure Tailwind CSS for web styling.
- [x] Add shared UI package structure.
- [ ] Add core domain package structure.
- [ ] Add basic test tooling.
- [x] Add local development scripts.
- [ ] Document the local-first architecture.
- [ ] Document the role of SQLite, IndexedDB, Yjs, D1, KV, and Durable Objects.

## Milestone 1: Electron Desktop Shell

- [x] Add `apps/desktop` package.
- [x] Configure Electron main process.
- [x] Configure Electron preload boundary.
- [x] Configure React renderer with Vite and Tailwind.
- [x] Reuse `packages/ui` from the desktop renderer.
- [x] Add root `pnpm dev:desktop` script.
- [x] Make `pnpm dev` run the desktop app.
- [x] Add a minimal native application menu.
- [ ] Verify desktop window lifecycle on macOS.
- [x] Verify `pnpm check` and `pnpm build` include the desktop app.

## Milestone 2: Core Domain And Platform Boundaries

- [ ] Add `packages/core` package.
- [ ] Define document metadata types and operations in `packages/core`.
- [ ] Define local document store interfaces in `packages/core`.
- [ ] Define sync queue interfaces in `packages/core`.
- [ ] Define recovery policy interfaces in `packages/core`.
- [ ] Keep Electron, SQLite, IndexedDB, and browser APIs out of `packages/core`.
- [ ] Keep shared IDs and API contracts in `packages/shared`.

## Milestone 3: Local-First Desktop Editor MVP

- [ ] Add Tiptap/ProseMirror editor.
- [ ] Add Yjs as the document model for editor content.
- [ ] Connect Tiptap to Yjs using the appropriate ProseMirror/Yjs binding.
- [ ] Create a desktop-first editor layout.
- [ ] Add document creation.
- [ ] Add document opening.
- [ ] Add document title editing.
- [ ] Add local autosave status.
- [ ] Persist editor content locally without relying on a server.
- [ ] Verify that a document survives app restart.
- [ ] Verify long-form writing performance with a large document.

## Milestone 4: Local Document Store

- [ ] Choose the desktop local store implementation, preferably SQLite.
- [ ] Keep the local store behind `packages/core` interfaces.
- [ ] Store local document metadata separately from document content updates.
- [ ] Store Yjs incremental updates locally.
- [ ] Add local document snapshots or compacted state.
- [ ] Add a local unsynced update queue.
- [ ] Add document list indexing.
- [ ] Add archive or soft-delete state.
- [ ] Verify that a document can be restored from local metadata plus local Yjs data.
- [ ] Verify that local writes remain safe while offline.

## Milestone 5: CRDT Sync Core

- [ ] Implement Yjs update generation for local edits.
- [ ] Implement Yjs update replay.
- [ ] Implement state vector based comparison.
- [ ] Implement duplicate update handling.
- [ ] Implement out-of-order update handling.
- [ ] Implement snapshot restore plus later update replay.
- [ ] Add tests for two local clients editing the same document.
- [ ] Add tests for offline edit then reconnect simulation.
- [ ] Add tests for duplicated update delivery.
- [ ] Add tests for out-of-order update delivery.

## Milestone 6: Worker And D1 Persistence

- [ ] Add Cloudflare Worker health endpoint.
- [ ] Configure Wrangler for local development.
- [ ] Create initial D1 schema.
- [ ] Add `documents` table.
- [ ] Add `document_updates` table.
- [ ] Add `document_snapshots` table.
- [ ] Add `document_revisions` or equivalent revision metadata table if needed.
- [ ] Add `sync_clients` table if needed.
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

- [ ] Add left-side document or project navigation.
- [ ] Add calm central writing surface.
- [ ] Add quiet toolbar or command surface.
- [ ] Add keyboard shortcuts for primary writing actions.
- [ ] Add word count.
- [ ] Add document status metadata.
- [ ] Add focused writing mode.
- [ ] Add search.
- [ ] Add basic tags or labels.
- [ ] Support essay-style document workflows.
- [ ] Support fiction chapter or scene workflows.

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
