export interface PendingBodySave {
  documentId: string;
  revision: number;
  text: string;
}

export function queuePendingBodySave(
  pendingSaves: PendingBodySave[],
  nextSave: PendingBodySave,
): PendingBodySave[] {
  const existingIndex = pendingSaves.findIndex(
    (pendingSave) => pendingSave.documentId === nextSave.documentId,
  );

  if (existingIndex === -1) {
    return [...pendingSaves, nextSave];
  }

  return pendingSaves.map((pendingSave, index) =>
    index === existingIndex ? nextSave : pendingSave,
  );
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
