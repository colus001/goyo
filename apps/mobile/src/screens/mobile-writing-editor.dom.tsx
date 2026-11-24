'use dom';

import { WritingEditor, type WritingEditorRef } from '@writer/editor';
import { base64ToBytes, bytesToBase64 } from '@writer/shared';
import { type DOMImperativeFactory, type DOMProps, useDOMImperativeHandle } from 'expo/dom';
import { type Ref, useCallback, useMemo, useRef } from 'react';

export type MobileWritingEditorHandle = DOMImperativeFactory & {
  flush: (requestId: number) => void;
};

export default function MobileWritingEditor({
  documentId,
  stateBase64,
  onFlush,
  onUpdate,
  onWordCount,
  ref,
}: {
  documentId: string;
  dom?: DOMProps;
  stateBase64: string;
  onFlush(requestId: number, ready: boolean): void;
  onUpdate(documentId: string, updateBase64: string): void;
  onWordCount(count: number): void;
  ref?: Ref<MobileWritingEditorHandle>;
}) {
  const editor = useRef<WritingEditorRef>(null);
  const snapshot = useMemo(() => base64ToBytes(stateBase64), [stateBase64]);
  const recordUpdate = useCallback(
    (update: Uint8Array) => onUpdate(documentId, bytesToBase64(update)),
    [documentId, onUpdate],
  );
  useDOMImperativeHandle<MobileWritingEditorHandle>(
    ref ?? null,
    () => ({
      flush(requestId: unknown) {
        if (typeof requestId !== 'number') return;
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        // Let ProseMirror commit an IME composition before the bridge sends its barrier.
        setTimeout(() => {
          const activeElement = document.activeElement;
          const focused = activeElement instanceof HTMLElement && activeElement.isContentEditable;
          onFlush(requestId, !focused && !editor.current?.isComposing());
        }, 60);
      },
    }),
    [onFlush],
  );

  return (
    <>
      <style>{editorStyles}</style>
      <WritingEditor
        documentId={documentId}
        initialSnapshot={snapshot}
        key={documentId}
        onDocumentUpdate={recordUpdate}
        onWordCountChange={onWordCount}
        ref={editor}
      />
    </>
  );
}

const editorStyles = `
  :root { --goyo-writing-font-family: Georgia, serif; color-scheme: light; }
  html { scroll-padding: 16px 0; }
  body { margin: 0; background: #fffaf1; }
  .goyo-writing-editor { width: 100%; min-width: 0; }
  .ProseMirror {
    box-sizing: border-box;
    min-height: 100dvh;
    padding: 12px 0 32px;
    color: #4d433b;
    font-size: 17px;
    line-height: 1.9;
    outline: none;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .ProseMirror p { margin: 0 0 1.4em; }
  .ProseMirror > :last-child { margin-bottom: 0; }
`;
