import type { DocumentId, SyncClientId } from '@writer/shared';
import type { DocumentUpdateRecord } from './sync';

export interface CreateDocumentUpdateRecordInput {
  clientId: SyncClientId;
  createdAt: string;
  documentId: DocumentId;
  id: string;
  update: Uint8Array;
}

export function createDocumentUpdateRecord(
  input: CreateDocumentUpdateRecordInput,
): DocumentUpdateRecord {
  return {
    clientId: input.clientId,
    createdAt: input.createdAt,
    documentId: input.documentId,
    id: input.id,
    update: input.update,
  };
}

export function sortDocumentUpdatesForReplay(
  updates: DocumentUpdateRecord[],
): DocumentUpdateRecord[] {
  return [...updates].sort((first, second) => {
    const createdAtOrder = first.createdAt.localeCompare(second.createdAt);

    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    return first.id.localeCompare(second.id);
  });
}
