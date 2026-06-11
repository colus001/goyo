import { type DocumentSession, reorderChapter } from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { persistChapterMetadata } from './document-workspace-persistence';
import type { SaveStatus } from './document-workspace-types';

export function moveChapter(
  chapterId: string,
  direction: 'down' | 'up',
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  setSession((session) => {
    if (!session) {
      return session;
    }

    const reordered = reorderChapter(session, chapterId, direction);

    for (const chapter of reordered.chapters) {
      const previous = session.chapters.find((candidate) => candidate.id === chapter.id);
      if (previous && previous.order !== chapter.order) {
        void persistChapterMetadata(chapter, setSaveStatus);
      }
    }

    return reordered;
  });
}
