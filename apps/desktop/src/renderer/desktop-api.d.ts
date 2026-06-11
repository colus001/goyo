import type { DocumentMetadata, DocumentUpdateRecord } from '@writer/core'

declare global {
  interface Window {
    writerDesktop: {
      documents: {
        list: () => Promise<DocumentMetadata[]>
        saveMetadata: (document: DocumentMetadata) => Promise<void>
      }
      documentUpdates: {
        append: (update: DocumentUpdateRecord) => Promise<void>
        list: (documentId: string) => Promise<DocumentUpdateRecord[]>
      }
      platform: string
    }
  }
}
