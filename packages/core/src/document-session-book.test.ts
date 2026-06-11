import { describe, expect, it } from 'vitest';
import { createBookMetadata, createQuickDraftsBook, QUICK_DRAFTS_BOOK_ID } from './books';
import {
  createDocumentSession,
  createDocumentSessionFromBooksAndDocuments,
  createDocumentSessionFromDocuments,
  getActiveBook,
  reorderDocument,
  selectActiveBook,
} from './document-session';

describe('document session book selection', () => {
  it('selects a book and its first ordered document', () => {
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

    const selected = selectActiveBook(session, 'book_2');

    expect(selected.activeBookId).toBe('book_2');
    expect(selected.activeChapterId).toBe('chapter_book_2_default');
    expect(selected.activeDocumentId).toBe('doc_2');
  });

  it('selects an empty book without an active document', () => {
    const emptyBook = createBookMetadata({
      id: 'book_empty',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Empty',
    });
    const session = createDocumentSessionFromBooksAndDocuments(
      [emptyBook, createBookMetadata({ id: 'book_1', now: '2026-06-11T10:00:00.000Z' })],
      [
        createDocumentSession({
          id: 'doc_1',
          bookId: 'book_1',
          now: '2026-06-11T10:01:00.000Z',
          title: 'First',
        }).documents[0],
      ],
    );

    const selected = selectActiveBook(session, 'book_empty');

    expect(selected.activeBookId).toBe('book_empty');
    expect(selected.activeChapterId).toBeNull();
    expect(selected.activeDocumentId).toBeNull();
  });
});

describe('document session quick drafts', () => {
  it('can represent bookless writing with the quick drafts system book', () => {
    const quickDrafts = createQuickDraftsBook('2026-06-11T10:00:00.000Z');

    const session = createDocumentSessionFromBooksAndDocuments([quickDrafts], []);

    expect(session.activeBookId).toBe(QUICK_DRAFTS_BOOK_ID);
    expect(getActiveBook(session).title).toBe('Quick Drafts');
  });
});

describe('document session ordering', () => {
  it('moves documents up and down within the same book and kind', () => {
    const first = createDocumentSession({
      id: 'doc_1',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      order: 0,
      title: 'First',
    }).documents[0];
    const second = createDocumentSession({
      id: 'doc_2',
      bookId: 'book_1',
      now: '2026-06-11T10:01:00.000Z',
      order: 1,
      title: 'Second',
    }).documents[0];
    const session = createDocumentSessionFromDocuments([first, second]);

    const reordered = reorderDocument(session, 'doc_2', 'up');

    expect(reordered.documents.map((document) => document.id)).toEqual(['doc_2', 'doc_1']);
    expect(reorderDocument(reordered, 'doc_2', 'up')).toBe(reordered);
  });

  it('does not move a document across kind sections', () => {
    const chapter = createDocumentSession({
      id: 'doc_1',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      order: 0,
      title: 'Chapter',
    }).documents[0];
    const note = createDocumentSession({
      id: 'doc_2',
      bookId: 'book_1',
      kind: 'note',
      now: '2026-06-11T10:01:00.000Z',
      order: 1,
      title: 'Note',
    }).documents[0];
    const session = createDocumentSessionFromDocuments([chapter, note]);

    expect(reorderDocument(session, 'doc_2', 'up')).toBe(session);
  });
});
