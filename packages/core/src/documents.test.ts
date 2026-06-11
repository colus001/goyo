import { describe, expect, it } from 'vitest'
import { createDocumentMetadata, renameDocument } from './documents'

describe('document metadata creation', () => {
  it('creates a draft document with normalized title and stable timestamps', () => {
    const document = createDocumentMetadata({
      id: 'doc_1',
      now: '2026-06-11T10:00:00.000Z',
      title: '  First chapter  ',
    })

    expect(document).toEqual({
      archivedAt: null,
      createdAt: '2026-06-11T10:00:00.000Z',
      id: 'doc_1',
      title: 'First chapter',
      updatedAt: '2026-06-11T10:00:00.000Z',
    })
  })

  it('uses a safe title when a new draft title is blank', () => {
    const document = createDocumentMetadata({
      id: 'doc_2',
      now: '2026-06-11T10:00:00.000Z',
      title: '   ',
    })

    expect(document.title).toBe('Untitled document')
  })
})

describe('document metadata renaming', () => {
  it('renames a document without accepting blank titles', () => {
    const document = createDocumentMetadata({
      id: 'doc_3',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Draft',
    })

    expect(
      renameDocument(document, {
        now: '2026-06-11T10:05:00.000Z',
        title: '   ',
      }),
    ).toEqual(document)
  })

  it('updates the title and updated timestamp when renamed', () => {
    const document = createDocumentMetadata({
      id: 'doc_4',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Draft',
    })

    expect(
      renameDocument(document, {
        now: '2026-06-11T10:05:00.000Z',
        title: 'Revised draft',
      }),
    ).toEqual({
      ...document,
      title: 'Revised draft',
      updatedAt: '2026-06-11T10:05:00.000Z',
    })
  })

  it('preserves spacing while editing a document title', () => {
    const document = createDocumentMetadata({
      id: 'doc_5',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Draft',
    })

    expect(
      renameDocument(document, {
        now: '2026-06-11T10:05:00.000Z',
        title: 'Draft with trailing space ',
      }),
    ).toEqual({
      ...document,
      title: 'Draft with trailing space ',
      updatedAt: '2026-06-11T10:05:00.000Z',
    })
  })
})
