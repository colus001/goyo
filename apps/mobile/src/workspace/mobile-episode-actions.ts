import { type DocumentSession, moveEpisodeToChapter } from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import type { MobileLocalStore } from '../storage/mobile-local-store';
import type { MobileWorkspaceStatus } from './mobile-workspace-types';

export async function moveAndPersistEpisode(
  store: MobileLocalStore | null,
  session: DocumentSession | null,
  documentId: string,
  chapterId: string | null,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setStatus: (status: MobileWorkspaceStatus) => void,
): Promise<boolean> {
  if (!store || !session) return false;
  const now = new Date().toISOString();
  const nextSession = moveEpisodeToChapter(session, documentId, chapterId, now);
  if (nextSession === session) return false;
  const document = nextSession.documents.find(({ id }) => id === documentId);
  if (!document) return false;

  setStatus('Saving');
  try {
    await store.saveDocument(document);
    setSession((current) =>
      current ? moveEpisodeToChapter(current, documentId, chapterId, now) : current,
    );
    setStatus('Ready');
    return true;
  } catch {
    setStatus('Save failed');
    return false;
  }
}
