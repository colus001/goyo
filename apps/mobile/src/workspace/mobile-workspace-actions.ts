import {
  addChapterToSession,
  addDocumentToSession,
  createBookMetadata,
  createChapterMetadata,
  createDocumentMetadata,
  createDocumentSessionFromBooksChaptersAndDocuments,
  createQuickDraftsBook,
  createQuickDraftsInboxChapter,
  type DocumentSession,
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
  selectActiveBook,
} from '@writer/core';
import type { MobileLocalStore } from '../storage/mobile-local-store';
import { saveDocumentBodyAsCrdtUpdate } from './mobile-document-body-crdt';
import type { MobileWorkspaceScreen, MobileWorkspaceStatus } from './mobile-workspace-types';

type SetSession = (session: DocumentSession) => void;
type SetScreen = (screen: MobileWorkspaceScreen) => void;
type SetStatus = (status: MobileWorkspaceStatus) => void;

export async function createAndPersistBook(
  store: MobileLocalStore | null,
  session: DocumentSession | null,
  setSession: SetSession,
  setScreen: SetScreen,
  setStatus: SetStatus,
): Promise<void> {
  if (!store) {
    return;
  }

  setStatus('Saving');
  const now = new Date().toISOString();
  const book = createBookMetadata({ id: createLocalId('book'), now, title: 'Untitled book' });

  try {
    await store.saveBook(book);
    setSession(
      session
        ? selectActiveBook({ ...session, books: [...session.books, book] }, book.id)
        : createDocumentSessionFromBooksChaptersAndDocuments([book], [], []),
    );
    setScreen('book');
    setStatus('Ready');
  } catch {
    setStatus('Save failed');
  }
}

export async function createAndPersistChapter(
  store: MobileLocalStore | null,
  session: DocumentSession | null,
  setSession: SetSession,
  setStatus: SetStatus,
): Promise<void> {
  if (!store || !session || session.activeBookId === QUICK_DRAFTS_BOOK_ID) {
    return;
  }

  setStatus('Saving');
  const chapter = createChapterMetadata({
    bookId: session.activeBookId,
    id: createLocalId('chapter'),
    now: new Date().toISOString(),
    order: getNextChapterOrder(session.activeBookId, session.chapters),
  });

  try {
    await store.saveChapter(chapter);
    setSession(addChapterToSession(session, chapter));
    setStatus('Ready');
  } catch {
    setStatus('Save failed');
  }
}

export async function createAndPersistQuickDraft(
  store: MobileLocalStore | null,
  session: DocumentSession | null,
  setSession: SetSession,
  setScreen: SetScreen,
  setStatus: SetStatus,
): Promise<void> {
  if (!store) {
    return;
  }

  setStatus('Saving');
  const now = new Date().toISOString();
  const book = findQuickDraftsBook(session) ?? createQuickDraftsBook(now);
  const chapter = findQuickDraftsInbox(session) ?? createQuickDraftsInboxChapter(now);
  const document = createDocumentMetadata({
    bookId: book.id,
    chapterId: chapter.id,
    id: createLocalId('document'),
    kind: 'draft',
    now,
    order: getNextDocumentOrder(book.id, chapter.id, session?.documents ?? []),
  });

  try {
    await store.saveBook(book);
    await store.saveChapter(chapter);
    await store.saveDocument(document);
    setSession(addQuickDraftToSession(session, book, chapter, document));
    setScreen('editor');
    setStatus('Ready');
  } catch {
    setStatus('Save failed');
  }
}

export async function createAndPersistEpisode(
  store: MobileLocalStore | null,
  session: DocumentSession | null,
  chapterId: string | null,
  setSession: SetSession,
  setScreen: SetScreen,
  setStatus: SetStatus,
): Promise<void> {
  if (
    !store ||
    !session ||
    (chapterId && !session.chapters.some((chapter) => chapter.id === chapterId))
  ) {
    return;
  }

  setStatus('Saving');
  const document = createDocumentForSession(session, chapterId);

  try {
    await store.saveDocument(document);
    setSession(addDocumentToSession(session, document));
    setScreen('editor');
    setStatus('Ready');
  } catch {
    setStatus('Save failed');
  }
}

