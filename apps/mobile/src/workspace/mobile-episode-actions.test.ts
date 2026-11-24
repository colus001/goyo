import { createDocumentSessionFromBooksChaptersAndDocuments } from '@writer/core';
import { describe, expect, it, vi } from 'vitest';
import type { MobileLocalStore } from '../storage/mobile-local-store';
import { createAndPersistEpisode } from './mobile-workspace-actions';

const now = '2026-11-24T01:00:00.000Z';
const book = {
  accentColor: '#123456',
  archivedAt: null,
  createdAt: now,
  id: 'book',
  title: 'Book',
  updatedAt: now,
};
const chapter = {
  archivedAt: null,
  bookId: book.id,
  createdAt: now,
  id: 'chapter',
  order: 0,
  title: 'Chapter',
  updatedAt: now,
};

describe('creating an episode from the mobile book route', () => {
  it('returns the saved episode ID for navigation and retains the chosen chapter', async () => {
    const saveDocument = vi.fn();
    const store = { saveDocument } as unknown as MobileLocalStore;
    let session = createDocumentSessionFromBooksChaptersAndDocuments([book], [chapter], []);
    const id = await createAndPersistEpisode(
      store,
      session,
      chapter.id,
      (update) => {
        session = update(session) ?? session;
      },
      vi.fn(),
    );

    expect(id).toBeTruthy();
    expect(saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ id, chapterId: chapter.id }),
    );
    expect(session.activeDocumentId).toBe(id);
    expect(session.activeChapterId).toBe(chapter.id);
  });
});
