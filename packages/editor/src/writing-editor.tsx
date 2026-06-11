import Collaboration from '@tiptap/extension-collaboration'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import * as Y from 'yjs'

const yDocument = new Y.Doc()
const content = yDocument.getXmlFragment('content')

export function WritingEditor(): ReactElement {
  const [wordCount, setWordCount] = useState(0)
  const editor = useEditor({
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
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    const updateWordCount = () => {
      const words = editor.getText().trim().split(/\s+/).filter(Boolean)

      setWordCount(words.length)
    }

    updateWordCount()
    editor.on('update', updateWordCount)

    return () => {
      editor.off('update', updateWordCount)
    }
  }, [editor])

  return (
    <article className="mt-12 min-h-[36rem] w-full max-w-[48rem] self-center bg-[#fffaf0] px-16 py-14 shadow-[0_24px_80px_rgb(45_41_35_/_12%)]">
      <div className="mb-8 flex items-center justify-between gap-6 border-[#eadfce] border-b pb-6">
        <input
          aria-label="Document title"
          className="min-w-0 flex-1 bg-transparent font-serif text-[2.75rem] text-[#2d2923] outline-none placeholder:text-[#a89b8b]"
          defaultValue="Untitled draft"
        />
        <p className="whitespace-nowrap font-medium text-[#7a6d5f] text-xs uppercase tracking-[0.08em]">
          {wordCount} words
        </p>
      </div>
      <EditorContent editor={editor} />
    </article>
  )
}
