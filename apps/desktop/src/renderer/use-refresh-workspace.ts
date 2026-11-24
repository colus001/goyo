import {
  createDocumentSessionFromBooksChaptersAndDocuments,
  type DocumentSession,
} from '@writer/core';
import { type Dispatch, type SetStateAction, useEffect } from 'react';

export function useRefreshWorkspace(
  syncRevision: number,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
) {
  useEffect(() => {
    if (!syncRevision) return;
    let cancelled = false;

    void Promise.all([
      window.writerDesktop.books.list(),
      window.writerDesktop.chapters.list(),
      window.writerDesktop.documents.list(),
    ])
      .then(([books, chapters, documents]) => {
        if (cancelled || (!books.length && !chapters.length && !documents.length)) return;
        setSession((current) => {
          if (!current) {
            return createDocumentSessionFromBooksChaptersAndDocuments(books, chapters, documents);
          }
          const nextDocuments = mergeMetadata(current.documents, documents);
          const nextBooks = mergeMetadata(current.books, books);
          const nextChapters = mergeMetadata(current.chapters, chapters);
          if (
            nextDocuments === current.documents &&
            nextBooks === current.books &&
            nextChapters === current.chapters
          ) {
            return current;
          }

          const activeDocument = nextDocuments.find(({ id }) => id === current.activeDocumentId);
          return {
            ...createDocumentSessionFromBooksChaptersAndDocuments(
              nextBooks,
              nextChapters,
              nextDocuments,
            ),
            activeBookId: activeDocument?.bookId ?? current.activeBookId,
            activeChapterId: activeDocument ? activeDocument.chapterId : current.activeChapterId,
            activeDocumentId: current.activeDocumentId,
          };
        });
      })
      .catch(() => {
        // The next sync pass retries the local workspace refresh.
      });

    return () => {
      cancelled = true;
    };
  }, [setSession, syncRevision]);
}

function mergeMetadata<T extends { id: string; updatedAt: string }>(current: T[], incoming: T[]) {
  const merged = new Map(current.map((item) => [item.id, item]));
  let changed = false;
  for (const item of incoming) {
    const existing = merged.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      merged.set(item.id, item);
      changed = true;
    }
  }
  return changed ? [...merged.values()] : current;
}
