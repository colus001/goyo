import { expect, it } from 'vitest';
import * as Y from 'yjs';
import { applyPersistedContent, REMOTE_UPDATE_ORIGIN } from './persisted-editor-content';

it('merges a persisted snapshot and a late remote edit into the live editor without re-emitting local edits', () => {
  const live = new Y.Doc();
  const remote = new Y.Doc();
  remote.getText('episode').insert(0, 'Start');
  const snapshot = Y.encodeStateAsUpdate(remote);
  applyPersistedContent(live, [], snapshot);

  live.getText('episode').insert(5, ' desktop');
  const checkpoint = Y.encodeStateVector(remote);
  remote.getText('episode').insert(0, 'Mobile ');
  const lateUpdate = Y.encodeStateAsUpdate(remote, checkpoint);

  const origins: unknown[] = [];
  live.on('update', (_update, origin) => origins.push(origin));
  applyPersistedContent(live, [lateUpdate], snapshot);
  applyPersistedContent(live, [lateUpdate], snapshot);

  expect(live.getText('episode').toString()).toBe('Mobile Start desktop');
  expect(origins).toEqual([REMOTE_UPDATE_ORIGIN]);
});
