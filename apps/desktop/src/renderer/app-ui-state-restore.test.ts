import {
  createBookMetadata,
  createChapterMetadata,
  createDocumentMetadata,
  createQuickDraftsBook,
  createQuickDraftsInboxChapter,
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
} from '@writer/core';
import { describe, expect, it } from 'vitest';
import type { AppUiState } from '../shared/app-ui-state';
import { restoreWorkspaceState } from './app-ui-state-restore';

const NOW = '2026-06-12T13:45:00.000Z';

describe('restoreWorkspaceState selection', () => {
  it('restores a valid active document and UI state', () => {
    const book = createBookMetadata({ id: 'book_a', now: NOW, title: 'Book A' });
    const chapter = createChapterMetadata({ bookId: book.id, id: 'chapter_a', now: NOW });
    const document = createDocumentMetadata({
      bookId: book.id,
      chapterId: chapter.id,
      id: 'doc_a',
      now: NOW,
    });

    const restored = restoreWorkspaceState({
      books: [book],
      chapters: [chapter],
      documents: [document],
      savedState: createSavedState({
        activeBookId: book.id,
        activeChapterId: chapter.id,
        activeDocumentId: document.id,
        expandedChapterIds: [chapter.id, 'missing_chapter'],
        isSidebarCollapsed: true,
      }),
    });

    expect(restored.screen).toBe('book');
    expect(restored.session?.activeDocumentId).toBe(document.id);
    expect(restored.expandedChapterIds).toEqual([chapter.id]);
    expect(restored.isSidebarCollapsed).toBe(true);
  });

  it('falls back to the library when the saved book is missing', () => {
    const book = createBookMetadata({ id: 'book_a', now: NOW, title: 'Book A' });

    const restored = restoreWorkspaceState({
      books: [book],
      chapters: [],
      documents: [],
      savedState: createSavedState({ activeBookId: 'missing_book' }),
    });

    expect(restored.screen).toBe('library');
    expect(restored.session?.activeBookId).toBe(book.id);
  });
});

describe('restoreWorkspaceState special cases', () => {
  it('restores Quick Drafts like a normal workspace', () => {
    const book = createQuickDraftsBook(NOW);
    const chapter = createQuickDraftsInboxChapter(NOW);
    const document = createDocumentMetadata({
      bookId: QUICK_DRAFTS_BOOK_ID,
      chapterId: QUICK_DRAFTS_INBOX_CHAPTER_ID,
      id: 'quick_doc',
      kind: 'draft',
      now: NOW,
    });

    const restored = restoreWorkspaceState({
      books: [book],
      chapters: [chapter],
      documents: [document],
      savedState: createSavedState({
        activeBookId: book.id,
        activeChapterId: chapter.id,
        activeDocumentId: document.id,
      }),
    });

    expect(restored.screen).toBe('book');
    expect(restored.session?.activeDocumentId).toBe(document.id);
  });

  it('keeps an empty workspace in the library', () => {
    const restored = restoreWorkspaceState({
      books: [],
      chapters: [],
      documents: [],
      savedState: createSavedState({ isSidebarCollapsed: true }),
    });

    expect(restored.screen).toBe('library');
    expect(restored.session).toBeNull();
    expect(restored.isSidebarCollapsed).toBe(true);
  });
});

function createSavedState(state: Partial<AppUiState>): AppUiState {
  return {
    activeBookId: null,
    activeChapterId: null,
    activeDocumentId: null,
    expandedChapterIds: [],
    isSidebarCollapsed: false,
    lastScreen: 'book',
    updatedAt: NOW,
    ...state,
  };
}
