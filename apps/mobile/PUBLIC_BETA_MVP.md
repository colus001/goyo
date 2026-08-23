# Goyo Mobile Public Beta MVP TODO

## Goal

The public beta must safely support this core journey:

> Sign in -> load existing writing -> create a named book and episode -> write offline -> retain all work after closing the app -> reconnect and synchronize bidirectionally with Desktop

Preserving user writing, isolating account data, and providing recoverable synchronization take priority over feature count.

## Status

- `[x]` Decided or completed
- `[ ]` Not completed
- `P0` Release blocker involving writing safety, privacy, or core functionality
- `P1` Required for public beta
- `P2` May follow after public beta

## Confirmed Scope

- [x] Distribute the beta to external users.
- [x] Support both iPhone and iPad.
- [x] Use a separate local SQLite database for each account.
- [x] Initially edit only documents that can be safely round-tripped as plain paragraphs.
- [x] Open documents containing unsupported Desktop formatting as read-only on mobile.
- [x] Include Cloud login, offline writing, and automatic synchronization.

## P0: Writing Persistence Safety

- [x] Track every pending save as `{ documentId, text }` instead of storing unscoped text.
- [x] Keep editor state and body loading state separate for each document.
- [x] Prevent editing until the requested document body has finished loading.
- [x] Flush a document's pending save before navigating away from it.
- [ ] Flush pending writes before the app enters the background or inactive state.
- [ ] Clear pending state only after SQLite persistence succeeds.
- [ ] Retain failed writes in memory and provide retry behavior.
- [ ] Persist body updates, snapshots, and sync queue entries in one SQLite transaction.
- [ ] Reconcile missing sync queue records at startup.
- [ ] Separate `Saving`, `Saved`, `Save failed`, and `Sync pending` states.

### Persistence Acceptance Tests

- [ ] Writing immediately before app termination is preserved after relaunch.
- [ ] Typing in document A and immediately opening document B never mixes content.
- [ ] A failed SQLite write is never reported as saved.
- [ ] Failed writing remains recoverable and retryable.
- [ ] Startup reconciliation repairs a crash between update persistence and queue insertion.

## P0: Safe Mobile Editing

Desktop stores Tiptap content in `Y.XmlFragment(documentId)`, not as a plain string. Whole-fragment replacement can destroy headings, lists, marks, blockquotes, whitespace, and concurrent edits.

- [ ] Detect whether a Yjs fragment contains only supported plain paragraphs and plain text.
- [ ] Permit editing only for supported document structures.
- [ ] Open unsupported documents as read-only.
- [ ] Explain why a formatted Desktop document is read-only on mobile.
- [ ] Remove whole-fragment deletion and recreation.
- [ ] Apply only the changed text range to Yjs.
- [ ] Preserve line breaks, empty paragraphs, and leading or trailing whitespace.
- [ ] Preserve both users' intent during concurrent editing and offline reconnect.

### Editor Acceptance Tests

- [ ] Opening and closing a formatted Desktop document on mobile does not alter it.
- [ ] Attempting to edit an unsupported document cannot damage its structure.
- [ ] Supported plain documents round-trip between Desktop and mobile without content changes.
- [ ] Concurrent edits from two clients preserve both users' intent.
- [ ] Offline edits survive reconnect.

## P0: Per-Account Local Databases

Target layout:

```text
goyo-guest.sqlite
goyo-account-{stableHash(userId, serverUrl)}.sqlite
```

- [ ] Derive the database scope from the authenticated account ID and server URL.
- [ ] Associate the SecureStore session with its database scope.
- [ ] Use a guest database before authentication.
- [ ] Close the current database before opening another account's database.
- [ ] Isolate writing, sync queue, client ID, and UI state by account.
- [ ] Block automatic uploads while changing accounts.
- [ ] Keep local writing on logout unless the user explicitly removes it.
- [ ] Use separate databases for the same account ID on different server URLs.
- [ ] Define and implement migration from the existing single `goyo.sqlite` database.
- [ ] Prevent account A's local records from ever being uploaded to account B.

### Account Isolation Tests

- [ ] Logging out of account A and into account B never exposes A's local writing.
- [ ] Account A's pending queue never uploads to account B.
- [ ] Switching accounts during sync does not upload to the wrong server or account.
- [ ] Existing `goyo.sqlite` data migrates without loss.

## P0: Bidirectional Synchronization

