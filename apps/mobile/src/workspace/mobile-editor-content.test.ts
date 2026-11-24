import { base64ToBytes, bytesToBase64 } from '@writer/shared';
import { expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { loadMobileEditorContent, persistMobileEditorUpdate } from './mobile-editor-content';

const episode = 'episode-1';
const now = '2026-11-24T12:00:00.000Z';

it('merges persisted remote edits without replacing text typed while sync was in flight', async () => {
  const original = new Y.Doc();
  const heading = new Y.XmlElement('heading');
  heading.setAttribute('level', '2');
  heading.insert(0, [new Y.XmlText('제목')]);
  original.getXmlFragment(episode).insert(0, [heading]);
  const snapshot = Y.encodeStateAsUpdate(original);

  const live = new Y.Doc();
  Y.applyUpdate(live, snapshot);
  const liveHeading = live.getXmlFragment(episode).get(0) as Y.XmlElement;
  (liveHeading.get(0) as Y.XmlText).insert(2, ' 작성 중');

  const vector = Y.encodeStateVector(original);
  (heading.get(0) as Y.XmlText).insert(0, '원격 ');
  const lateUpdate = Y.encodeStateAsUpdate(original, vector);
  const stored = await loadMobileEditorContent(
    {
      getDocumentBody: vi.fn(async () => ''),
      getLatestDocumentSnapshot: vi.fn(async () => ({
        createdAt: now,
        documentId: episode,
        id: 'snapshot-1',
        lastUpdateId: 'newer-update',
        snapshot,
      })),
      listDocumentUpdates: vi.fn(async () => [
        {
          clientId: 'remote',
          createdAt: now,
          documentId: episode,
          id: 'late',
          update: lateUpdate,
        },
      ]),
    },
    episode,
  );

  Y.applyUpdate(live, base64ToBytes(stored.stateBase64));
  expect(live.getXmlFragment(episode).toString()).toBe(
    '<heading level="2">원격 제목 작성 중</heading>',
  );
});

it('exposes legacy text without migrating or overwriting it on open', async () => {
  const store = {
    getDocumentBody: vi.fn(async () => '오래된 초안\n'),
    getLatestDocumentSnapshot: vi.fn(async () => null),
    listDocumentUpdates: vi.fn(async () => []),
  };
  const content = await loadMobileEditorContent(store, episode);
  expect(content.legacyText).toBe('오래된 초안\n');
  const doc = new Y.Doc();
  Y.applyUpdate(doc, base64ToBytes(content.stateBase64));
  expect(doc.getXmlFragment(episode).length).toBe(0);
});

it('persists the original incremental bytes and stable queue identity across a retry', async () => {
  const saveLocalDocumentUpdate = vi.fn().mockRejectedValueOnce(new Error('busy'));
  const store = { saveLocalDocumentUpdate };
  const update = new Uint8Array([1, 2, 3]);
  const pending = {
    createdAt: now,
    documentId: episode,
    id: 'update-1',
    revision: 1,
    updateBase64: bytesToBase64(update),
  };

  await expect(persistMobileEditorUpdate(store, 'mobile', pending)).rejects.toThrow('busy');
  await persistMobileEditorUpdate(store, 'mobile', pending);
  expect(saveLocalDocumentUpdate).toHaveBeenCalledTimes(2);
  expect(saveLocalDocumentUpdate.mock.calls[1]).toEqual(saveLocalDocumentUpdate.mock.calls[0]);
  expect(saveLocalDocumentUpdate).toHaveBeenLastCalledWith(
    expect.objectContaining({ documentId: episode, id: 'update-1', update }),
    expect.objectContaining({ documentId: episode, id: 'sync_update-1', recordId: 'update-1' }),
  );
});
