import type { BookId, DocumentId } from '@writer/shared';

const DEFAULT_DOCUMENT_TITLE = 'Untitled document';

export interface DocumentMetadata {
  bookId: BookId;
  kind: DocumentKind;
  id: DocumentId;
  order: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type DocumentKind = 'chapter' | 'note' | 'draft';

export interface CreateDocumentMetadataInput {
  bookId: BookId;
  id: DocumentId;
  kind?: DocumentKind;
  now: string;
  order?: number;
  title?: string;
}

export interface RenameDocumentInput {
  now: string;
  title: string;
}

export function createDocumentMetadata(input: CreateDocumentMetadataInput): DocumentMetadata {
  return {
    archivedAt: null,
    bookId: input.bookId,
    createdAt: input.now,
    id: input.id,
    kind: input.kind ?? 'chapter',
    order: input.order ?? 0,
    title: normalizeDocumentTitle(input.title),
    updatedAt: input.now,
  };
}

export function renameDocument(
  document: DocumentMetadata,
  input: RenameDocumentInput,
): DocumentMetadata {
  const title = input.title;

  if (title.trim().length === 0 || title === document.title) {
    return document;
  }

  return {
    ...document,
    title,
    updatedAt: input.now,
  };
}

function normalizeDocumentTitle(title: string | undefined): string {
  const normalizedTitle = title?.trim() ?? '';

  if (normalizedTitle.length === 0) {
    return DEFAULT_DOCUMENT_TITLE;
  }

  return normalizedTitle;
}
