import {
  createBookMetadata,
  createDocumentSessionFromBooksChaptersAndDocuments,
  type DocumentSession,
  selectActiveBook,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { persistBookMetadata } from './document-workspace-persistence';
import type { SaveStatus, WorkspaceScreen } from './document-workspace-types';

export function createBookWithDetails(
  title: string,
  accentColor: string,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setScreen: (screen: WorkspaceScreen) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const book = createBookMetadata({
    accentColor,
    id: `book_${globalThis.crypto.randomUUID()}`,
    now: new Date().toISOString(),
    title,
  });

  void persistBookMetadata(book, setSaveStatus).then((saved) => {
    if (!saved) {
      return;
    }

    setSession((session) => {
      if (!session) {
        return createDocumentSessionFromBooksChaptersAndDocuments([book], [], []);
      }

      return selectActiveBook({ ...session, books: [...session.books, book] }, book.id);
    });
    setScreen('book');
  });
}
