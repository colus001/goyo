import type { DocumentMetadata } from '@writer/core'
import { contextBridge, ipcRenderer } from 'electron'

const desktopApi = {
  documents: {
    list: () => ipcRenderer.invoke('documents:list') as Promise<DocumentMetadata[]>,
    saveMetadata: (document: DocumentMetadata) =>
      ipcRenderer.invoke('documents:saveMetadata', document) as Promise<void>,
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
