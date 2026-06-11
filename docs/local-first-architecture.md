# Local-First Architecture

## Goal

The first product target is an Electron desktop writing app. The app should remain useful without network access, preserve local writing first, and sync safely when connectivity is available.

A browser web app is planned later. Shared code should live in packages where practical so the future web app can reuse product logic, editor UI, and API contracts without duplicating desktop-only wiring.

## Runtime Responsibilities

`apps/desktop` is the primary app. It owns Electron main/preload/renderer composition, native window lifecycle, native menus, desktop-specific IPC, and later desktop persistence wiring.

`apps/web` is a future browser app scaffold. It should reuse shared packages and provide browser-specific storage and runtime integrations when web work becomes a milestone.

`apps/worker` owns Cloudflare Worker API endpoints, D1 persistence, and later sync authorization.

`packages/core` owns editor-agnostic product logic. It should define document operations, sync state machines, recovery policies, and local store interfaces without importing Electron, SQLite, IndexedDB, DOM APIs, network clients, or Cloudflare runtime APIs.

`packages/shared` owns cross-runtime IDs, API contracts, and TypeScript types shared by desktop, web, worker, and core packages.

`packages/ui` owns reusable React/Tailwind UI components. It should not contain Electron main/preload logic, database access, or sync transport code.

## Local Persistence

Desktop local persistence should prefer SQLite when implementation begins. SQLite is a durable local database that fits document metadata, CRDT update logs, snapshots, sync queues, and recovery records.

The future browser app should use IndexedDB for the same conceptual storage responsibilities.

Both storage implementations should sit behind interfaces from `packages/core`. Core logic should depend on behavior, not the storage engine.

## Document Content Model

Editable document content should use Yjs CRDT updates rather than last-write-wins text replacement.

Local edits should produce incremental Yjs updates. Clients should be able to apply local edits immediately and later merge remote updates without silently overwriting writing from another client.

The durable storage model should distinguish:

- Document metadata.
- CRDT update log.
- Compacted document snapshot.
- Revision or recovery history.
- Ephemeral presence.

Snapshots may be used to avoid replaying an unbounded update log, but snapshots must not become a reason to discard later valid updates.

## Remote Sync

D1 is the canonical durable remote store. It should store document metadata, document updates, snapshots, and sync metadata.

KV may be used only for cache, derived state, recent metadata, or non-critical acceleration. KV must not be required to restore canonical document content.

Durable Objects may be added later for realtime same-document coordination. They may handle WebSocket connections, broadcast CRDT updates, track ephemeral presence, and batch persistence to D1.

Presence is ephemeral and should not be treated as canonical document data.

## Testing Direction

`packages/core` should use a test-first workflow for non-trivial domain behavior. Tests should describe observable behavior and invariants, especially around preserving writing, sync safety, recovery, and idempotency.

Core tests must remain platform-agnostic. They should not require Electron, DOM, SQLite, IndexedDB, network access, or Cloudflare runtime.

The root validation harness should include formatting/linting, Knip, TypeScript checks, and unit tests.
