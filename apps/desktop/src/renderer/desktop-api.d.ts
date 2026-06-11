import type { DocumentMetadata } from '@writer/core'

declare global {
  interface Window {
    writerDesktop: {
      documents: {
        list: () => Promise<DocumentMetadata[]>
        saveMetadata: (document: DocumentMetadata) => Promise<void>
      }
      platform: string
    }
  }
}
