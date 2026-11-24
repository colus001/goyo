import { describe, expect, it } from 'vitest';
import {
  createDocumentSessionFromBooksChaptersAndDocuments,
  type DocumentSession,
} from './document-session';
import { moveEpisodeToChapter } from './document-session-placement';

const now = '2026-11-24T01:00:00.000Z';
const movedAt = '2026-11-24T02:00:00.000Z';
const metadata = { archivedAt: null, createdAt: now, updatedAt: now };
const episode = {
  ...metadata,
  bookId: 'book',
  chapterId: null,
  id: 'episode',
  kind: 'episode',
  order: 0,
  title: 'Draft text',
} as const;

function createSession(): DocumentSession {
  return createDocumentSessionFromBooksChaptersAndDocuments(
    [],
    [
      { ...metadata, bookId: 'book', id: 'chapter', order: 0, title: 'Chapter' },
      { ...metadata, bookId: 'other', id: 'other-chapter', order: 0, title: 'Other book' },
    ],
    [episode, { ...episode, chapterId: 'chapter', id: 'existing', order: 4 }],
  );
}

describe('moving an episode between chapters', () => {
  it('appends an existing episode without changing its identity and retains selection', () => {
    const session = { ...createSession(), activeDocumentId: episode.id };
    const next = moveEpisodeToChapter(session, episode.id, 'chapter', movedAt);

    expect(next.activeDocumentId).toBe(episode.id);
    expect(next.activeChapterId).toBe('chapter');
    expect(next.documents.find(({ id }) => id === episode.id)).toEqual({
      ...episode,
      chapterId: 'chapter',
      order: 5,
      updatedAt: movedAt,
    });
    expect(moveEpisodeToChapter(next, episode.id, null, movedAt)).toMatchObject({
      activeChapterId: null,
      documents: expect.arrayContaining([
        expect.objectContaining({ chapterId: null, id: episode.id }),
      ]),
    });
  });

  it('does not move episodes outside their book or change a no-op', () => {
    const session = createSession();
    expect(moveEpisodeToChapter(session, episode.id, 'other-chapter', movedAt)).toBe(session);
    expect(moveEpisodeToChapter(session, episode.id, 'missing', movedAt)).toBe(session);
    expect(moveEpisodeToChapter(session, episode.id, null, movedAt)).toBe(session);
  });
});
