import { useEffect } from 'react';
import type { SaveStatus } from './document-workspace-types';

export function useLoadSyncClientId(
  setClientId: (clientId: string) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  useEffect(() => {
    let isCancelled = false;

    void window.writerDesktop.syncClient
      .getId()
      .then((clientId) => {
        if (!isCancelled) {
          setClientId(clientId);
        }
      })
      .catch(() => setSaveStatus('Save failed'));

    return () => {
      isCancelled = true;
    };
  }, [setClientId, setSaveStatus]);
}
