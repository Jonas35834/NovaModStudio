import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
const fsp = fs.promises;

function createWindow() {
  const win = new BrowserWindow({
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
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Ordner-Auswahldialog
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Datei-Auswahldialog (z.B. Textur auswählen)
ipcMain.handle('select-file', async (_event, filters = []) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters,
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Fabric-Projektdateien auf Festplatte generieren
ipcMain.handle('create-project', async (_event, projectData) => {
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

    fs.writeFileSync(
      path.join(resourcesDir, 'fabric.mod.json'),
      JSON.stringify(fabricModJson, null, 2)
    );

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
    fs.writeFileSync(
      path.join(targetDir, 'novamod.project.json'),
      JSON.stringify(novaMetadata, null, 2)
    );

    // Minimal Gradle scaffold (build files only) - wrapper not generated automatically
    const buildGradle = `// Minimal build.gradle placeholder\nplugins {\n    id 'java'\n}\n\ngroup = 'net.novamod'\nversion = '${version}'\n\nrepositories {\n    mavenCentral()\n}\n\n// NOTE: To build a Fabric mod, add Fabric Loom plugin and dependencies here.\n// You can generate Gradle wrapper with a local Gradle installation: ${'gradle wrapper'}\n`;
    const settingsGradle = `rootProject.name = '${name}'\n`;
    const gradleProps = `org.gradle.jvmargs=-Xmx2g\njavaVersion=21\nminecraftVersion=${mcVersion}\n`;

    fs.writeFileSync(path.join(targetDir, 'build.gradle'), buildGradle);
    fs.writeFileSync(path.join(targetDir, 'settings.gradle'), settingsGradle);
    fs.writeFileSync(path.join(targetDir, 'gradle.properties'), gradleProps);

    return { success: true, path: targetDir };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Hilfsfunktion: Rekursiv Dateibaum lesen
function readDirectoryTree(dirPath: string): any[] {
  if (!fs.existsSync(dirPath)) return [];
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
      } else {
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: false,
        };
      }
    });
}

// IPC Handlers
ipcMain.handle('read-project-tree', async (_event, projectPath: string) => {
  try {
    return { success: true, tree: readDirectoryTree(projectPath) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file-content', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file-content', async (_event, { filePath, content }: { filePath: string; content: string }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-file', async (_event, { filePath, content = '' }: { filePath: string; content?: string }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Helper: broadcast event to all renderer windows
function broadcast(channel: string, ...args: any[]) {
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send(channel, ...args);
  }
}

// Create Item handler
ipcMain.handle('modstudio:create-item', async (_event, payload: any) => {
  try {
    const { projectPath, modId, itemName, maxStack = 64, tooltip = '', tab = 'misc', texturePath } = payload;
    if (!projectPath || !modId || !itemName) return { success: false, error: 'Missing required fields' };

    const packagePath = modId.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const resourcesDir = path.join(projectPath, 'src', 'main', 'resources');
    const assetsDir = path.join(resourcesDir, 'assets', modId);
    const javaDir = path.join(projectPath, 'src', 'main', 'java', 'net', 'novamod', packagePath);

    // Ensure directories
    await fsp.mkdir(path.join(assetsDir, 'textures', 'item'), { recursive: true });
    await fsp.mkdir(path.join(assetsDir, 'models', 'item'), { recursive: true });
    await fsp.mkdir(javaDir, { recursive: true });

    // Copy texture if provided
    let textureName = itemName.toLowerCase();
    if (texturePath && fs.existsSync(texturePath)) {
      const ext = path.extname(texturePath);
      textureName = `${itemName.toLowerCase()}${ext}`;
      const dest = path.join(assetsDir, 'textures', 'item', path.basename(textureName));
      await fsp.copyFile(texturePath, dest);
      textureName = path.basename(texturePath, ext);
    }

    // Write item model JSON
    const itemModel = {
      parent: 'item/generated',
      textures: {
        layer0: `${modId}:item/${textureName}`
      }
    };
    const modelPath = path.join(assetsDir, 'models', 'item', `${itemName.toLowerCase()}.json`);
    if (fs.existsSync(modelPath)) {
      // conflict
      broadcast('modstudio:conflict', { path: modelPath, type: 'item-model' });
      return { success: false, conflict: true, path: modelPath };
    }
    await fsp.writeFile(modelPath, JSON.stringify(itemModel, null, 2), 'utf-8');

    // Create or update registry Java class (CustomItems) with field and registerAll
    const registryDir = path.join(javaDir, 'registry');
    await fsp.mkdir(registryDir, { recursive: true });
    const className = 'CustomItems';
    const javaFile = path.join(registryDir, `${className}.java`);

    const fieldName = `${itemName.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_ITEM`;
    const idName = itemName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    let javaContent = '';
    if (fs.existsSync(javaFile)) {
      javaContent = await fsp.readFile(javaFile, 'utf-8');

      // ensure registerAll method exists
      if (!/public\s+static\s+void\s+registerAll\s*\(/.test(javaContent)) {
        // add a basic registerAll method at end of class
        javaContent = javaContent.replace(/}\s*$/,'\n    public static void registerAll() {\n        // registrations will be appended here by NovaMod Studio\n    }\n}\n');
      }

      // add field if missing
      if (!new RegExp(`public static final .* ${fieldName}`).test(javaContent)) {
        const fieldDecl = `    public static final net.minecraft.world.item.Item ${fieldName} = new net.minecraft.world.item.Item(new net.minecraft.world.item.Item.Properties().stacksTo(${maxStack}));\n`;
        // place the field before registerAll
        javaContent = javaContent.replace(/public\s+static\s+void\s+registerAll\s*\(\s*\)\s*\{/, fieldDecl + '\n    public static void registerAll() {');
      }

      // ensure registration call inside registerAll
      const regCall = `Registry.register(Registries.ITEM, new Identifier(\"${modId}\", \"${idName}\"), ${fieldName});`;
      if (!javaContent.includes(regCall)) {
        javaContent = javaContent.replace(/public\s+static\s+void\s+registerAll\s*\(\s*\)\s*\{/, match => match + `\n        ${regCall}`);
      }

      // ensure imports
      if (!javaContent.includes('import net.minecraft.registry.Registry;')) {
        javaContent = javaContent.replace(/package\s+([\w\.]+);/, `package $1;\n\nimport net.minecraft.registry.Registry;\nimport net.minecraft.registry.Registries;\nimport net.minecraft.util.Identifier;`);
      }

      await fsp.writeFile(javaFile, javaContent, 'utf-8');
    } else {
      // create new registry class
      javaContent = `package net.novamod.${packagePath}.registry;\n\nimport net.minecraft.world.item.Item;\nimport net.minecraft.registry.Registry;\nimport net.minecraft.registry.Registries;\nimport net.minecraft.util.Identifier;\n\npublic class ${className} {\n\n    public static final Item ${fieldName} = new Item(new Item.Properties().stacksTo(${maxStack}));\n\n    public static void registerAll() {\n        Registry.register(Registries.ITEM, new Identifier("${modId}", "${idName}"), ${fieldName});\n    }\n}\n`;
      await fsp.writeFile(javaFile, javaContent, 'utf-8');
    }

    // Try to find mod initializer and ensure it calls CustomItems.registerAll();
    try {
      const candidates: string[] = [];
      async function walk(dir: string) {
        const names = await fsp.readdir(dir);
        for (const n of names) {
          const p = path.join(dir, n);
          const st = await fsp.stat(p);
          if (st.isDirectory()) await walk(p);
          else if (n.endsWith('.java')) candidates.push(p);
        }
      }
      await walk(javaDir);

      let initFile: string | null = null;
      for (const f of candidates) {
        const content = await fsp.readFile(f, 'utf-8');
        if (content.includes('implements ModInitializer') || content.includes('onInitialize(')) {
          initFile = f; break;
        }
      }

      if (initFile) {
        let initContent = await fsp.readFile(initFile, 'utf-8');
        // add import for registry
        const importLine = `import net.novamod.${packagePath}.registry.${className};`;
        if (!initContent.includes(importLine)) {
          initContent = initContent.replace(/package\s+[\w\.]+;\s*/, match => match + '\n' + importLine + '\n');
        }
        // insert call into onInitialize
        if (!initContent.includes(`${className}.registerAll()`)) {
          initContent = initContent.replace(/public\s+void\s+onInitialize\s*\(\s*\)\s*\{/, match => match + `\n        ${className}.registerAll();`);
          await fsp.writeFile(initFile, initContent, 'utf-8');
        }
      } else {
        broadcast('modstudio:build-output', 'Warnung: Keine Mod-Initializer-Klasse gefunden. Bitte registriere CustomItems.registerAll() manuell.');
      }
    } catch (e) {
      // non-fatal
    }

    return { success: true, files: [modelPath, javaFile] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Create Block handler
ipcMain.handle('modstudio:create-block', async (_event, payload: any) => {
  try {
    const { projectPath, modId, blockName, hardness = 1.5, resistance = 6.0, sound = 'stone', tool = 'pickaxe', harvestLevel = 0, texturePath } = payload;
    if (!projectPath || !modId || !blockName) return { success: false, error: 'Missing required fields' };

    const packagePath = modId.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const resourcesDir = path.join(projectPath, 'src', 'main', 'resources');
    const assetsDir = path.join(resourcesDir, 'assets', modId);
    const javaDir = path.join(projectPath, 'src', 'main', 'java', 'net', 'novamod', packagePath);

    await fsp.mkdir(path.join(assetsDir, 'textures', 'block'), { recursive: true });
    await fsp.mkdir(path.join(assetsDir, 'models', 'block'), { recursive: true });
    await fsp.mkdir(path.join(assetsDir, 'models', 'item'), { recursive: true });
    await fsp.mkdir(path.join(resourcesDir, 'blockstates'), { recursive: true });
    await fsp.mkdir(javaDir, { recursive: true });

    let textureName = blockName.toLowerCase();
    if (texturePath && fs.existsSync(texturePath)) {
      const ext = path.extname(texturePath);
      const dest = path.join(assetsDir, 'textures', 'block', `${blockName.toLowerCase()}${ext}`);
      await fsp.copyFile(texturePath, dest);
      textureName = path.basename(texturePath, ext);
    }

    // block model
    const blockModel = {
      parent: 'block/cube_all',
      textures: { all: `${modId}:block/${textureName}` }
    };
    const blockModelPath = path.join(assetsDir, 'models', 'block', `${blockName.toLowerCase()}.json`);
    if (fs.existsSync(blockModelPath)) {
      broadcast('modstudio:conflict', { path: blockModelPath, type: 'block-model' });
      return { success: false, conflict: true, path: blockModelPath };
    }
    await fsp.writeFile(blockModelPath, JSON.stringify(blockModel, null, 2), 'utf-8');

    // item model for block
    const itemModel = { parent: `${modId}:block/${blockName.toLowerCase()}` };
    const itemModelPath = path.join(assetsDir, 'models', 'item', `${blockName.toLowerCase()}.json`);
    await fsp.writeFile(itemModelPath, JSON.stringify(itemModel, null, 2), 'utf-8');

    // blockstate
    const blockstate = {
      variants: { "": { model: `${modId}:block/${blockName.toLowerCase()}` } }
    };
    const blockstatePath = path.join(resourcesDir, 'blockstates', `${blockName.toLowerCase()}.json`);
    await fsp.writeFile(blockstatePath, JSON.stringify(blockstate, null, 2), 'utf-8');

    // Create or update registry class (CustomBlocks)
    const registryDir = path.join(javaDir, 'registry');
    await fsp.mkdir(registryDir, { recursive: true });
    const className = 'CustomBlocks';
    const javaFile = path.join(registryDir, `${className}.java`);

    const fieldName = `${blockName.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_BLOCK`;
    const idName = blockName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const itemField = `${blockName.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_BLOCK_ITEM`;

    let javaContent = '';
    if (fs.existsSync(javaFile)) {
      javaContent = await fsp.readFile(javaFile, 'utf-8');

      if (!/public\s+static\s+void\s+registerAll\s*\(/.test(javaContent)) {
        javaContent = javaContent.replace(/}\s*$/,'\n    public static void registerAll() {\n        // registrations will be appended here by NovaMod Studio\n    }\n}\n');
      }

      if (!new RegExp(`public static final .* ${fieldName}`).test(javaContent)) {
        const fieldDecl = `    public static final net.minecraft.world.level.block.Block ${fieldName} = new net.minecraft.world.level.block.Block(net.minecraft.world.level.block.BlockBehaviour.Properties.of(net.minecraft.world.level.material.Material.STONE).strength(${hardness}f, ${resistance}f));\n    public static final net.minecraft.world.item.BlockItem ${itemField} = new net.minecraft.world.item.BlockItem(${fieldName}, new net.minecraft.world.item.Item.Properties());\n`;
        javaContent = javaContent.replace(/public\s+static\s+void\s+registerAll\s*\(\s*\)\s*\{/, fieldDecl + '\n    public static void registerAll() {');
      }

      const regBlockCall = `Registry.register(Registries.BLOCK, new Identifier(\"${modId}\", \"${idName}\"), ${fieldName});`;
      const regItemCall = `Registry.register(Registries.ITEM, new Identifier(\"${modId}\", \"${idName}\"), ${itemField});`;
      if (!javaContent.includes(regBlockCall)) {
        javaContent = javaContent.replace(/public\s+static\s+void\s+registerAll\s*\(\s*\)\s*\{/, match => match + `\n        ${regBlockCall}`);
      }
      if (!javaContent.includes(regItemCall)) {
        javaContent = javaContent.replace(/public\s+static\s+void\s+registerAll\s*\(\s*\)\s*\{/, match => match + `\n        ${regItemCall}`);
      }

      if (!javaContent.includes('import net.minecraft.registry.Registry;')) {
        javaContent = javaContent.replace(/package\s+([\w\.]+);/, `package $1;\n\nimport net.minecraft.registry.Registry;\nimport net.minecraft.registry.Registries;\nimport net.minecraft.util.Identifier;`);
      }

      await fsp.writeFile(javaFile, javaContent, 'utf-8');
    } else {
      javaContent = `package net.novamod.${packagePath}.registry;\n\nimport net.minecraft.registry.Registry;\nimport net.minecraft.registry.Registries;\nimport net.minecraft.util.Identifier;\n\npublic class ${className} {\n\n    public static final net.minecraft.world.level.block.Block ${fieldName} = new net.minecraft.world.level.block.Block(net.minecraft.world.level.block.BlockBehaviour.Properties.of(net.minecraft.world.level.material.Material.STONE).strength(${hardness}f, ${resistance}f));\n    public static final net.minecraft.world.item.BlockItem ${itemField} = new net.minecraft.world.item.BlockItem(${fieldName}, new net.minecraft.world.item.Item.Properties());\n\n    public static void registerAll() {\n        Registry.register(Registries.BLOCK, new Identifier("${modId}", "${idName}"), ${fieldName});\n        Registry.register(Registries.ITEM, new Identifier("${modId}", "${idName}"), ${itemField});\n    }\n}\n`;
      await fsp.writeFile(javaFile, javaContent, 'utf-8');
    }

    // Try to find mod initializer and ensure it calls CustomBlocks.registerAll();
    try {
      const candidates: string[] = [];
      async function walk(dir: string) {
        const names = await fsp.readdir(dir);
        for (const n of names) {
          const p = path.join(dir, n);
          const st = await fsp.stat(p);
          if (st.isDirectory()) await walk(p);
          else if (n.endsWith('.java')) candidates.push(p);
        }
      }
      await walk(javaDir);

      let initFile: string | null = null;
      for (const f of candidates) {
        const content = await fsp.readFile(f, 'utf-8');
        if (content.includes('implements ModInitializer') || content.includes('onInitialize(')) {
          initFile = f; break;
        }
      }

      if (initFile) {
        let initContent = await fsp.readFile(initFile, 'utf-8');
        const importLine = `import net.novamod.${packagePath}.registry.${className};`;
        if (!initContent.includes(importLine)) {
          initContent = initContent.replace(/package\s+[\w\.]+;\s*/, match => match + '\n' + importLine + '\n');
        }
        if (!initContent.includes(`${className}.registerAll()`)) {
          initContent = initContent.replace(/public\s+void\s+onInitialize\s*\(\s*\)\s*\{/, match => match + `\n        ${className}.registerAll();`);
          await fsp.writeFile(initFile, initContent, 'utf-8');
        }
      } else {
        broadcast('modstudio:build-output', 'Warnung: Keine Mod-Initializer-Klasse gefunden. Bitte registriere CustomBlocks.registerAll() manuell.');
      }
    } catch (e) {
      // non-fatal
    }

    return { success: true, files: [blockModelPath, itemModelPath, blockstatePath, javaFile] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Start Gradle build and stream output
ipcMain.handle('modstudio:start-build', async (_event, projectRoot: string) => {
  try {
    if (!projectRoot) return { success: false, error: 'projectRoot missing' };
    const isWin = process.platform === 'win32';
    const gradleCmd = isWin ? 'gradlew.bat' : './gradlew';
    const cmdPath = path.join(projectRoot, gradleCmd);
    if (!fs.existsSync(cmdPath)) {
      // maybe use system gradle
      broadcast('modstudio:build-output', `Gradle wrapper not found at ${cmdPath}. Attempting 'gradle' from PATH...`);
    }

    const proc = spawn(isWin ? cmdPath : gradleCmd, ['build'], { cwd: projectRoot, shell: false });

    proc.stdout.on('data', (data) => {
      broadcast('modstudio:build-output', data.toString());
    });
    proc.stderr.on('data', (data) => {
      broadcast('modstudio:build-output', data.toString());
    });

    proc.on('close', async (code) => {
      const success = code === 0;
      // find jar
      let jarPath: string | null = null;
      try {
        const libsDir = path.join(projectRoot, 'build', 'libs');
        if (fs.existsSync(libsDir)) {
          const files = await fsp.readdir(libsDir);
          const jars = files.filter(f => f.endsWith('.jar')).map(f => path.join(libsDir, f));
          if (jars.length) jarPath = jars.sort().pop() || null;
        }
      } catch (e) {}
      broadcast('modstudio:build-finished', { success, code, jarPath });
    });

    return { success: true, message: 'Build started' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});