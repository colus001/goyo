import {
  addDocumentToSession,
  type BookMetadata,
  type ChapterMetadata,
  copyYjsSnapshotFragment,
  createDocumentMetadata,
  createDocumentSnapshotRecord,
  createQuickDraftsBook,
  createQuickDraftsInboxChapter,
  type DocumentMetadata,
  type DocumentSession,
  type DocumentSnapshotRecord,
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
  selectActiveBook,
  selectActiveDocument,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { getNextDocumentOrder } from './document-workspace-ordering';
import {
  persistBookMetadata,
  persistChapterMetadata,
  persistDocumentMetadata,
  persistDocumentSnapshot,
} from './document-workspace-persistence';
import type { SaveStatus } from './document-workspace-types';

export function restoreRecoveryPointAsCopy(
  recoveryPointId: string,
  activeDocument: DocumentMetadata | null,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  if (!activeDocument) {
    setSaveStatus('Save failed');
    return;
  }

  void restoreRecoveryPointAsCopyAsync(recoveryPointId, activeDocument, setSession, setSaveStatus);
}

export function restoreDeletedDocument(
  document: DocumentMetadata,
  session: DocumentSession | null,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  void restoreDeletedDocumentAsync(document, session, setSession, setSaveStatus);
}

async function restoreDeletedDocumentAsync(
  document: DocumentMetadata,
  session: DocumentSession | null,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  setSaveStatus('Saving locally');

  try {
    if (session && canRestoreDeletedDocumentInPlace(document, session)) {
      await restoreDeletedDocumentInPlace(document, session, setSession);
      setSaveStatus('Saved locally');
      return;
    }

    await restoreDeletedDocumentToQuickDrafts(document, session, setSession, setSaveStatus);
    setSaveStatus('Saved locally');
  } catch {
    setSaveStatus('Save failed');
  }
}

async function restoreRecoveryPointAsCopyAsync(
  recoveryPointId: string,
  sourceDocument: DocumentMetadata,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  setSaveStatus('Saving locally');

  try {
    const recoveryPoint = await window.writerDesktop.recoveryPoints.get(recoveryPointId);

    if (!recoveryPoint) {
      setSaveStatus('Save failed');
      return;
    }

    const sourceSnapshot = await window.writerDesktop.documentSnapshots.get(
      recoveryPoint.snapshotId,
    );

    if (!sourceSnapshot) {
      setSaveStatus('Save failed');
      return;
    }

    const { restoredDocument, restoredSnapshot } = createRestoredDocumentCopy(
      sourceDocument,
      sourceSnapshot,
    );
    const didSaveDocument = await persistDocumentMetadata(restoredDocument, setSaveStatus);

    if (!didSaveDocument) {
      return;
    }

    await persistDocumentSnapshot(restoredSnapshot);
    setSession((session) => {
      if (!session) {
        return session;
      }

      return selectActiveDocument(
        addDocumentToSession(session, restoredDocument),
        restoredDocument.id,
      );
    });
    setSaveStatus('Saved locally');
  } catch {
    setSaveStatus('Save failed');
  }
}

function createRestoredDocumentCopy(
  sourceDocument: DocumentMetadata,
  sourceSnapshot: DocumentSnapshotRecord,
) {
  const now = new Date().toISOString();
  const restoredDocument = createDocumentMetadata({
    bookId: sourceDocument.bookId,
    chapterId: sourceDocument.chapterId,
    id: `doc_${globalThis.crypto.randomUUID()}`,
    kind: sourceDocument.kind,
    now,
    order: sourceDocument.order + 0.1,
    title: `${sourceDocument.title || `Untitled ${sourceDocument.kind}`} (restored)`,
  });

  return {
    restoredDocument,
    restoredSnapshot: createDocumentSnapshotRecord({
      createdAt: now,
      documentId: restoredDocument.id,
      id: `snapshot_${globalThis.crypto.randomUUID()}`,
      lastUpdateId: null,
      snapshot: copyYjsSnapshotFragment(
        sourceSnapshot.snapshot,
        sourceDocument.id,
        restoredDocument.id,
      ),
    }),
  };
}

async function restoreDeletedDocumentInPlace(
  document: DocumentMetadata,
  session: DocumentSession,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
) {
  const restoredAt = new Date().toISOString();
  const restoredDocument = { ...document, archivedAt: null, updatedAt: restoredAt };

  await window.writerDesktop.documents.restoreArchived(document.id, restoredAt);
  setSession(
    selectRestoredDocument(
      { ...session, documents: [...session.documents, restoredDocument] },
      restoredDocument,
    ),
  );
}

async function restoreDeletedDocumentToQuickDrafts(
  document: DocumentMetadata,
  session: DocumentSession | null,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const now = new Date().toISOString();
  const { book, chapter, restoredDocument } = createQuickDraftsRecoveryTarget(
    document,
    session,
    now,
  );
  const latestSnapshot = await window.writerDesktop.documentSnapshots.getLatest(document.id);

  await persistBookMetadata(book, setSaveStatus);
  await persistChapterMetadata(chapter, setSaveStatus);
  await persistDocumentMetadata(restoredDocument, setSaveStatus);

  if (latestSnapshot) {
    await persistDocumentSnapshot(
      createDocumentSnapshotRecord({
        createdAt: now,
        documentId: restoredDocument.id,
        id: `snapshot_${globalThis.crypto.randomUUID()}`,
        lastUpdateId: null,
        snapshot: copyYjsSnapshotFragment(
          latestSnapshot.snapshot,
          document.id,
          restoredDocument.id,
        ),
      }),
    );
  }

  setSession((currentSession) =>
    addRestoredQuickDraftToSession(currentSession ?? session, book, chapter, restoredDocument),
  );
}

function createQuickDraftsRecoveryTarget(
  document: DocumentMetadata,
  session: DocumentSession | null,
  now: string,
) {
  const book =
    session?.books.find((candidate) => candidate.id === QUICK_DRAFTS_BOOK_ID) ??
    createQuickDraftsBook(now);
  const chapter =
    session?.chapters.find((candidate) => candidate.id === QUICK_DRAFTS_INBOX_CHAPTER_ID) ??
    createQuickDraftsInboxChapter(now);

  return {
    book,
    chapter,
    restoredDocument: createDocumentMetadata({
      bookId: book.id,
      chapterId: chapter.id,
      id: `doc_${globalThis.crypto.randomUUID()}`,
      kind: 'draft',
      now,
      order: getNextDocumentOrder(book.id, chapter.id, session?.documents ?? [], 'draft'),
      title: `${document.title || `Untitled ${document.kind}`} (restored)`,
    }),
  };
}

function addRestoredQuickDraftToSession(
  session: DocumentSession | null,
  book: BookMetadata,
  chapter: ChapterMetadata,
  restoredDocument: DocumentMetadata,
) {
  if (!session) {
    return session;
  }

  const books = session.books.some((candidate) => candidate.id === book.id)
    ? session.books
    : [...session.books, book];
  const chapters = session.chapters.some((candidate) => candidate.id === chapter.id)
    ? session.chapters
    : [...session.chapters, chapter];

  return selectRestoredDocument(
    addDocumentToSession({ ...session, books, chapters, activeBookId: book.id }, restoredDocument),
    restoredDocument,
  );
}

function canRestoreDeletedDocumentInPlace(document: DocumentMetadata, session: DocumentSession) {
  return (
    session.books.some((book) => book.id === document.bookId) &&
    (!document.chapterId || session.chapters.some((chapter) => chapter.id === document.chapterId))
  );
}

function selectRestoredDocument(session: DocumentSession, document: DocumentMetadata) {
  return selectActiveDocument(selectActiveBook(session, document.bookId), document.id);
}
