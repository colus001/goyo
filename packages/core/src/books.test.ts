import { describe, expect, it } from 'vitest';
import { createBookMetadata, renameBook } from './books';

describe('book metadata', () => {
  it('creates a book with normalized title and stable timestamps', () => {
    expect(
      createBookMetadata({
        id: 'book_1',
        now: '2026-06-11T10:00:00.000Z',
        title: '  Novel draft  ',
      }),
    ).toEqual({
      accentColor: '#a6534b',
      archivedAt: null,
      createdAt: '2026-06-11T10:00:00.000Z',
      id: 'book_1',
      title: 'Novel draft',
      updatedAt: '2026-06-11T10:00:00.000Z',
    });
  });

  it('creates a book with a custom accent color', () => {
    expect(
      createBookMetadata({
        accentColor: '#4f6f64',
        id: 'book_1',
        now: '2026-06-11T10:00:00.000Z',
      }),
    ).toEqual(expect.objectContaining({ accentColor: '#4f6f64' }));
  });

  it('renames a book while preserving typed spacing', () => {
    const book = createBookMetadata({
      id: 'book_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Novel',
    });

    expect(
      renameBook(book, {
        now: '2026-06-11T10:05:00.000Z',
        title: 'Novel draft ',
      }),
    ).toEqual({
      ...book,
      title: 'Novel draft ',
      updatedAt: '2026-06-11T10:05:00.000Z',
    });
  });
});