- [ ] Pull remote book metadata on Desktop.
- [ ] Pull remote chapter metadata on Desktop.
- [ ] Pull remote document metadata on Desktop.
- [ ] Make books and documents created on mobile appear on Desktop.
- [ ] Synchronize title, order, chapter movement, and archive state in both directions.
- [ ] Return archived records as tombstones instead of excluding them from list APIs.
- [ ] Prevent stale clients from resurrecting archived records.
- [ ] Introduce a server revision or monotonic sequence for metadata.
- [ ] Reject or explicitly merge stale metadata updates.
- [ ] Apply remote CRDT updates to documents already open on Desktop.
- [ ] Add pagination so libraries with more than 100 documents restore completely.
- [ ] Make update pushes idempotent.
- [ ] Return a conflict when the same ID is submitted with a different payload.

### Sync Acceptance Tests

- [ ] A book created on mobile appears on Desktop.
- [ ] A document created on Desktop appears accurately on mobile.
- [ ] Metadata changes converge after offline edits from two clients.
- [ ] Archive tombstones synchronize and stale clients cannot resurrect records.
- [ ] Libraries with more than 100 documents restore completely.
- [ ] An open Desktop document reflects pulled remote updates without reopening it.

## P0: Snapshot Safety

The current `createdAt + updateId` checkpoint does not safely prove which updates a snapshot contains.

### Public Beta Strategy

- [ ] Temporarily disable remote snapshot optimization.
- [ ] Replay all Yjs updates idempotently.
- [ ] Add pagination to the document update API.
- [ ] Confirm acceptable replay performance using representative beta libraries.

### Post-Beta Optimization

- [ ] Introduce a server-assigned monotonic update sequence.
- [ ] Store a Yjs state vector or another verifiable coverage frontier with snapshots.
- [ ] Reject invalid `lastUpdateId` values and future-dated snapshots.
- [ ] Compact only updates proven to be covered by a verified snapshot.

## P1: Authentication and API Security

- [ ] Add session expiration.
- [ ] Require reauthentication for expired or revoked sessions.
- [ ] Provide an active session or device list.
- [ ] Provide a sign-out-all action.
- [ ] Rate-limit login code requests.
- [ ] Rate-limit failed verification attempts.
- [ ] Rate-limit sync APIs.
- [ ] Limit request JSON size.
- [ ] Limit decoded update and snapshot payload sizes.
- [ ] Reject non-HTTPS API URLs in production.
- [ ] Replace raw storage and SQL errors with stable public errors.
- [ ] Verify that logs never contain document contents, titles, tokens, or CRDT payloads.
- [ ] Store Desktop bearer tokens in OS credential storage.

### Security Tests

- [ ] Expired and revoked sessions cannot access sync APIs.
- [ ] Login and sync rate limits return stable responses.
- [ ] Oversized updates and snapshots are rejected before storage.
- [ ] Production builds reject non-HTTPS API endpoints.
- [ ] Duplicate IDs with different payloads return a conflict.

## P1: Account Deletion and Privacy

- [ ] Add an authenticated Worker endpoint for account deletion.
- [ ] Delete user-owned books, chapters, documents, updates, snapshots, and sessions.
- [ ] Add an in-app account deletion flow.
- [ ] Explain deletion scope and irreversibility before confirmation.
- [ ] Let users retain writing as a local-only workspace.
- [ ] Add a second confirmation before deleting the local database.
- [ ] Publish a Privacy Policy URL.
- [ ] Publish Terms of Service and a support URL.
- [ ] Complete App Store privacy disclosures.
- [ ] Document retention and deletion policies.
- [ ] Document how long deleted data may remain in D1 backups.
- [ ] Provide a security incident and data-loss contact.

Data collection disclosures must cover:

- Email address
- User-authored content
- Sync client ID
- Account and session information

### Account Deletion Tests

- [ ] Account deletion revokes all sessions.
- [ ] Account deletion removes all owner-scoped Cloud data.
- [ ] Local retention converts writing into an accessible local-only workspace.
- [ ] Optional device deletion removes the correct account database only.

## P1: Essential Product UX

