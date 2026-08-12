import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  createProject: (data: any) => ipcRenderer.invoke('create-project', data),
  readProjectTree: (path: string) => ipcRenderer.invoke('read-project-tree', path),
  readFileContent: (path: string) => ipcRenderer.invoke('read-file-content', path),
  saveFileContent: (data: any) => ipcRenderer.invoke('save-file-content', data),
  createFile: (data: any) => ipcRenderer.invoke('create-file', data),
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
});