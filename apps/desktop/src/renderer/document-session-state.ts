import {
  addDocumentToSession,
  type BookMetadata,
  createBookMetadata,
  createDocumentMetadata,
  createDocumentSessionFromBooksAndDocuments,
  createDocumentUpdateRecord,
  type DocumentMetadata,
  type DocumentSession,
  type DocumentUpdateRecord,
  getActiveBook,
  getActiveDocument,
  renameActiveDocument,
  selectActiveDocument,
} from '@writer/core'
import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

type SaveStatus = 'Loading local documents' | 'Saved locally' | 'Saving locally' | 'Save failed'
type DocumentUpdateMap = Record<string, Uint8Array[]>

export interface LoadingDocumentSession {
  saveStatus: SaveStatus
  session: null
}

export interface LoadedDocumentSession {
  activeBook: BookMetadata
  activeDocument: DocumentMetadata
  createDraft: () => void
  documentUpdates: DocumentUpdateMap
  openDraft: (documentId: string) => void
  recordDocumentUpdate: (update: Uint8Array) => void
  renameDraft: (title: string) => void
  saveStatus: SaveStatus
  session: DocumentSession
}

export function useDocumentSession(): LoadedDocumentSession | LoadingDocumentSession {
  const [clientId] = useState(() => `client_${globalThis.crypto.randomUUID()}`)
  const [documentUpdates, setDocumentUpdates] = useState<DocumentUpdateMap>({})
  const [session, setSession] = useState<DocumentSession | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Loading local documents')
  const activeDocument = session ? getActiveDocument(session) : null
  const activeBook = session ? getActiveBook(session) : null

  useLoadDocumentUpdates(activeDocument?.id ?? null, setDocumentUpdates, setSaveStatus)
  useLoadDocuments(setSession, setSaveStatus)

  if (!session || !activeDocument || !activeBook) {
    return {
      saveStatus,
      session: null,
    }
  }

  return {
    activeBook,
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

export function isLoadedDocumentSession(
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
      const [books, documents] = await Promise.all([
        window.writerDesktop.books.list(),
        window.writerDesktop.documents.list(),
      ])

      if (isCancelled) {
        return
      }

      if (documents.length > 0) {
        setSession(createDocumentSessionFromBooksAndDocuments(books, documents))
        setSaveStatus('Saved locally')
        return
      }

      const book = books[0] ?? createUntitledBook()
      const document = createUntitledDocument(book.id, 0)

      if (books.length === 0) {
        await persistBookMetadata(book, setSaveStatus)
      }
      await persistDocumentMetadata(document, setSaveStatus)

      if (!isCancelled) {
        setSession(createDocumentSessionFromBooksAndDocuments([book], [document]))
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
  let document: DocumentMetadata | null = null

  setSession((session) => {
    if (!session) {
      return session
    }

    document = createUntitledDocument(session.activeBookId, getNextDocumentOrder(session))
    return addDocumentToSession(session, document)
  })

  if (document) {
    void persistDocumentMetadata(document, setSaveStatus)
  }
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

async function persistBookMetadata(
  book: BookMetadata,
  setSaveStatus: (saveStatus: SaveStatus) => void,
): Promise<boolean> {
  setSaveStatus('Saving locally')

  try {
    await window.writerDesktop.books.saveMetadata(book)
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

function createUntitledBook(): BookMetadata {
  return createBookMetadata({
    id: `book_${globalThis.crypto.randomUUID()}`,
    now: new Date().toISOString(),
    title: 'Untitled book',
  })
}

function createUntitledDocument(bookId: string, order: number): DocumentMetadata {
  return createDocumentMetadata({
    bookId,
    id: `doc_${globalThis.crypto.randomUUID()}`,
    kind: 'chapter',
    now: new Date().toISOString(),
    order,
    title: 'Untitled draft',
  })
}

function getNextDocumentOrder(session: DocumentSession): number {
  const orders = session.documents
    .filter((document) => document.bookId === session.activeBookId)
    .map((document) => document.order)

  return Math.max(-1, ...orders) + 1
}
