import { writeFile } from 'node:fs/promises';
import { dialog } from 'electron';
import type { DesktopLocalStore } from './document-metadata-store';

interface LocalBackupExportResult {
  exported: boolean;
  filePath: string | null;
}

export async function exportLocalBackup(
  store: DesktopLocalStore,
): Promise<LocalBackupExportResult> {
  const result = await dialog.showSaveDialog({
    defaultPath: `goyo-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ extensions: ['json'], name: 'JSON backup' }],
    title: 'Export local Goyo backup',
  });

  if (result.canceled || !result.filePath) {
    return { exported: false, filePath: null };
  }

  await writeFile(result.filePath, JSON.stringify(createLocalBackupPayload(store), null, 2));

  return { exported: true, filePath: result.filePath };
}

function createLocalBackupPayload(store: DesktopLocalStore) {
  return {
    books: store.listAllBooks(),
    chapters: store.listAllChapters(),
    documentSnapshots: store.listAllDocumentSnapshots().map((snapshot) => ({
      createdAt: snapshot.createdAt,
      documentId: snapshot.documentId,
      id: snapshot.id,
      lastUpdateId: snapshot.lastUpdateId,
      snapshotBase64: Buffer.from(snapshot.snapshot).toString('base64'),
    })),
    documentUpdates: store.listAllDocumentUpdates().map((update) => ({
      clientId: update.clientId,
      createdAt: update.createdAt,
      documentId: update.documentId,
      id: update.id,
      updateBase64: Buffer.from(update.update).toString('base64'),
    })),
    documents: store.listAllDocuments(),
    exportedAt: new Date().toISOString(),
    recoveryPoints: store.listAllRecoveryPoints(),
    schemaVersion: 1,
  };
}
