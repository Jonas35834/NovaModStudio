NovaMod Studio - IPC Übersicht

Neue IPC-Kanäle implementiert für Item/Block-Generator und Gradle-Build.

Channels (Renderer -> Main, via preload bridge window.electronAPI):

- createItem(payload)
  - payload: {
    projectPath: string, // Projekt-Root (worktree)
    modId: string,
    itemName: string,
    maxStack?: number,
    tooltip?: string,
    tab?: string,
    texturePath?: string // absolute path to texture file (optional)
  }
  - Rückgabe: { success: boolean, files?: string[], conflict?: boolean, path?: string, error?: string }

- createBlock(payload)
  - payload: {
    projectPath: string,
    modId: string,
    blockName: string,
    hardness?: number,
    resistance?: number,
    sound?: string,
    tool?: string,
    harvestLevel?: number,
    texturePath?: string
  }
  - Rückgabe ähnlich wie createItem

- startBuild(projectRoot)
  - projectRoot: string
  - Rückgabe (initial): { success: true, message: 'Build started' } oder Fehler

Events (Main -> Renderer):

- onBuildOutput(cb)
  - cb(line: string) wird bei neuem stdout/stderr Zeilen aufgerufen
  - Nutzen: Streaming-Logs im UI anzeigen

- onBuildFinished(cb)
  - cb({ success, code, jarPath }) wird am Ende gesendet. jarPath kann null sein, wenn kein JAR gefunden wurde.

- modstudio:conflict
  - Wird vom Main-Prozess gesendet, wenn eine Ziel-Datei bereits existiert. UI kann darauf reagieren und Nutzerentscheidung anstoßen.

Hinweis: Alle Renderer-Aufrufe müssen über die Preload-Bridge (window.electronAPI) laufen. Keine direkten Node-Zugriffe im React-Code.

Auto-Registrierung: Bei Erzeugung von Items/Blocks erstellt NovaMod Studio Registry-Klassen (net.novamod.<modid>.registry.CustomItems / CustomBlocks) mit statischen Feldern und einer registerAll()-Methode. Die Main-Modklasse (die Klasse welche ModInitializer implementiert) wird automatisch auf vorhandensein überprüft und - falls gefunden - um einen Aufruf von CustomItems.registerAll() / CustomBlocks.registerAll() in onInitialize() ergänzt. Wenn keine Initializer-Klasse gefunden wird, wird eine Warnung ausgesendet und die Registry-Klassen bleiben als Platzhalter vorhanden.
