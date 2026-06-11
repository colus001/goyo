import {
  addDocumentToSession,
  createDocumentMetadata,
  createDocumentSessionFromDocuments,
  createDocumentUpdateRecord,
  type DocumentMetadata,
  type DocumentSession,
  type DocumentUpdateRecord,
  getActiveDocument,
  renameActiveDocument,
  selectActiveDocument,
} from '@writer/core'
import { WritingEditor } from '@writer/editor'
import { WritingShellPreview } from '@writer/ui'
import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

type SaveStatus = 'Loading local documents' | 'Saved locally' | 'Saving locally' | 'Save failed'
type DocumentUpdateMap = Record<string, Uint8Array[]>

const EMPTY_DOCUMENT_UPDATES: Uint8Array[] = []

export function App() {
  const documentSession = useDocumentSession()

  if (!isLoadedDocumentSession(documentSession)) {
    return <WritingShellPreview status={documentSession.saveStatus} />
  }

  return (
    <WritingShellPreview
      activeDocumentId={documentSession.session.activeDocumentId}
      documents={documentSession.session.documents}
      onCreateDocument={documentSession.createDraft}
      onSelectDocument={documentSession.openDraft}
      status={documentSession.saveStatus}
    >
      <DocumentSurface {...documentSession} />
    </WritingShellPreview>
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
    <article className="mx-auto min-h-screen w-full max-w-[68rem] bg-white px-20 pt-14 pb-24">
      <header className="mb-8 border-[#ecece8] border-b pb-6">
        <div className="mb-4 flex items-center justify-between gap-6 text-[#9a9a93] text-sm">
          <p>{formatDocumentDate(activeDocument.updatedAt)}</p>
          <p className="whitespace-nowrap font-medium text-xs uppercase tracking-[0.13em]">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </p>
        </div>
        <input
          aria-label="Document title"
          className="w-full bg-transparent font-semibold text-[#242421] text-[2.25rem] leading-tight tracking-[-0.045em] outline-none placeholder:text-[#b5b5ae]"
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

function useDocumentSession(): LoadedDocumentSession | LoadingDocumentSession {
  const [clientId] = useState(() => `client_${globalThis.crypto.randomUUID()}`)
  const [documentUpdates, setDocumentUpdates] = useState<DocumentUpdateMap>({})
  const [session, setSession] = useState<DocumentSession | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Loading local documents')
  const activeDocument = session ? getActiveDocument(session) : null

  useLoadDocumentUpdates(activeDocument?.id ?? null, setDocumentUpdates, setSaveStatus)
  useLoadDocuments(setSession, setSaveStatus)

  if (!session || !activeDocument) {
    return {
      saveStatus,
      session: null,
    }
  }

  return {
    activeDocument,
    createDraft: () => createDraft(setSession, setSaveStatus),
    documentUpdates,
    openDraft: (documentId: string) =>
      setSession((current) => {
        if (!current) {
          return current
        }

        return selectActiveDocument(current, documentId)
      }),
    recordDocumentUpdate: (update: Uint8Array) =>
      recordDocumentUpdate(activeDocument.id, clientId, update, setSaveStatus),
    renameDraft: (title: string) =>
      renameDraft(session, activeDocument, title, setSession, setSaveStatus),
    saveStatus,
    session,
  }
}

interface LoadingDocumentSession {
  saveStatus: SaveStatus
  session: null
}

interface LoadedDocumentSession {
  activeDocument: DocumentMetadata
  createDraft: () => void
  documentUpdates: DocumentUpdateMap
  openDraft: (documentId: string) => void
  recordDocumentUpdate: (update: Uint8Array) => void
  renameDraft: (title: string) => void
  saveStatus: SaveStatus
  session: DocumentSession
}

function isLoadedDocumentSession(
  session: LoadedDocumentSession | LoadingDocumentSession,
): session is LoadedDocumentSession {
  return session.session !== null
}

function useLoadDocumentUpdates(
  documentId: string | null,
  setDocumentUpdates: Dispatch<SetStateAction<DocumentUpdateMap>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  useEffect(() => {
    if (!documentId) {
      return
    }

    const loadedDocumentId = documentId

    let isCancelled = false

    async function loadDocumentUpdates() {
      const updates = await window.writerDesktop.documentUpdates.list(loadedDocumentId)

      if (!isCancelled) {
        setDocumentUpdates((current) => ({
          ...current,
          [loadedDocumentId]: updates.map(({ update }) => update),
        }))
      }
    }

    void loadDocumentUpdates().catch(() => setSaveStatus('Save failed'))

    return () => {
      isCancelled = true
    }
  }, [documentId, setDocumentUpdates, setSaveStatus])
}

function useLoadDocuments(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  useEffect(() => {
    let isCancelled = false

    async function loadDocuments() {
      const documents = await window.writerDesktop.documents.list()

      if (isCancelled) {
        return
      }

      if (documents.length > 0) {
        setSession(createDocumentSessionFromDocuments(documents))
        setSaveStatus('Saved locally')
        return
      }

      const document = createUntitledDocument()

      await persistDocumentMetadata(document, setSaveStatus)

      if (!isCancelled) {
        setSession(createDocumentSessionFromDocuments([document]))
      }
    }

    void loadDocuments().catch(() => setSaveStatus('Save failed'))

    return () => {
      isCancelled = true
    }
  }, [setSession, setSaveStatus])
}

function recordDocumentUpdate(
  documentId: string,
  clientId: string,
  update: Uint8Array,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const documentUpdate = createDocumentUpdateRecord({
    clientId,
    createdAt: new Date().toISOString(),
    documentId,
    id: `update_${globalThis.crypto.randomUUID()}`,
    update,
  })

  void persistDocumentUpdate(documentUpdate, setSaveStatus)
}

function createDraft(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const document = createUntitledDocument()

  void persistDocumentMetadata(document, setSaveStatus).then((saved) => {
    if (!saved) {
      return
    }

    setSession((session) => {
      if (!session) {
        return createDocumentSessionFromDocuments([document])
      }

      return addDocumentToSession(session, document)
    })
  })
}

function renameDraft(
  session: DocumentSession,
  activeDocument: DocumentMetadata,
  title: string,
  setSession: (session: DocumentSession) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const updatedSession = renameActiveDocument(session, { now: new Date().toISOString(), title })
  const updatedDocument = getActiveDocument(updatedSession)

  setSession(updatedSession)

  if (updatedDocument !== activeDocument) {
    void persistDocumentMetadata(updatedDocument, setSaveStatus)
  }
}

async function persistDocumentMetadata(
  document: DocumentMetadata,
  setSaveStatus: (saveStatus: SaveStatus) => void,
): Promise<boolean> {
  setSaveStatus('Saving locally')

  try {
    await window.writerDesktop.documents.saveMetadata(document)
    setSaveStatus('Saved locally')
    return true
  } catch {
    setSaveStatus('Save failed')
    return false
  }
}

async function persistDocumentUpdate(
  update: DocumentUpdateRecord,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  setSaveStatus('Saving locally')

  try {
    await window.writerDesktop.documentUpdates.append(update)
    setSaveStatus('Saved locally')
  } catch {
    setSaveStatus('Save failed')
  }
}

function createUntitledDocument(): DocumentMetadata {
  return createDocumentMetadata({
    id: `doc_${globalThis.crypto.randomUUID()}`,
    now: new Date().toISOString(),
    title: 'Untitled draft',
  })
}

function formatDocumentDate(updatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(updatedAt))
}
