import type { DocumentId } from '@writer/shared'
import {
  type CreateDocumentMetadataInput,
  createDocumentMetadata,
  type DocumentMetadata,
  type RenameDocumentInput,
  renameDocument,
} from './documents'

export interface DocumentSession {
  activeDocumentId: DocumentId
  documents: DocumentMetadata[]
}

export function createDocumentSession(input: CreateDocumentMetadataInput): DocumentSession {
  const document = createDocumentMetadata(input)

  return {
    activeDocumentId: document.id,
    documents: [document],
  }
}

export function createDocumentSessionFromDocuments(documents: DocumentMetadata[]): DocumentSession {
  const activeDocument = documents[0]

  if (!activeDocument) {
    throw new Error('Document session needs at least one document')
  }

  return {
    activeDocumentId: activeDocument.id,
    documents,
  }
}

export function createDraftInSession(
  session: DocumentSession,
  input: CreateDocumentMetadataInput,
): DocumentSession {
  const document = createDocumentMetadata(input)

  return addDocumentToSession(session, document)
}

export function addDocumentToSession(
  session: DocumentSession,
  document: DocumentMetadata,
): DocumentSession {
  const existingDocument = session.documents.find(({ id }) => id === document.id)

  if (existingDocument) {
    return selectActiveDocument(session, document.id)
  }

  return {
    activeDocumentId: document.id,
    documents: [...session.documents, document],
  }
}

export function renameActiveDocument(
  session: DocumentSession,
  input: RenameDocumentInput,
): DocumentSession {
  return {
    ...session,
    documents: session.documents.map((document) => {
      if (document.id !== session.activeDocumentId) {
        return document
      }

      return renameDocument(document, input)
    }),
  }
}

export function selectActiveDocument(
  session: DocumentSession,
  documentId: DocumentId,
): DocumentSession {
  if (session.activeDocumentId === documentId) {
    return session
  }

  const documentExists = session.documents.some((document) => document.id === documentId)

  if (!documentExists) {
    return session
  }

  return {
    ...session,
    activeDocumentId: documentId,
  }
}

export function getActiveDocument(session: DocumentSession): DocumentMetadata {
  const document = session.documents.find((document) => document.id === session.activeDocumentId)

  if (!document) {
    throw new Error(`Active document not found: ${session.activeDocumentId}`)
  }

  return document
}
