import Collaboration from '@tiptap/extension-collaboration';
import StarterKit from '@tiptap/starter-kit';
import type * as Y from 'yjs';

export function createWritingExtensions(document: Y.Doc, fragment: Y.XmlFragment) {
  return [
    StarterKit.configure({ undoRedo: false }),
    Collaboration.configure({ document, fragment }),
  ];
}
