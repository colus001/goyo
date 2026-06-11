import { describe, expect, it } from 'vitest'
import { createDocumentUpdateRecord, sortDocumentUpdatesForReplay } from './document-updates'

describe('document update records', () => {
  it('creates an immutable document update record with sync metadata', () => {
    const update = new Uint8Array([1, 2, 3])

    expect(
      createDocumentUpdateRecord({
        clientId: 'client_1',
        createdAt: '2026-06-11T10:00:00.000Z',
        documentId: 'doc_1',
        id: 'update_1',
        update,
      }),
    ).toEqual({
      clientId: 'client_1',
      createdAt: '2026-06-11T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'update_1',
      update,
    })
  })

  it('sorts document updates by creation time and id for deterministic replay', () => {
    const first = createDocumentUpdateRecord({
      clientId: 'client_1',
      createdAt: '2026-06-11T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'update_b',
      update: new Uint8Array([1]),
    })
    const second = createDocumentUpdateRecord({
      clientId: 'client_1',
      createdAt: '2026-06-11T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'update_c',
      update: new Uint8Array([2]),
    })
    const third = createDocumentUpdateRecord({
      clientId: 'client_1',
      createdAt: '2026-06-11T10:01:00.000Z',
      documentId: 'doc_1',
      id: 'update_a',
      update: new Uint8Array([3]),
    })

    expect(sortDocumentUpdatesForReplay([third, second, first])).toEqual([first, second, third])
  })
})
