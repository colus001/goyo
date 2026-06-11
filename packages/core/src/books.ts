import type { BookId } from '@writer/shared'

const DEFAULT_BOOK_TITLE = 'Untitled book'

export interface BookMetadata {
  id: BookId
  title: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface CreateBookMetadataInput {
  id: BookId
  now: string
  title?: string
}

export interface RenameBookInput {
  now: string
  title: string
}

export function createBookMetadata(input: CreateBookMetadataInput): BookMetadata {
  return {
    archivedAt: null,
    createdAt: input.now,
    id: input.id,
    title: normalizeBookTitle(input.title),
    updatedAt: input.now,
  }
}

export function renameBook(book: BookMetadata, input: RenameBookInput): BookMetadata {
  const title = input.title

  if (title.trim().length === 0 || title === book.title) {
    return book
  }

  return {
    ...book,
    title,
    updatedAt: input.now,
  }
}

function normalizeBookTitle(title: string | undefined): string {
  const normalizedTitle = title?.trim() ?? ''

  if (normalizedTitle.length === 0) {
    return DEFAULT_BOOK_TITLE
  }

  return normalizedTitle
}
