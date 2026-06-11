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
}: ReturnType<typeof useDocumentSession>) {
  const [wordCount, setWordCount] = useState(0)
  const initialUpdates = documentUpdates[activeDocument.id] ?? EMPTY_DOCUMENT_UPDATES

  return (
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
      <WritingEditor
        documentId={activeDocument.id}
        initialUpdates={initialUpdates}
        onDocumentUpdate={recordDocumentUpdate}
        onWordCountChange={setWordCount}
      />
    </article>
  )
}

function useDocumentSession() {
  const [clientId] = useState(() => `client_${globalThis.crypto.randomUUID()}`)
  const [documentUpdates, setDocumentUpdates] = useState<DocumentUpdateMap>({})
  const [session, setSession] = useState(createInitialSession)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Loading local documents')
  const activeDocument = getActiveDocument(session)

  useLoadDocumentUpdates(activeDocument.id, setDocumentUpdates, setSaveStatus)
  useLoadDocuments(setSession, setSaveStatus)

  return {
    activeDocument,
    createDraft: () => createDraft(setSession, setSaveStatus),
    documentUpdates,
    openDraft: (documentId: string) =>
      setSession((current) => selectActiveDocument(current, documentId)),
    recordDocumentUpdate: (update: Uint8Array) =>
      recordDocumentUpdate(activeDocument.id, clientId, update, setSaveStatus),
    renameDraft: (title: string) =>
      renameDraft(session, activeDocument, title, setSession, setSaveStatus),
    saveStatus,
    session,
  }
}

function useLoadDocumentUpdates(
  documentId: string,
  setDocumentUpdates: Dispatch<SetStateAction<DocumentUpdateMap>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  useEffect(() => {
    let isCancelled = false

    async function loadDocumentUpdates() {
      const updates = await window.writerDesktop.documentUpdates.list(documentId)

      if (!isCancelled) {
        setDocumentUpdates((current) => ({
          ...current,
          [documentId]: updates.map(({ update }) => update),
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
  setSession: Dispatch<SetStateAction<DocumentSession>>,
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
  setSession: (updater: (session: DocumentSession) => DocumentSession) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const document = createUntitledDocument()

  setSession((session) => addDocumentToSession(session, document))
  void persistDocumentMetadata(document, setSaveStatus)
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
) {
  setSaveStatus('Saving locally')

  try {
    await window.writerDesktop.documents.saveMetadata(document)
    setSaveStatus('Saved locally')
  } catch {
    setSaveStatus('Save failed')
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

function createInitialSession(): DocumentSession {
  return createDocumentSessionFromDocuments([createUntitledDocument()])
}

function createUntitledDocument(): DocumentMetadata {
  return createDocumentMetadata({
    id: `doc_${globalThis.crypto.randomUUID()}`,
    now: new Date().toISOString(),
    title: 'Untitled draft',
  })
}
