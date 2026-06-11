import { addDocumentToSession, type DocumentMetadata, type DocumentSession } from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { getInsertionDocumentOrder } from './document-workspace-ordering';
import { createUntitledDocument, persistDocumentMetadata } from './document-workspace-persistence';
import type { SaveStatus } from './document-workspace-types';

export function createEpisodeAfter(
  chapterId: string | null,
  previousDocumentId: string | null,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  let document: DocumentMetadata | null = null;

  setSession((session) => {
    if (!session) {
      return session;
    }

    const bookId = chapterId
      ? session.chapters.find((candidate) => candidate.id === chapterId)?.bookId
      : session.activeBookId;

    if (!bookId) {
      return session;
    }

    document = createUntitledDocument(
      bookId,
      chapterId,
      getInsertionDocumentOrder(bookId, chapterId, session.documents, previousDocumentId),
      'episode',
    );

    return addDocumentToSession(session, document);
  });

  if (document) {
    void persistDocumentMetadata(document, setSaveStatus);
  }
}
