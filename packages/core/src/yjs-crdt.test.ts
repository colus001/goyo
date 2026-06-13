import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { copyYjsSnapshotFragment } from './yjs-crdt';

describe('Yjs snapshot fragment copy', () => {
  it('copies editor content from one document id fragment to another', () => {
    const source = new Y.Doc();
    const sourceFragment = source.getXmlFragment('doc_source');
    const paragraph = new Y.XmlElement('p');
    const text = new Y.XmlText();

    text.insert(0, 'Recovered text');
    paragraph.insert(0, [text]);
    sourceFragment.insert(0, [paragraph]);

    const copiedSnapshot = copyYjsSnapshotFragment(
      Y.encodeStateAsUpdate(source),
      'doc_source',
      'doc_restored',
    );
    const restored = new Y.Doc();

    Y.applyUpdate(restored, copiedSnapshot);

    expect(restored.getXmlFragment('doc_source').toString()).toBe('');
    expect(restored.getXmlFragment('doc_restored').toString()).toBe('<p>Recovered text</p>');
  });
});
