# AGENTS.md

## Project

This project is a writing app for essays and fiction. The first target is a desktop web experience, with mobile support planned after the desktop writing workflow is stable.

The product should prioritize calm long-form writing, drafting, revision, organization, and safe synchronization across devices.

## Product Priorities

- Build the desktop writing experience first.
- Keep the architecture mobile-compatible, but do not prioritize mobile UI polish in the first milestone.
- Support essays and fiction without forcing one rigid writing model.
- Preserve user writing above all else.
- Avoid destructive conflict handling.
- Keep the editor fast, quiet, and keyboard-friendly.

## Stack Direction

- Frontend: desktop-first web app.
- Sync API: Cloudflare Workers.
- Durable storage: Cloudflare D1.
- Cache: Cloudflare KV.
- Realtime document coordination: Cloudflare Durable Objects if realtime multi-client editing is implemented.
- Collaborative document model: CRDT, preferably Yjs.

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

## Security And Privacy

- User writing is private by default.
- Do not log document contents.
- Treat sync endpoints as untrusted input boundaries.
- Check document ownership and authorization explicitly.
- Avoid storing sensitive document content in cache unless there is a clear reason and expiration policy.

## Testing And Verification

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
