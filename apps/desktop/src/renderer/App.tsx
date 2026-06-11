import {
  createDocumentSession,
  createDraftInSession,
  getActiveDocument,
  renameActiveDocument,
  selectActiveDocument,
} from '@writer/core'
import { WritingEditor } from '@writer/editor'
import { WritingShellPreview } from '@writer/ui'
import { useState } from 'react'

export function App() {
  const [session, setSession] = useState(() =>
    createDocumentSession({
      id: createDocumentId(),
      now: new Date().toISOString(),
      title: 'Untitled draft',
    }),
  )
  const [wordCount, setWordCount] = useState(0)
  const activeDocument = getActiveDocument(session)

  function createDraft() {
    setSession((currentSession) =>
      createDraftInSession(currentSession, {
        id: createDocumentId(),
        now: new Date().toISOString(),
      }),
    )
    setWordCount(0)
  }

  function renameDraft(title: string) {
    setSession((currentSession) =>
      renameActiveDocument(currentSession, {
        now: new Date().toISOString(),
        title,
      }),
    )
  }

  function openDraft(documentId: string) {
    setSession((currentSession) => selectActiveDocument(currentSession, documentId))
    setWordCount(0)
  }

  return (
    <WritingShellPreview
      activeDocumentId={session.activeDocumentId}
      documents={session.documents}
      onCreateDocument={createDraft}
      onSelectDocument={openDraft}
    >
      <article className="mt-12 min-h-[36rem] w-full max-w-[48rem] self-center bg-[#fffaf0] px-16 py-14 shadow-[0_24px_80px_rgb(45_41_35_/_12%)]">
        <div className="mb-8 flex items-center justify-between gap-6 border-[#eadfce] border-b pb-6">
          <input
            aria-label="Document title"
            className="min-w-0 flex-1 bg-transparent font-serif text-[2.75rem] text-[#2d2923] outline-none placeholder:text-[#a89b8b]"
            onChange={(event) => renameDraft(event.target.value)}
            value={activeDocument.title}
          />
          <p className="whitespace-nowrap font-medium text-[#7a6d5f] text-xs uppercase tracking-[0.08em]">
            {wordCount} words
          </p>
        </div>
        <WritingEditor documentId={activeDocument.id} onWordCountChange={setWordCount} />
      </article>
    </WritingShellPreview>
  )
}

function createDocumentId(): string {
  return `doc_${globalThis.crypto.randomUUID()}`
}
