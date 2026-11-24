export interface PendingBodySave {
  createdAt: string;
  documentId: string;
  id: string;
  revision: number;
  updateBase64: string;
}

export function queuePendingBodySave(
  pendingSaves: PendingBodySave[],
  nextSave: PendingBodySave,
): PendingBodySave[] {
  // A later Yjs update can depend on an earlier one, so never coalesce by document.
  return [...pendingSaves, nextSave];
}

export function completePendingBodySave(
  pendingSaves: PendingBodySave[],
  completedSave: PendingBodySave,
): PendingBodySave[] {
  return pendingSaves.filter(
    (pendingSave) =>
      pendingSave.documentId !== completedSave.documentId ||
      pendingSave.revision !== completedSave.revision,
  );
}

export async function flushPendingBodySaves(
  documentId: string,
  getPendingSaves: () => PendingBodySave[],
  persist: (pendingSave: PendingBodySave) => Promise<void>,
): Promise<boolean> {
  while (true) {
    const pendingSave = getPendingSaves().find((save) => save.documentId === documentId);

    if (!pendingSave) {
      return true;
    }

    try {
      await persist(pendingSave);
    } catch {
      return false;
    }
  }
}
