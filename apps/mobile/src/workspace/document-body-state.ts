type DocumentBodyLoadStatus = 'failed' | 'loaded' | 'loading';

interface DocumentBodyState {
  loadStatus: DocumentBodyLoadStatus;
  text: string;
}

export type DocumentBodyStates = Record<string, DocumentBodyState>;

export function beginDocumentBodyLoad(
  states: DocumentBodyStates,
  documentId: string,
): DocumentBodyStates {
  return setDocumentBodyState(states, documentId, {
    loadStatus: 'loading',
    text: states[documentId]?.text ?? '',
  });
}

export function completeDocumentBodyLoad(
  states: DocumentBodyStates,
  documentId: string,
  text: string,
): DocumentBodyStates {
  return setDocumentBodyState(states, documentId, { loadStatus: 'loaded', text });
}

export function failDocumentBodyLoad(
  states: DocumentBodyStates,
  documentId: string,
): DocumentBodyStates {
  return setDocumentBodyState(states, documentId, {
    loadStatus: 'failed',
    text: states[documentId]?.text ?? '',
  });
}

export function updateDocumentBodyText(
  states: DocumentBodyStates,
  documentId: string,
  text: string,
): DocumentBodyStates {
  return setDocumentBodyState(states, documentId, { loadStatus: 'loaded', text });
}

export function getDocumentBodyText(states: DocumentBodyStates, documentId: string | null): string {
  return documentId ? (states[documentId]?.text ?? '') : '';
}

export function canEditDocumentBody(
  states: DocumentBodyStates,
  documentId: string | null,
): boolean {
  return Boolean(documentId && states[documentId]?.loadStatus === 'loaded');
}

function setDocumentBodyState(
  states: DocumentBodyStates,
  documentId: string,
  state: DocumentBodyState,
): DocumentBodyStates {
  return { ...states, [documentId]: state };
}
