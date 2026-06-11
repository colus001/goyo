import { describe, expect, it } from 'vitest';
import { createBookMetadata } from './books';
import {
  addDocumentToSession,
  createDocumentSession,
  createDocumentSessionFromBooksAndDocuments,
  createDocumentSessionFromDocuments,
  createDraftInSession,
  getActiveBook,
  getActiveDocumentOrNull,
  renameActiveDocument,
  selectActiveDocument,
} from './document-session';

describe('document session creation from a new document', () => {
  it('starts with one active book and document', () => {
    const session = createDocumentSession({
      id: 'doc_1',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Opening page',
    });

    expect(session.activeBookId).toBe('book_1');
    expect(session.activeChapterId).toBe('chapter_book_1_default');
    expect(session.activeDocumentId).toBe('doc_1');
    expect(session.books.map((book) => book.id)).toEqual(['book_1']);
    expect(session.chapters.map((chapter) => chapter.id)).toEqual(['chapter_book_1_default']);
    expect(session.documents).toEqual([
      {
        archivedAt: null,
        bookId: 'book_1',
        chapterId: 'chapter_book_1_default',
        createdAt: '2026-06-11T10:00:00.000Z',
        id: 'doc_1',
        kind: 'episode',
        order: 0,
        title: 'Opening page',
        updatedAt: '2026-06-11T10:00:00.000Z',
      },
    ]);
  });
});

describe('document session creation from existing data', () => {
  it('starts from existing documents with the first document active', () => {
    const firstDocument = createDocumentSession({
      id: 'doc_1',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'First',
    }).documents[0];
    const secondDocument = createDocumentSession({
      id: 'doc_2',
      bookId: 'book_1',
      now: '2026-06-11T10:01:00.000Z',
      title: 'Second',
    }).documents[0];

    expect(createDocumentSessionFromDocuments([firstDocument, secondDocument])).toEqual({
      activeBookId: 'book_1',
      activeChapterId: 'chapter_book_1_default',
      activeDocumentId: 'doc_1',
      books: [expect.objectContaining({ id: 'book_1' })],
      chapters: [expect.objectContaining({ id: 'chapter_book_1_default' })],
      documents: [firstDocument, secondDocument],
    });
  });

  it('starts from existing books and documents', () => {
    const book = createBookMetadata({
      id: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Novel',
    });
    const document = createDocumentSession({
      id: 'doc_1',
      bookId: 'book_1',
      chapterId: 'chapter_1',
      now: '2026-06-11T10:01:00.000Z',
      title: 'Chapter 1',
    }).documents[0];

    const session = createDocumentSessionFromBooksAndDocuments([book], [document]);

    expect(getActiveBook(session)).toBe(book);
    expect(session.documents).toEqual([document]);
  });
});

describe('document session creation from empty containers', () => {
  it('rejects starting from an empty document list', () => {
    expect(() => createDocumentSessionFromDocuments([])).toThrow(
      'Document session needs at least one book, chapter, or document',
    );
  });

  it('starts from an empty book without forcing a placeholder document', () => {
    const book = createBookMetadata({
      id: 'book_empty',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Empty book',
    });

    const session = createDocumentSessionFromBooksAndDocuments([book], []);

    expect(session.activeBookId).toBe('book_empty');
    expect(session.activeChapterId).toBeNull();
    expect(session.activeDocumentId).toBeNull();
    expect(getActiveDocumentOrNull(session)).toBeNull();
  });
});

describe('document session title mutation', () => {
  it('renames only the active document', () => {
    const session = createDraftInSession(
      createDocumentSession({
        id: 'doc_1',
        bookId: 'book_1',
        now: '2026-06-11T10:00:00.000Z',
        title: 'First',
      }),
      {
        id: 'doc_2',
        bookId: 'book_1',
        now: '2026-06-11T10:01:00.000Z',
        title: 'Second',
      },
    );

    const renamed = renameActiveDocument(session, {
      now: '2026-06-11T10:02:00.000Z',
      title: 'Revised second',
    });

    expect(renamed.documents.map((document) => document.title)).toEqual([
      'First',
      'Revised second',
    ]);
    expect(renamed.activeDocumentId).toBe('doc_2');
  });
});

describe('document session document mutation', () => {
  it('keeps existing documents when a new chapter becomes active', () => {
    const session = createDraftInSession(
      createDocumentSession({
        id: 'doc_1',
        bookId: 'book_1',
        now: '2026-06-11T10:00:00.000Z',
        title: 'First',
      }),
      {
        id: 'doc_2',
        bookId: 'book_1',
        now: '2026-06-11T10:01:00.000Z',
      },
    );

    expect(session.activeDocumentId).toBe('doc_2');
    expect(session.documents.map((document) => document.id)).toEqual(['doc_1', 'doc_2']);
    expect(session.documents.at(-1)?.title).toBe('');
  });

  it('adds an existing document to a session and makes it active', () => {
    const session = createDocumentSession({
      id: 'doc_1',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'First',
    });
    const document = createDocumentSession({
      id: 'doc_2',
      bookId: 'book_1',
      now: '2026-06-11T10:01:00.000Z',
      title: 'Second',
    }).documents[0];

    const updatedSession = addDocumentToSession(session, document);

    expect(updatedSession.activeDocumentId).toBe('doc_2');
    expect(updatedSession.documents.map((document) => document.id)).toEqual(['doc_1', 'doc_2']);
  });
});

describe('document session selection within a book', () => {
  it('selects an existing document without changing document order', () => {
    const session = createDraftInSession(
      createDocumentSession({
        id: 'doc_1',
        bookId: 'book_1',
        now: '2026-06-11T10:00:00.000Z',
        title: 'First',
      }),
      {
        id: 'doc_2',
        bookId: 'book_1',
        now: '2026-06-11T10:01:00.000Z',
        title: 'Second',
      },
    );

    const selected = selectActiveDocument(session, 'doc_1');

    expect(selected.activeDocumentId).toBe('doc_1');
    expect(selected.documents.map((document) => document.id)).toEqual(['doc_1', 'doc_2']);
  });
});

describe('document session selection across books', () => {
  it('updates the active book when selecting a document from another book', () => {
    const session = createDocumentSessionFromBooksAndDocuments(
      [
        createBookMetadata({ id: 'book_1', now: '2026-06-11T10:00:00.000Z', title: 'First' }),
        createBookMetadata({ id: 'book_2', now: '2026-06-11T10:00:00.000Z', title: 'Second' }),
      ],
      [
        createDocumentSession({
          id: 'doc_1',
          bookId: 'book_1',
          now: '2026-06-11T10:00:00.000Z',
          title: 'First',
        }).documents[0],
        createDocumentSession({
          id: 'doc_2',
          bookId: 'book_2',
          now: '2026-06-11T10:01:00.000Z',
          title: 'Second',
        }).documents[0],
      ],
    );

    const selected = selectActiveDocument(session, 'doc_2');

    expect(selected.activeBookId).toBe('book_2');
    expect(selected.activeDocumentId).toBe('doc_2');
  });

  it('ignores selecting a document that is not in the session', () => {
    const session = createDocumentSession({
      id: 'doc_1',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'First',
    });

    expect(selectActiveDocument(session, 'missing')).toBe(session);
  });
});
