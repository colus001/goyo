import type { DocumentMetadata, DocumentUpdateRecord } from '@writer/core'
import { contextBridge, ipcRenderer } from 'electron'

const desktopApi = {
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
} as const

contextBridge.exposeInMainWorld('writerDesktop', desktopApi)

export type WriterDesktopApi = typeof desktopApi

declare global {
  interface Window {
    writerDesktop: WriterDesktopApi
  }
}
