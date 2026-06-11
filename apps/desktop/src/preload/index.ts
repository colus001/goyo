import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentUpdateRecord,
} from '@writer/core';
import { contextBridge, ipcRenderer } from 'electron';

const desktopApi = {
  books: {
    list: () => ipcRenderer.invoke('books:list') as Promise<BookMetadata[]>,
    saveMetadata: (book: BookMetadata) =>
      ipcRenderer.invoke('books:saveMetadata', book) as Promise<void>,
  },
  chapters: {
    list: () => ipcRenderer.invoke('chapters:list') as Promise<ChapterMetadata[]>,
    saveMetadata: (chapter: ChapterMetadata) =>
      ipcRenderer.invoke('chapters:saveMetadata', chapter) as Promise<void>,
  },
  documents: {
    list: () => ipcRenderer.invoke('documents:list') as Promise<DocumentMetadata[]>,
    saveMetadata: (document: DocumentMetadata) =>
      ipcRenderer.invoke('documents:saveMetadata', document) as Promise<void>,
  },
  documentUpdates: {
    append: (update: DocumentUpdateRecord) =>
      ipcRenderer.invoke('documentUpdates:append', update) as Promise<void>,
    list: (documentId: string) =>
      ipcRenderer.invoke('documentUpdates:list', documentId) as Promise<DocumentUpdateRecord[]>,
  },
  platform: process.platform,
} as const;

contextBridge.exposeInMainWorld('writerDesktop', desktopApi);

export type WriterDesktopApi = typeof desktopApi;

declare global {
  interface Window {
    writerDesktop: WriterDesktopApi;
  }
}
