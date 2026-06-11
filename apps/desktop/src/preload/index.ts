import { contextBridge } from 'electron'

const desktopApi = {
  platform: process.platform,
} as const

contextBridge.exposeInMainWorld('writerDesktop', desktopApi)

export type WriterDesktopApi = typeof desktopApi
