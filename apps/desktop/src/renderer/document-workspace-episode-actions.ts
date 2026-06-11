import {
  addDocumentToSession,
  type DocumentMetadata,
  type DocumentSession,
  selectActiveChapter,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { getInsertionDocumentOrder } from './document-workspace-ordering';
import { createUntitledDocument, persistDocumentMetadata } from './document-workspace-persistence';
import type { SaveStatus } from './document-workspace-types';

export function createEpisodeAfter(
  chapterId: string,
  previousDocumentId: string | null,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  let document: DocumentMetadata | null = null;

  setSession((session) => {
    if (!session) {
      return session;
    }

    const chapter = session.chapters.find((candidate) => candidate.id === chapterId);

    if (!chapter) {
      return session;
    }

    document = createUntitledDocument(
      chapter.bookId,
      chapter.id,
      getInsertionDocumentOrder(chapter.id, session.documents, previousDocumentId),
      'episode',
    );

    return addDocumentToSession(selectActiveChapter(session, chapter.id), document);
  });

  if (document) {
    void persistDocumentMetadata(document, setSaveStatus);
  }
}
