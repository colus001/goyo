import type { BookMetadata, DocumentMetadata, DocumentUpdateRecord } from '@writer/core';

declare global {
  interface Window {
    writerDesktop: {
      books: {
        list: () => Promise<BookMetadata[]>;
        saveMetadata: (book: BookMetadata) => Promise<void>;
      };
      documents: {
        list: () => Promise<DocumentMetadata[]>;
        saveMetadata: (document: DocumentMetadata) => Promise<void>;
      };
      documentUpdates: {
        append: (update: DocumentUpdateRecord) => Promise<void>;
        list: (documentId: string) => Promise<DocumentUpdateRecord[]>;
      };
      platform: string;
    };
  }
}
