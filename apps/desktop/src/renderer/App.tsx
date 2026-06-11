import { WritingEditor } from '@writer/editor'
import { WritingShell } from '@writer/ui'
import { useState } from 'react'
import {
  isLoadedDocumentSession,
  type LoadedDocumentSession,
  useDocumentSession,
} from './document-session-state'

const EMPTY_DOCUMENT_UPDATES: Uint8Array[] = []

export function App() {
  const documentSession = useDocumentSession()

  if (!isLoadedDocumentSession(documentSession)) {
    return <WritingShell status={documentSession.saveStatus} />
  }

  return (
    <WritingShell
      activeDocumentId={documentSession.session.activeDocumentId}
      bookTitle={documentSession.activeBook.title}
      documents={documentSession.session.documents.filter(
        (document) => document.bookId === documentSession.session.activeBookId,
      )}
      onCreateDocument={documentSession.createDraft}
      onSelectDocument={documentSession.openDraft}
      status={documentSession.saveStatus}
    >
      <DocumentSurface {...documentSession} />
    </WritingShell>
  )
}

function DocumentSurface({
  activeDocument,
  documentUpdates,
  recordDocumentUpdate,
  renameDraft,
}: LoadedDocumentSession) {
  const [wordCount, setWordCount] = useState(0)
  const initialUpdates = documentUpdates[activeDocument.id] ?? EMPTY_DOCUMENT_UPDATES

  return (
    <article className="mx-auto min-h-screen w-full max-w-[60rem] bg-white px-18 pt-12 pb-24">
      <header className="mb-9 border-[#ecece8] border-b pb-6">
        <div className="mb-4 flex items-center justify-between gap-6 text-[#9a9a93] text-sm">
          <p>{formatDocumentDate(activeDocument.updatedAt)}</p>
          <p className="whitespace-nowrap font-medium text-xs uppercase tracking-[0.13em]">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </p>
        </div>
        <input
          aria-label="Document title"
          className="w-full bg-transparent font-semibold text-[#242421] text-[2rem] leading-tight tracking-[-0.04em] outline-none placeholder:text-[#b5b5ae]"
          onChange={(event) => renameDraft(event.target.value)}
          placeholder="Untitled draft"
          value={activeDocument.title}
        />
      </header>

      <WritingEditor
        documentId={activeDocument.id}
        initialUpdates={initialUpdates}
        onDocumentUpdate={recordDocumentUpdate}
        onWordCountChange={setWordCount}
      />
    </article>
  )
}

function formatDocumentDate(updatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(updatedAt))
}