- [ ] Ask for a title when creating a book.
- [ ] Allow books to be renamed.
- [ ] Allow chapters to be named and renamed.
- [ ] Navigate to a newly created book.
- [ ] Open the editor after creating a Quick Draft.
- [ ] Open the editor after creating an episode.
- [ ] Distinguish offline and sync-pending states.
- [ ] Provide retry actions for expired authentication, save failure, and database failure.
- [ ] Explain missing or archived routes.
- [ ] Distinguish initial loading from a genuinely empty library.
- [ ] Establish one source of truth for Expo Router and internal navigation state.
- [ ] Ensure network exceptions always clear the authentication busy state.

### Product Flow Tests

- [ ] Creating a book persists it and opens the correct route.
- [ ] Creating a chapter persists its name.
- [ ] Creating an episode persists it and opens its editor.
- [ ] Creating a Quick Draft persists it and opens its editor.
- [ ] Offline authentication failure leaves the form usable for retry.

## P1: iPhone, iPad, and Accessibility

- [ ] Verify the primary flow on iPhone portrait.
- [ ] Verify iPad portrait and landscape.
- [ ] Verify iPad Split View and Stage Manager sizes.
- [ ] Prevent the drawer and editor from overlapping at narrow widths.
- [ ] Limit the writing column width on large screens.
- [ ] Keep the title and body visible above the software keyboard.
- [ ] Verify basic hardware keyboard behavior.
- [ ] Apply safe-area insets throughout the app.
- [ ] Support maximum Dynamic Type sizes.
- [ ] Maintain minimum 44x44 pt touch targets.
- [ ] Add VoiceOver labels and heading roles.
- [ ] Manage VoiceOver focus for menus and modal interfaces.
- [ ] Prepare App Store screenshots for iPhone and iPad.

## P1: Distribution Readiness

- [ ] Confirm the permanent bundle identifier.
- [ ] Create the EAS project and connect its project ID.
- [ ] Add preview and production profiles to `eas.json`.
- [ ] Configure automatic iOS build number increments.
- [ ] Provide a 1024x1024 App Store icon.
- [ ] Provide splash and launch assets.
- [ ] Separate development, preview, and production API environments.
- [ ] Verify production email delivery.
- [ ] Verify production D1 migrations.
- [ ] Run `expo-doctor` successfully.
- [ ] Produce a production bundle.
- [ ] Produce an EAS iOS archive.
- [ ] Verify installation on physical iPhone and iPad devices.
- [ ] Verify that TestFlight upgrades preserve existing SQLite data.
- [ ] Write a mobile release runbook.
- [ ] Define public beta rollback and incident response procedures.

## Public Beta Release Gate

Do not distribute the public beta until every item below passes.

- [ ] Writing is preserved after immediate force termination.
- [ ] Content from different documents never becomes mixed.
- [ ] Concurrent offline edits from two devices preserve both users' intent after reconnect.
- [ ] Books and documents created on mobile appear on Desktop.
- [ ] Documents created on Desktop appear accurately on mobile.
- [ ] Unsupported formatting is never damaged by mobile.
- [ ] Account A's writing is never exposed or uploaded to account B.
- [ ] Archived data cannot be resurrected by a stale device.
- [ ] The app recovers correctly from session expiration and network failure.
- [ ] Account deletion respects the user's Cloud and device data choices.
- [ ] Libraries containing more than 100 documents restore completely.
- [ ] TestFlight upgrades preserve existing SQLite writing.
- [ ] VoiceOver, Dynamic Type, and keyboard operation work on iPhone and iPad.
- [ ] Privacy, support, retention, and incident response documents are published.

## Recommended Implementation Order

- [ ] Complete persistence safety and mobile document-format protection.
- [ ] Add per-account databases and migrate existing local data.
- [ ] Complete bidirectional metadata sync and archive tombstones.
- [ ] Simplify the snapshot strategy and harden synchronization.
- [ ] Complete authentication, API security, and account deletion.
- [ ] Complete creation UX, error states, accessibility, and iPad layouts.
- [ ] Pass integration tests and physical-device testing.
- [ ] Complete EAS, TestFlight, and public beta operational readiness.

## P2: Post-Beta Backlog

- [ ] Add a complete rich-text formatting toolbar.
- [ ] Add book accents and advanced library sorting.
- [ ] Add chapter and episode reordering.
- [ ] Add general-purpose mobile export UI.
- [ ] Add themes and font settings.
- [ ] Add realtime presence and collaboration indicators.
- [ ] Add version history and restore-point UI.
- [ ] Add advanced sync diagnostics UI.

The release criterion is not feature completeness. It is whether users can safely trust Goyo with real writing.
