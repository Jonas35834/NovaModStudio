import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  createProject: (data: any) => ipcRenderer.invoke('create-project', data),
  readProjectTree: (path: string) => ipcRenderer.invoke('read-project-tree', path),
  readFileContent: (path: string) => ipcRenderer.invoke('read-file-content', path),
  saveFileContent: (data: any) => ipcRenderer.invoke('save-file-content', data),
  createFile: (data: any) => ipcRenderer.invoke('create-file', data),
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),

  // Mod Studio APIs
  createItem: (payload: any) => ipcRenderer.invoke('modstudio:create-item', payload),
  createBlock: (payload: any) => ipcRenderer.invoke('modstudio:create-block', payload),
  startBuild: (projectRoot: string) => ipcRenderer.invoke('modstudio:start-build', projectRoot),
  selectFile: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('select-file', filters),

  // Streaming build output
  onBuildOutput: (cb: (line: string) => void) => {
    const listener = (_: any, line: string) => cb(line);
    ipcRenderer.on('modstudio:build-output', listener);
    return () => ipcRenderer.removeListener('modstudio:build-output', listener);
  },
  onBuildFinished: (cb: (result: any) => void) => {
    const listener = (_: any, result: any) => cb(result);
    ipcRenderer.on('modstudio:build-finished', listener);
    return () => ipcRenderer.removeListener('modstudio:build-finished', listener);
  },
});