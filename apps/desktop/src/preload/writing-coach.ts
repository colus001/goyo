import { ipcRenderer } from 'electron';
import type { WritingCoachApi } from '../shared/writing-coach';

export const writingCoachApi: WritingCoachApi = {
  listModels: (accountId) => ipcRenderer.invoke('writingCoach:listModels', accountId),
  listAccounts: () => ipcRenderer.invoke('writingCoach:listAccounts'),
  connectProvider: (providerID, accountId) =>
    ipcRenderer.invoke('writingCoach:connectProvider', providerID, accountId),
  connectKey: (input) => ipcRenderer.invoke('writingCoach:connectKey', input),
  connectCloud: (input) => ipcRenderer.invoke('writingCoach:connectCloud', input),
  listProviderPresets: () => ipcRenderer.invoke('writingCoach:listProviderPresets'),
  cancelConnect: () => ipcRenderer.invoke('writingCoach:cancelConnect'),
  disconnectProvider: (accountId) =>
    ipcRenderer.invoke('writingCoach:disconnectProvider', accountId),
  openUsage: (providerID) => ipcRenderer.invoke('writingCoach:openUsage', providerID),
  listSessions: (bookId) => ipcRenderer.invoke('writingCoach:listSessions', bookId),
  createSession: (bookId) => ipcRenderer.invoke('writingCoach:createSession', bookId),
  saveContext: (bookId, sessionId, context) =>
    ipcRenderer.invoke('writingCoach:saveContext', bookId, sessionId, context),
  send: (input) => ipcRenderer.invoke('writingCoach:send', input),
};
