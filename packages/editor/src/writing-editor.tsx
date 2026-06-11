import Collaboration from '@tiptap/extension-collaboration'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ReactElement } from 'react'
import { useEffect, useMemo } from 'react'
import * as Y from 'yjs'

export interface WritingEditorProps {
  documentId: string
  onWordCountChange?: (wordCount: number) => void
}

export function WritingEditor({ documentId, onWordCountChange }: WritingEditorProps): ReactElement {
  const yDocument = useMemo(() => new Y.Doc(), [])
  const content = useMemo(() => yDocument.getXmlFragment(documentId), [documentId, yDocument])
  const editor = useEditor(
    {
      editorProps: {
        attributes: {
          'aria-label': 'Writing editor',
          class:
            'min-h-[28rem] outline-none font-serif text-[1.35rem] leading-[1.85] text-[#2d2923] selection:bg-[#d8cbb9]',
        },
      },
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Collaboration.configure({
          document: yDocument,
          fragment: content,
        }),
      ],
    },
    [content, yDocument],
  )

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

  return (
    <div className="min-h-[28rem]">
      <EditorContent editor={editor} />
    </div>
  )
}
