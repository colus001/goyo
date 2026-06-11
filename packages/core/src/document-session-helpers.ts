import { type ChapterMetadata, createChapterMetadata } from './chapters';
import type { DocumentMetadata } from './documents';

export function ensureChaptersForDocuments(
  chapters: ChapterMetadata[],
  documents: DocumentMetadata[],
): ChapterMetadata[] {
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));

  for (const document of documents) {
    if (!document.chapterId) {
      continue;
    }

    if (chaptersById.has(document.chapterId)) {
      continue;
    }

    chaptersById.set(
      document.chapterId,
      createChapterMetadata({
        bookId: document.bookId,
        id: document.chapterId,
        now: document.createdAt,
        title: document.kind === 'draft' ? 'Inbox' : 'Untitled chapter',
      }),
    );
  }

  return Array.from(chaptersById.values());
}

export function sortChapters(chapters: ChapterMetadata[]): ChapterMetadata[] {
  return [...chapters].sort((first, second) => {
    if (first.bookId !== second.bookId) {
      return first.bookId.localeCompare(second.bookId);
    }

    if (first.order !== second.order) {
      return first.order - second.order;
    }

    return first.createdAt.localeCompare(second.createdAt);
  });
}

export function sortDocuments(documents: DocumentMetadata[]): DocumentMetadata[] {
  return [...documents].sort((first, second) => {
    if (first.bookId !== second.bookId) {
      return first.bookId.localeCompare(second.bookId);
    }

    const firstChapterId = first.chapterId ?? '';
    const secondChapterId = second.chapterId ?? '';

    if (firstChapterId !== secondChapterId) {
      return firstChapterId.localeCompare(secondChapterId);
    }

    if (first.order !== second.order) {
      return first.order - second.order;
    }

    return first.createdAt.localeCompare(second.createdAt);
  });
}
