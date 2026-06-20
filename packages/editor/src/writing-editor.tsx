import Collaboration from '@tiptap/extension-collaboration';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { MouseEvent, ReactElement } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as Y from 'yjs';
import { tiptapJsonToMarkdown } from './document-export';

const SNAPSHOT_UPDATE_INTERVAL = 50;
const REMOTE_UPDATE_ORIGIN = 'remote-sync';

export interface WritingEditorProps {
  documentId: string;
  focusOnMount?: boolean;
  initialSnapshot?: Uint8Array;
  initialUpdates?: Uint8Array[];
  onDocumentUpdate?: (update: Uint8Array, snapshot?: Uint8Array) => void;
  onWordCountChange?: (wordCount: number) => void;
}

export interface WritingEditorRef {
  applyUpdate: (update: Uint8Array) => void;
  focus: () => void;
  getHtml: () => string;
  getMarkdown: () => string;
  getPlainText: () => string;
  getSnapshot: () => Uint8Array | null;
}

export const WritingEditor = forwardRef<WritingEditorRef, WritingEditorProps>(
  function WritingEditor(
    {
      documentId,
      focusOnMount = false,
      initialSnapshot,
      initialUpdates = [],
      onDocumentUpdate,
      onWordCountChange,
    },
    ref,
  ): ReactElement {
    const yDocument = useYDocument(initialUpdates, initialSnapshot);
    const content = useMemo(() => yDocument.getXmlFragment(documentId), [documentId, yDocument]);
    const editor = useWritingTiptapEditor(content, yDocument);

    useImperativeHandle(
      ref,
      () => ({
        applyUpdate: (update) => Y.applyUpdate(yDocument, update, REMOTE_UPDATE_ORIGIN),
        focus: () => editor?.chain().focus('end').run(),
        getHtml: () => editor?.getHTML() ?? '',
        getMarkdown: () => (editor ? tiptapJsonToMarkdown(editor.getJSON()) : ''),
        getPlainText: () => editor?.state.doc.textContent ?? '',
        getSnapshot: () => (editor ? Y.encodeStateAsUpdate(yDocument) : null),
      }),
      [editor, yDocument],
    );

    useDocumentUpdateEmitter(yDocument, onDocumentUpdate);
    useEditorMountFocus(editor, focusOnMount);
    useWordCountEmitter(editor, onWordCountChange);

    const focusEditor = (event: MouseEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }

      editor?.chain().focus('end').run();
    };

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: Empty writing space should focus the Tiptap editor like a native editor surface.
      <div
        className="goyo-manuscript-column goyo-writing-editor w-full flex-1 cursor-text"
        onMouseDown={focusEditor}
        style={{ fontFamily: 'var(--goyo-writing-font-family)' }}
      >
        <EditorContent editor={editor} />
      </div>
    );
  },
);

function useYDocument(
  initialUpdates: Uint8Array[],
  initialSnapshot: Uint8Array | undefined,
): Y.Doc {
  return useMemo(() => {
    const document = new Y.Doc();

    if (initialSnapshot) {
      Y.applyUpdate(document, initialSnapshot);
    }

    for (const update of initialUpdates) {
      Y.applyUpdate(document, update);
    }

    return document;
  }, [initialSnapshot, initialUpdates]);
}

function useWritingTiptapEditor(content: Y.XmlFragment, yDocument: Y.Doc) {
  return useEditor(
    {
      editorProps: {
        attributes: {
          'aria-label': 'Writing editor',
          class:
            'min-h-full cursor-text outline-none text-[var(--goyo-text-muted)] selection:bg-[var(--goyo-accent-soft)]',
          style: 'font-family: var(--goyo-writing-font-family);',
        },
      },
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: yDocument, fragment: content }),
      ],
    },
    [content, yDocument],
  );
}

function useEditorMountFocus(editor: ReturnType<typeof useEditor>, focusOnMount: boolean) {
  useEffect(() => {
    if (!editor || !focusOnMount) {
      return;
    }

    editor.chain().focus('end').run();
  }, [editor, focusOnMount]);
}

function useDocumentUpdateEmitter(
  yDocument: Y.Doc,
  onDocumentUpdate: ((update: Uint8Array, snapshot?: Uint8Array) => void) | undefined,
) {
  const updateCountRef = useRef(0);

  useEffect(() => {
    if (!onDocumentUpdate) {
      return;
    }

    const emitDocumentUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE_UPDATE_ORIGIN) {
        return;
      }

      updateCountRef.current += 1;
      const snapshot =
        updateCountRef.current % SNAPSHOT_UPDATE_INTERVAL === 0
          ? Y.encodeStateAsUpdate(yDocument)
          : undefined;

      onDocumentUpdate(update, snapshot);
    };

    yDocument.on('update', emitDocumentUpdate);

    return () => {
      yDocument.off('update', emitDocumentUpdate);
    };
  }, [onDocumentUpdate, yDocument]);
}

function useWordCountEmitter(
  editor: ReturnType<typeof useEditor>,
  onWordCountChange: ((wordCount: number) => void) | undefined,
) {
  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateWordCount = () => {
      const words = editor.state.doc.textContent.trim().split(/\s+/).filter(Boolean);

      onWordCountChange?.(words.length);
    };

    updateWordCount();
    editor.on('update', updateWordCount);

    return () => {
      editor.off('update', updateWordCount);
    };
  }, [editor, onWordCountChange]);
}
