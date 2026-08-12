"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectDirectory: () => electron_1.ipcRenderer.invoke('select-directory'),
    createProject: (data) => electron_1.ipcRenderer.invoke('create-project', data),
    readProjectTree: (path) => electron_1.ipcRenderer.invoke('read-project-tree', path),
    readFileContent: (path) => electron_1.ipcRenderer.invoke('read-file-content', path),
    saveFileContent: (data) => electron_1.ipcRenderer.invoke('save-file-content', data),
    createFile: (data) => electron_1.ipcRenderer.invoke('create-file', data),
    deleteFile: (path) => electron_1.ipcRenderer.invoke('delete-file', path),
});
