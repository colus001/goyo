import type { BookId } from '@writer/shared';

const DEFAULT_BOOK_TITLE = 'Untitled book';

export const DEFAULT_BOOK_ACCENT_COLOR = '#a6534b';
export const QUICK_DRAFTS_ACCENT_COLOR = '#d7dbd2';
export const QUICK_DRAFTS_BOOK_ID = 'book_quick_drafts';
export const QUICK_DRAFTS_BOOK_TITLE = 'Quick Drafts';

export interface BookMetadata {
  accentColor: string;
  id: BookId;
  title: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateBookMetadataInput {
  accentColor?: string;
  id: BookId;
  now: string;
  title?: string;
}

export interface RenameBookInput {
  now: string;
  title: string;
}

export function createBookMetadata(input: CreateBookMetadataInput): BookMetadata {
  return {
    accentColor: input.accentColor ?? DEFAULT_BOOK_ACCENT_COLOR,
    archivedAt: null,
    createdAt: input.now,
    id: input.id,
    title: normalizeBookTitle(input.title),
    updatedAt: input.now,
  };
}

export function createQuickDraftsBook(now: string): BookMetadata {
  return createBookMetadata({
    id: QUICK_DRAFTS_BOOK_ID,
    accentColor: QUICK_DRAFTS_ACCENT_COLOR,
    now,
    title: QUICK_DRAFTS_BOOK_TITLE,
  });
}

export function renameBook(book: BookMetadata, input: RenameBookInput): BookMetadata {
  const title = input.title;

  if (title.trim().length === 0 || title === book.title) {
    return book;
  }

  return {
    ...book,
    title,
    updatedAt: input.now,
  };
}

function normalizeBookTitle(title: string | undefined): string {
  const normalizedTitle = title?.trim() ?? '';

  if (normalizedTitle.length === 0) {
    return DEFAULT_BOOK_TITLE;
  }

  return normalizedTitle;
}
