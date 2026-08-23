import { describe, expect, it } from 'vitest';
import {
  beginDocumentBodyLoad,
  canEditDocumentBody,
  completeDocumentBodyLoad,
  getDocumentBodyText,
  updateDocumentBodyText,
} from './document-body-state';

describe('mobile document body state', () => {
  it('keeps body text and loading state scoped to each document', () => {
    const loadingA = beginDocumentBodyLoad({}, 'document-a');
    const loadedA = completeDocumentBodyLoad(loadingA, 'document-a', 'Text for A');
    const loadingB = beginDocumentBodyLoad(loadedA, 'document-b');

    expect(getDocumentBodyText(loadingB, 'document-a')).toBe('Text for A');
    expect(getDocumentBodyText(loadingB, 'document-b')).toBe('');
    expect(canEditDocumentBody(loadingB, 'document-a')).toBe(true);
    expect(canEditDocumentBody(loadingB, 'document-b')).toBe(false);
  });

  it('allows editing only after the requested document finishes loading', () => {
    const loading = beginDocumentBodyLoad({}, 'document-a');
    const loaded = completeDocumentBodyLoad(loading, 'document-a', 'Loaded text');

    expect(canEditDocumentBody(loading, 'document-a')).toBe(false);
    expect(canEditDocumentBody(loaded, 'document-a')).toBe(true);
  });

  it('updates only the active document body', () => {
    const initial = completeDocumentBodyLoad(
      completeDocumentBodyLoad({}, 'document-a', 'Text for A'),
      'document-b',
      'Text for B',
    );
    const updated = updateDocumentBodyText(initial, 'document-b', 'Edited B');

    expect(getDocumentBodyText(updated, 'document-a')).toBe('Text for A');
    expect(getDocumentBodyText(updated, 'document-b')).toBe('Edited B');
  });
});
