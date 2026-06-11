import type { DocumentId } from '@writer/shared'

const DEFAULT_DOCUMENT_TITLE = 'Untitled document'

export interface DocumentMetadata {
  id: DocumentId
  title: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface CreateDocumentMetadataInput {
  id: DocumentId
  now: string
  title?: string
}

export interface RenameDocumentInput {
  now: string
  title: string
}

export function createDocumentMetadata(input: CreateDocumentMetadataInput): DocumentMetadata {
  return {
    archivedAt: null,
    createdAt: input.now,
    id: input.id,
    title: normalizeDocumentTitle(input.title),
    updatedAt: input.now,
  }
}

export function renameDocument(
  document: DocumentMetadata,
  input: RenameDocumentInput,
): DocumentMetadata {
  const title = input.title.trim()

  if (title.length === 0 || title === document.title) {
    return document
  }

  return {
    ...document,
    title,
    updatedAt: input.now,
  }
}

function normalizeDocumentTitle(title: string | undefined): string {
  const normalizedTitle = title?.trim() ?? ''

  if (normalizedTitle.length === 0) {
    return DEFAULT_DOCUMENT_TITLE
  }

  return normalizedTitle
}