export async function renameAndPersistActiveDocument(
  store: MobileLocalStore | null,
  session: DocumentSession | null,
  title: string,
  setSession: SetSession,
  setStatus: SetStatus,
): Promise<void> {
  if (!store || !session?.activeDocumentId) {
    return;
  }

  const activeDocument = session.documents.find(
    (document) => document.id === session.activeDocumentId,
  );

  if (!activeDocument || activeDocument.title === title) {
    return;
  }

  const renamedDocument = { ...activeDocument, title, updatedAt: new Date().toISOString() };
  setSession({
    ...session,
    documents: session.documents.map((document) =>
      document.id === renamedDocument.id ? renamedDocument : document,
    ),
  });
  setStatus('Saving');

  try {
    await store.saveDocument(renamedDocument);
    setStatus('Ready');
  } catch {
    setStatus('Save failed');
  }
}

export async function saveAndPersistActiveDocumentBody(
  store: MobileLocalStore | null,
  clientId: string | null,
  session: DocumentSession | null,
  text: string,
  setStatus: SetStatus,
): Promise<void> {
  if (!store || !clientId || !session?.activeDocumentId) {
    return;
  }

  setStatus('Saving');

  try {
    await saveDocumentBodyAsCrdtUpdate(store, clientId, session.activeDocumentId, text);
    setStatus('Ready');
  } catch {
    setStatus('Save failed');
  }
}

function addQuickDraftToSession(
  session: DocumentSession | null,
  book: DocumentSession['books'][number],
  chapter: DocumentSession['chapters'][number],
  document: DocumentSession['documents'][number],
): DocumentSession {
  if (!session) {
    return createDocumentSessionFromBooksChaptersAndDocuments([book], [chapter], [document]);
  }

  return addDocumentToSession(
    {
      ...session,
      activeBookId: book.id,
      activeChapterId: chapter.id,
      books: session.books.some((candidate) => candidate.id === book.id)
        ? session.books
        : [...session.books, book],
      chapters: session.chapters.some((candidate) => candidate.id === chapter.id)
        ? session.chapters
        : [...session.chapters, chapter],
    },
    document,
  );
}

function createDocumentForSession(session: DocumentSession, chapterId: string | null) {
  const isQuickDrafts = session.activeBookId === QUICK_DRAFTS_BOOK_ID;
  const documentChapterId = isQuickDrafts ? QUICK_DRAFTS_INBOX_CHAPTER_ID : chapterId;
  const kind = isQuickDrafts ? 'draft' : 'episode';
  const now = new Date().toISOString();

  return createDocumentMetadata({
    bookId: session.activeBookId,
    chapterId: documentChapterId,
    id: createLocalId('document'),
    kind,
    now,
    order: getNextDocumentOrder(session.activeBookId, documentChapterId, session.documents),
  });
}

function findQuickDraftsBook(session: DocumentSession | null) {
  return session?.books.find((candidate) => candidate.id === QUICK_DRAFTS_BOOK_ID);
}

function findQuickDraftsInbox(session: DocumentSession | null) {
  return session?.chapters.find((candidate) => candidate.id === QUICK_DRAFTS_INBOX_CHAPTER_ID);
}

function getNextChapterOrder(bookId: string, chapters: DocumentSession['chapters']): number {
  const matchingOrders = chapters
    .filter((chapter) => chapter.bookId === bookId)
    .map((chapter) => chapter.order);

  return matchingOrders.length === 0 ? 0 : Math.max(...matchingOrders) + 1;
}

function getNextDocumentOrder(
  bookId: string,
  chapterId: string | null,
  documents: DocumentSession['documents'],
): number {
  const matchingOrders = documents
    .filter((document) => document.bookId === bookId && document.chapterId === chapterId)
    .map((document) => document.order);

  return matchingOrders.length === 0 ? 0 : Math.max(...matchingOrders) + 1;
}

function createLocalId(prefix: string): string {
  const randomValue = Math.random().toString(36).slice(2, 10);

  return `${prefix}_${Date.now().toString(36)}_${randomValue}`;
}
