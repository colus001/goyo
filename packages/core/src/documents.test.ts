import { describe, expect, it } from 'vitest';
import { createDocumentMetadata, renameDocument } from './documents';

describe('document metadata creation', () => {
  it('creates a book-level episode with normalized title and stable timestamps', () => {
    const document = createDocumentMetadata({
      id: 'doc_1',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: '  First chapter  ',
    });

    expect(document).toEqual({
      archivedAt: null,
      bookId: 'book_1',
      chapterId: null,
      createdAt: '2026-06-11T10:00:00.000Z',
      id: 'doc_1',
      kind: 'episode',
      order: 0,
      title: 'First chapter',
      updatedAt: '2026-06-11T10:00:00.000Z',
    });
  });

  it('creates a chapter episode when a chapter id is provided', () => {
    expect(
      createDocumentMetadata({
        id: 'doc_chapter_1',
        bookId: 'book_1',
        chapterId: 'chapter_1',
        now: '2026-06-11T10:00:00.000Z',
        title: 'Scene',
      }),
    ).toMatchObject({
      bookId: 'book_1',
      chapterId: 'chapter_1',
      kind: 'episode',
      title: 'Scene',
    });
  });
});

describe('document metadata title defaults', () => {
  it('uses a safe title when a new draft title is blank', () => {
    const document = createDocumentMetadata({
      id: 'doc_2',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: '   ',
    });

    expect(document.title).toBe('');
  });
  it('creates notes and drafts in a book', () => {
    expect(
      createDocumentMetadata({
        id: 'doc_6',
        bookId: 'book_1',
        kind: 'note',
        now: '2026-06-11T10:00:00.000Z',
        order: 3,
        title: 'Research',
      }),
    ).toMatchObject({
      bookId: 'book_1',
      chapterId: null,
      id: 'doc_6',
      kind: 'note',
      order: 3,
      title: 'Research',
    });
  });
});

describe('document metadata blank rename handling', () => {
  it('renames a document without accepting blank titles', () => {
    const document = createDocumentMetadata({
      id: 'doc_3',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Draft',
    });

    expect(
      renameDocument(document, {
        now: '2026-06-11T10:05:00.000Z',
        title: '   ',
      }),
    ).toEqual(document);
  });
});

describe('document metadata title edits', () => {
  it('updates the title and updated timestamp when renamed', () => {
    const document = createDocumentMetadata({
      id: 'doc_4',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Draft',
    });

    expect(
      renameDocument(document, {
        now: '2026-06-11T10:05:00.000Z',
        title: 'Revised draft',
      }),
    ).toEqual({
      ...document,
      title: 'Revised draft',
      updatedAt: '2026-06-11T10:05:00.000Z',
    });
  });

  it('preserves spacing while editing a document title', () => {
    const document = createDocumentMetadata({
      id: 'doc_5',
      bookId: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Draft',
    });

    expect(
      renameDocument(document, {
        now: '2026-06-11T10:05:00.000Z',
        title: 'Draft with trailing space ',
      }),
    ).toEqual({
      ...document,
      title: 'Draft with trailing space ',
      updatedAt: '2026-06-11T10:05:00.000Z',
    });
  });
});
