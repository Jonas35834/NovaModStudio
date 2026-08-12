"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const fs = require("fs");
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        title: 'NovaMod Studio',
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    win.removeMenu();
    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    }
    else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}
// Ordner-Auswahldialog
electron_1.ipcMain.handle('select-directory', async () => {
    const result = await electron_1.dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled)
        return null;
    return result.filePaths[0];
});
// Fabric-Projektdateien auf Festplatte generieren
electron_1.ipcMain.handle('create-project', async (_event, projectData) => {
    const { name, modId, version, author, mcVersion, projectPath } = projectData;
    const targetDir = path.join(projectPath, name);
    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const packagePath = modId.replace(/[^a-z0-9]/g, '');
        const javaDir = path.join(targetDir, 'src', 'main', 'java', 'net', 'novamod', packagePath);
        const resourcesDir = path.join(targetDir, 'src', 'main', 'resources');
        const assetsDir = path.join(resourcesDir, 'assets', modId);
        fs.mkdirSync(javaDir, { recursive: true });
        fs.mkdirSync(path.join(assetsDir, 'textures', 'item'), { recursive: true });
        fs.mkdirSync(path.join(assetsDir, 'textures', 'block'), { recursive: true });
        fs.mkdirSync(path.join(assetsDir, 'models', 'item'), { recursive: true });
        const fabricModJson = {
            schemaVersion: 1,
            id: modId,
            version: version,
            name: name,
            description: "Erstellt mit NovaMod Studio",
            authors: [author || "Anfänger"],
            contact: {},
            license: "CC0-1.0",
            environment: "*",
            entrypoints: {
                main: [`net.novamod.${packagePath}.${name.replace(/\s+/g, '')}Mod`]
            },
            depends: {
                fabricloader: ">=0.15.0",
                minecraft: `~${mcVersion}`,
                java: ">=21"
            }
        };
        fs.writeFileSync(path.join(resourcesDir, 'fabric.mod.json'), JSON.stringify(fabricModJson, null, 2));
        const className = `${name.replace(/[^a-zA-Z0-9]/g, '')}Mod`;
        const javaContent = `package net.novamod.${packagePath};

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ${className} implements ModInitializer {
    public static final String MOD_ID = "${modId}";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        LOGGER.info("NovaMod Studio: Mod ${name} wurde geladen!");
    }
}
`;
        fs.writeFileSync(path.join(javaDir, `${className}.java`), javaContent);
        const novaMetadata = {
            name,
            modId,
            version,
            author,
            mcVersion,
            loader: 'Fabric',
            createdAt: new Date().toISOString()
        };
        fs.writeFileSync(path.join(targetDir, 'novamod.project.json'), JSON.stringify(novaMetadata, null, 2));
        return { success: true, path: targetDir };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Hilfsfunktion: Rekursiv Dateibaum lesen
function readDirectoryTree(dirPath) {
    if (!fs.existsSync(dirPath))
        return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
        .filter(entry => entry.name !== '.git' && entry.name !== '.gradle' && entry.name !== 'build')
        .map(entry => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            return {
                name: entry.name,
                path: fullPath,
                isDirectory: true,
                children: readDirectoryTree(fullPath),
            };
        }
        else {
            return {
                name: entry.name,
                path: fullPath,
                isDirectory: false,
            };
        }
    });
}
// IPC Handlers
electron_1.ipcMain.handle('read-project-tree', async (_event, projectPath) => {
    try {
        return { success: true, tree: readDirectoryTree(projectPath) };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('read-file-content', async (_event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('save-file-content', async (_event, { filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('create-file', async (_event, { filePath, content = '' }) => {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('delete-file', async (_event, filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            if (fs.lstatSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            }
            else {
                fs.unlinkSync(filePath);
            }
        }
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
