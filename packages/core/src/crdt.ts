export type CrdtUpdate = Uint8Array;
export type CrdtSnapshot = Uint8Array;
export type CrdtStateVector = Uint8Array;

export interface CrdtDocument {
  readonly id: string;
}

export interface CrdtAdapter<TDocument extends CrdtDocument = CrdtDocument> {
  applyUpdate(document: TDocument, update: CrdtUpdate): void;
  cloneDocument(document: TDocument, documentId?: string): TDocument;
  createDocument(documentId: string): TDocument;
  encodeSnapshot(document: TDocument): CrdtSnapshot;
  encodeStateVector(document: TDocument): CrdtStateVector;
  encodeUpdateSinceStateVector(document: TDocument, stateVector: CrdtStateVector): CrdtUpdate;
  mergeUpdates(updates: CrdtUpdate[]): CrdtUpdate;
}
