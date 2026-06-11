import type { ChapterMetadata, DocumentKind, DocumentMetadata } from '@writer/core';

export function getNextDocumentOrder(
  bookId: string,
  chapterId: string | null,
  documents: DocumentMetadata[],
  kind: DocumentKind,
): number {
  const orders = documents
    .filter(
      (document) =>
        document.bookId === bookId && document.chapterId === chapterId && document.kind === kind,
    )
    .map((document) => document.order);

  return Math.max(-1, ...orders) + 1;
}

export function getNextChapterOrder(bookId: string, chapters: ChapterMetadata[]): number {
  const orders = chapters
    .filter((chapter) => chapter.bookId === bookId)
    .map((chapter) => chapter.order);

  return Math.max(-1, ...orders) + 1;
}

export function getInsertionDocumentOrder(
  bookId: string,
  chapterId: string | null,
  documents: DocumentMetadata[],
  previousDocumentId: string | null,
): number {
  const episodes = documents
    .filter(
      (document) =>
        document.bookId === bookId &&
        document.chapterId === chapterId &&
        document.kind === 'episode',
    )
    .sort((first, second) => first.order - second.order);

  if (!previousDocumentId) {
    return (episodes[0]?.order ?? 0) - 1;
  }

  const previousIndex = episodes.findIndex((document) => document.id === previousDocumentId);
  const previous = episodes[previousIndex];
  const next = episodes[previousIndex + 1];

  if (!previous) {
    return Math.max(-1, ...episodes.map((document) => document.order)) + 1;
  }

  if (!next) {
    return previous.order + 1;
  }

  return (previous.order + next.order) / 2;
}
