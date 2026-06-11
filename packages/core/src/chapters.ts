import type { BookId, ChapterId } from '@writer/shared';

const DEFAULT_CHAPTER_TITLE = 'Untitled chapter';

export const QUICK_DRAFTS_INBOX_CHAPTER_ID = 'chapter_quick_drafts_inbox';
export const QUICK_DRAFTS_INBOX_CHAPTER_TITLE = 'Inbox';

export interface ChapterMetadata {
  id: ChapterId;
  bookId: BookId;
  order: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateChapterMetadataInput {
  id: ChapterId;
  bookId: BookId;
  now: string;
  order?: number;
  title?: string;
}

export interface RenameChapterInput {
  now: string;
  title: string;
}

export function createChapterMetadata(input: CreateChapterMetadataInput): ChapterMetadata {
  return {
    archivedAt: null,
    bookId: input.bookId,
    createdAt: input.now,
    id: input.id,
    order: input.order ?? 0,
    title: normalizeChapterTitle(input.title),
    updatedAt: input.now,
  };
}

export function createQuickDraftsInboxChapter(now: string): ChapterMetadata {
  return createChapterMetadata({
    bookId: 'book_quick_drafts',
    id: QUICK_DRAFTS_INBOX_CHAPTER_ID,
    now,
    title: QUICK_DRAFTS_INBOX_CHAPTER_TITLE,
  });
}

export function renameChapter(
  chapter: ChapterMetadata,
  input: RenameChapterInput,
): ChapterMetadata {
  const title = input.title;

  if (title.trim().length === 0 || title === chapter.title) {
    return chapter;
  }

  return {
    ...chapter,
    title,
    updatedAt: input.now,
  };
}

function normalizeChapterTitle(title: string | undefined): string {
  const normalizedTitle = title?.trim() ?? '';

  if (normalizedTitle.length === 0) {
    return DEFAULT_CHAPTER_TITLE;
  }

  return normalizedTitle;
}
