import { join } from 'node:path'
import type { BookMetadata, DocumentMetadata } from '@writer/core'
import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { createDesktopLocalStore } from './document-metadata-store'

const isDevelopment = !app.isPackaged

function registerDocumentIpc() {
  const store = createDesktopLocalStore(app.getPath('userData'))

  ipcMain.handle('books:list', () => store.listBooks())
  ipcMain.handle('books:saveMetadata', (_event, book: BookMetadata) => {
    try {
      store.saveBook(book)
    } catch (error) {
      console.error('Failed to save book metadata', getErrorMessage(error))
      throw error
    }
  })
  ipcMain.handle('documents:list', () => store.listDocuments())
  ipcMain.handle('documents:saveMetadata', (_event, document: DocumentMetadata) => {
    try {
      store.saveDocument(document)
    } catch (error) {
      console.error('Failed to save document metadata', getErrorMessage(error))
      throw error
    }
  })
  ipcMain.handle('documentUpdates:list', (_event, documentId: string) =>
    store.listDocumentUpdates(documentId),
  )
  ipcMain.handle('documentUpdates:append', (_event, update) => {
    try {
      store.appendDocumentUpdate(update)
    } catch (error) {
      console.error('Failed to append document update', getErrorMessage(error))
      throw error
    }
  })
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error'
}

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Writer',
    backgroundColor: '#f4efe6',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    return
  }

  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

void app.whenReady().then(() => {
  app.setName('Writer')
  registerDocumentIpc()
  createApplicationMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
