import { describe, expect, it } from 'vitest'
import {
  addDocumentToSession,
  createDocumentSession,
  createDocumentSessionFromDocuments,
  createDraftInSession,
  renameActiveDocument,
  selectActiveDocument,
} from './document-session'

describe('document session creation', () => {
  it('starts with one active document', () => {
    const session = createDocumentSession({
      id: 'doc_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'Opening page',
    })

    expect(session.activeDocumentId).toBe('doc_1')
    expect(session.documents).toEqual([
      {
        archivedAt: null,
        createdAt: '2026-06-11T10:00:00.000Z',
        id: 'doc_1',
        title: 'Opening page',
        updatedAt: '2026-06-11T10:00:00.000Z',
      },
    ])
  })

  it('starts from existing documents with the first document active', () => {
    const firstDocument = createDocumentSession({
      id: 'doc_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'First',
    }).documents[0]
    const secondDocument = createDocumentSession({
      id: 'doc_2',
      now: '2026-06-11T10:01:00.000Z',
      title: 'Second',
    }).documents[0]

    expect(createDocumentSessionFromDocuments([firstDocument, secondDocument])).toEqual({
      activeDocumentId: 'doc_1',
      documents: [firstDocument, secondDocument],
    })
  })

  it('rejects starting from an empty document list', () => {
    expect(() => createDocumentSessionFromDocuments([])).toThrow(
      'Document session needs at least one document',
    )
  })
})

describe('document session mutation', () => {
  it('renames only the active document', () => {
    const session = createDraftInSession(
      createDocumentSession({
        id: 'doc_1',
        now: '2026-06-11T10:00:00.000Z',
        title: 'First',
      }),
      {
        id: 'doc_2',
        now: '2026-06-11T10:01:00.000Z',
        title: 'Second',
      },
    )

    const renamed = renameActiveDocument(session, {
      now: '2026-06-11T10:02:00.000Z',
      title: ' Revised second ',
    })

    expect(renamed.documents.map((document) => document.title)).toEqual(['First', 'Revised second'])
    expect(renamed.activeDocumentId).toBe('doc_2')
  })

  it('keeps existing documents when a new draft becomes active', () => {
    const session = createDraftInSession(
      createDocumentSession({
        id: 'doc_1',
        now: '2026-06-11T10:00:00.000Z',
        title: 'First',
      }),
      {
        id: 'doc_2',
        now: '2026-06-11T10:01:00.000Z',
      },
    )

    expect(session.activeDocumentId).toBe('doc_2')
    expect(session.documents.map((document) => document.id)).toEqual(['doc_1', 'doc_2'])
    expect(session.documents.at(-1)?.title).toBe('Untitled document')
  })

  it('adds an existing document to a session and makes it active', () => {
    const session = createDocumentSession({
      id: 'doc_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'First',
    })
    const document = createDocumentSession({
      id: 'doc_2',
      now: '2026-06-11T10:01:00.000Z',
      title: 'Second',
    }).documents[0]

    const updatedSession = addDocumentToSession(session, document)

    expect(updatedSession.activeDocumentId).toBe('doc_2')
    expect(updatedSession.documents.map((document) => document.id)).toEqual(['doc_1', 'doc_2'])
  })
})

describe('document session selection', () => {
  it('selects an existing document without changing document order', () => {
    const session = createDraftInSession(
      createDocumentSession({
        id: 'doc_1',
        now: '2026-06-11T10:00:00.000Z',
        title: 'First',
      }),
      {
        id: 'doc_2',
        now: '2026-06-11T10:01:00.000Z',
        title: 'Second',
      },
    )

    const selected = selectActiveDocument(session, 'doc_1')

    expect(selected.activeDocumentId).toBe('doc_1')
    expect(selected.documents.map((document) => document.id)).toEqual(['doc_1', 'doc_2'])
  })

  it('ignores selecting a document that is not in the session', () => {
    const session = createDocumentSession({
      id: 'doc_1',
      now: '2026-06-11T10:00:00.000Z',
      title: 'First',
    })

    expect(selectActiveDocument(session, 'missing')).toBe(session)
  })
})
