import Collaboration from '@tiptap/extension-collaboration'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ReactElement } from 'react'
import { useEffect, useMemo } from 'react'
import * as Y from 'yjs'

export interface WritingEditorProps {
  documentId: string
  initialUpdates?: Uint8Array[]
  onDocumentUpdate?: (update: Uint8Array) => void
  onWordCountChange?: (wordCount: number) => void
}

export function WritingEditor({
  documentId,
  initialUpdates = [],
  onDocumentUpdate,
  onWordCountChange,
}: WritingEditorProps): ReactElement {
  const yDocument = useYDocument(initialUpdates)
  const content = useMemo(() => yDocument.getXmlFragment(documentId), [documentId, yDocument])
  const editor = useWritingTiptapEditor(content, yDocument)

  useDocumentUpdateEmitter(yDocument, onDocumentUpdate)
  useWordCountEmitter(editor, onWordCountChange)

  return (
    <div className="min-h-[28rem]">
      <EditorContent editor={editor} />
    </div>
  )
}

function useYDocument(initialUpdates: Uint8Array[]): Y.Doc {
  return useMemo(() => {
    const document = new Y.Doc()

    for (const update of initialUpdates) {
      Y.applyUpdate(document, update)
    }

    return document
  }, [initialUpdates])
}

function useWritingTiptapEditor(content: Y.XmlFragment, yDocument: Y.Doc) {
  return useEditor(
    {
      editorProps: {
        attributes: {
          'aria-label': 'Writing editor',
          class:
            'min-h-[28rem] outline-none font-serif text-[1.35rem] leading-[1.85] text-[#2d2923] selection:bg-[#d8cbb9]',
        },
      },
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: yDocument, fragment: content }),
      ],
    },
    [content, yDocument],
  )
}

function useDocumentUpdateEmitter(
  yDocument: Y.Doc,
  onDocumentUpdate: ((update: Uint8Array) => void) | undefined,
) {
  useEffect(() => {
    if (!onDocumentUpdate) {
      return
    }

    const emitDocumentUpdate = (update: Uint8Array) => onDocumentUpdate(update)

    yDocument.on('update', emitDocumentUpdate)

    return () => {
      yDocument.off('update', emitDocumentUpdate)
    }
  }, [onDocumentUpdate, yDocument])
}

function useWordCountEmitter(
  editor: ReturnType<typeof useEditor>,
  onWordCountChange: ((wordCount: number) => void) | undefined,
) {
  useEffect(() => {
    if (!editor) {
      return
    }

    const updateWordCount = () => {
      const words = editor.getText().trim().split(/\s+/).filter(Boolean)

      onWordCountChange?.(words.length)
    }

    updateWordCount()
    editor.on('update', updateWordCount)

    return () => {
      editor.off('update', updateWordCount)
    }
  }, [editor, onWordCountChange])
}
