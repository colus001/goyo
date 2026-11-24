// @vitest-environment happy-dom
import { Editor } from '@tiptap/react';
import { afterEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createWritingExtensions } from './writing-extensions';

const clients: Editor[] = [];
afterEach(() => {
  for (const editor of clients.splice(0)) editor.destroy();
});

describe('shared writing editor collaboration', () => {
  it.each([
    { split: 1, insert: 10 },
    { split: 7, insert: 3 },
    { split: 7, insert: 7 },
    { split: 7, insert: 10 },
    { split: 13, insert: 10 },
  ])('preserves concurrent typing when splitting at $split and typing at $insert', ({
    split,
    insert,
  }) => {
    const { desktop, desktopDoc, mobile, mobileDoc } = createPair('<p>first second</p>');
    const desktopBase = Y.encodeStateVector(desktopDoc);
    const mobileBase = Y.encodeStateVector(mobileDoc);

    mobile.commands.setTextSelection(split);
    expect(mobile.commands.splitBlock()).toBe(true);
    mobile.commands.insertContent('mobile ');
    desktop.commands.insertContentAt(insert, 'DESKTOP');

    const fromDesktop = Y.encodeStateAsUpdate(desktopDoc, desktopBase);
    const fromMobile = Y.encodeStateAsUpdate(mobileDoc, mobileBase);
    Y.applyUpdate(desktopDoc, fromMobile);
    Y.applyUpdate(mobileDoc, fromDesktop);

    expect(mobile.getJSON()).toEqual(desktop.getJSON());
    expect(mobile.getJSON().content).toHaveLength(2);
    expect(mobile.state.doc.textContent).toContain('mobile');
    expect(mobile.state.doc.textContent).toContain('DESKTOP');
    expect(mobile.state.doc.textContent.replace(/mobile |DESKTOP/g, '')).toBe('first second');
  });

  it('keeps desktop rich-text structure when the mobile editor edits the text', () => {
    const { desktop, desktopDoc, mobile, mobileDoc } = createPair(
      '<h2>Heading</h2><ul><li><p><strong>Bold</strong> item</p></li></ul><blockquote><p>Quote</p></blockquote>',
    );
    const base = Y.encodeStateVector(mobileDoc);
    mobile.commands.insertContentAt(4, '!');
    Y.applyUpdate(desktopDoc, Y.encodeStateAsUpdate(mobileDoc, base));

    expect(desktop.getHTML()).toBe(mobile.getHTML());
    expect(desktop.getHTML()).toContain('<h2>Hea!ding</h2>');
    expect(desktop.getHTML()).toContain('<li><p><strong>Bold</strong> item</p></li>');
    expect(desktop.getHTML()).toContain('<blockquote><p>Quote</p></blockquote>');
  });
});

function createPair(html: string) {
  const desktopDoc = new Y.Doc();
  const desktop = createEditor(desktopDoc);
  desktop.commands.setContent(html);
  const mobileDoc = new Y.Doc();
  Y.applyUpdate(mobileDoc, Y.encodeStateAsUpdate(desktopDoc));
  const mobile = createEditor(mobileDoc);
  return { desktop, desktopDoc, mobile, mobileDoc };
}

function createEditor(document: Y.Doc) {
  const editor = new Editor({
    element: window.document.createElement('div'),
    extensions: createWritingExtensions(document, document.getXmlFragment('episode')),
  });
  clients.push(editor);
  return editor;
}
