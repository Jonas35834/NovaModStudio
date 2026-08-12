import { useState } from 'react';
import { Home, FolderPlus, BookOpen, Server, GraduationCap, Settings, Plus, Folder, Check, AlertCircle, Code, Layers } from 'lucide-react';
import CodeEditor from './CodeEditor';

const api = (window as any).electronAPI;

type Page = 'home' | 'projects' | 'examples' | 'servers' | 'learn' | 'settings';
type ProjectSubTab = 'content' | 'code' | 'resources' | 'settings';

interface Project {
  name: string;
  modId: string;
  version: string;
  author: string;
  mcVersion: string;
  path: string;
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>('home');
  const [projectTab, setProjectTab] = useState<ProjectSubTab>('content');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Formular-Zustände
  const [mcVersion, setMcVersion] = useState('1.20.4');
  const [modName, setModName] = useState('');
  const [modId, setModId] = useState('');
  const [modVersion, setModVersion] = useState('1.0.0');
  const [modAuthor, setModAuthor] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [modIdError, setModIdError] = useState('');

  // Aktives Projekt
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const navItems = [
    { id: 'home', label: 'Start', icon: Home },
    { id: 'projects', label: 'Projekte', icon: FolderPlus },
    { id: 'examples', label: 'Beispiele', icon: BookOpen },
    { id: 'servers', label: 'Server', icon: Server },
    { id: 'learn', label: 'Lernen', icon: GraduationCap },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  const handleModNameChange = (name: string) => {
    setModName(name);
    const autoId = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    validateAndSetModId(autoId);
  };

  const validateAndSetModId = (id: string) => {
    setModId(id);
    const regex = /^[a-z0-9_]+$/;
    if (id && !regex.test(id)) {
      setModIdError('Die Mod-ID darf nur Kleinbuchstaben (a-z), Zahlen (0-9) und Unterstriche (_) enthalten.');
    } else {
      setModIdError('');
    }
  };

  const handleSelectFolder = async () => {
    const selected = await api?.selectDirectory();
    if (selected) {
      setProjectPath(selected);
    }
  };

  const handleCreateProject = async () => {
    if (!modName || !modId || !projectPath || modIdError) return;

    const result = await api?.createProject({
      name: modName,
      modId,
      version: modVersion,
      author: modAuthor,
      mcVersion,
      projectPath,
    });

    if (result.success) {
      const newProject: Project = {
        name: modName,
        modId,
        version: modVersion,
        author: modAuthor,
        mcVersion,
        path: result.path,
      };
      setCurrentProject(newProject);
      setIsModalOpen(false);
      setStep(1);
      setActivePage('projects');
      setProjectTab('content');
    } else {
      alert(`Fehler beim Erstellen des Projekts: ${result.error}`);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Linke Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
            N
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">NovaMod</h1>
            <span className="text-xs text-indigo-400 font-medium">Studio v1.0</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id as Page)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          Java 21 bereitgestellt
        </div>
      </aside>

      {/* Hauptinhalt */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950">
        {activePage === 'home' && (
          <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
            <header className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight">Willkommen bei NovaMod Studio</h2>
              <p className="text-slate-400">Erstelle, teste und teile deine eigenen Minecraft-Mods ohne Programmierhürden.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 transition-all text-left group flex items-start justify-between"
              >
                <div>
                  <div className="p-3 bg-indigo-600/20 rounded-xl w-fit text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">Neues Projekt</h3>
                  <p className="text-sm text-slate-400 mt-1">Erstelle eine neue Fabric-Mod für Minecraft.</p>
                </div>
              </button>

              <button 
                onClick={() => setActivePage('examples')}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-left group flex items-start justify-between"
              >
                <div>
                  <div className="p-3 bg-slate-800 rounded-xl w-fit text-slate-300 mb-4 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">Beispiel öffnen</h3>
                  <p className="text-sm text-slate-400 mt-1">Lerne von vorgefertigten Mod-Beispielen.</p>
                </div>
              </button>
            </div>

            <section className="space-y-4">
              <h3 className="text-xl font-bold">Zuletzt geöffnet</h3>
              {currentProject ? (
                <div 
                  onClick={() => setActivePage('projects')}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-bold text-lg text-indigo-400">{currentProject.name}</h4>
                    <p className="text-sm text-slate-400">Mod-ID: {currentProject.modId} | MC {currentProject.mcVersion} | Loader: Fabric</p>
                    <p className="text-xs text-slate-500 mt-1">{currentProject.path}</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-600/20 text-indigo-300 rounded-lg text-xs font-semibold">
                    Aktiv
                  </span>
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500">
                  Keine kürzlich geöffneten Projekte vorhanden.
                </div>
              )}
            </section>
          </div>
        )}

        {activePage === 'projects' && (
          <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
            {currentProject ? (
              <div>
                <header className="flex justify-between items-start border-b border-slate-800 pb-6 mb-6">
                  <div>
                    <h2 className="text-3xl font-extrabold">{currentProject.name}</h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Minecraft {currentProject.mcVersion} • Modloader: <span className="text-indigo-400 font-semibold">Fabric</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
                      MOD TESTEN
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all">
                      EXPORTIEREN
                    </button>
                  </div>
                </header>

                {/* Sub-Tabs für Projekt */}
                <div className="flex border-b border-slate-800 gap-2 mb-6">
                  <button
                    onClick={() => setProjectTab('content')}
                    className={`px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all flex items-center gap-2 ${
                      projectTab === 'content'
                        ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-4 h-4" /> Inhalte (Grafisch)
                  </button>
                  <button
                    onClick={() => setProjectTab('code')}
                    className={`px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all flex items-center gap-2 ${
                      projectTab === 'code'
                        ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code className="w-4 h-4" /> Code Editor
                  </button>
                </div>

                {/* Tab-Inhalte */}
                {projectTab === 'content' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center py-16 space-y-3">
                    <Layers className="w-10 h-10 mx-auto text-indigo-400" />
                    <h3 className="text-lg font-bold">Grafischer Modding-Assistent</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto">
                      Hier kannst du in der nächsten Phase Items, Blöcke und Rezepte visuell konfigurieren.
                    </p>
                  </div>
                )}

                {projectTab === 'code' && (
                  <CodeEditor projectPath={currentProject.path} />
                )}
              </div>
            ) : (
              <div className="text-center py-16 space-y-4">
                <p className="text-slate-400">Kein Projekt geöffnet.</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Neues Projekt erstellen
                </button>
              </div>
            )}
          </div>
        )}

        {activePage !== 'home' && activePage !== 'projects' && (
          <div className="p-8">
            <h2 className="text-2xl font-bold capitalize">{activePage}</h2>
            <p className="text-slate-400 mt-2">Bereich in Vorbereitung für die nächsten Phasen.</p>
          </div>
        )}
      </main>

      {/* MODAL: Neues Projekt Erstellen */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-xl">Neues Projekt erstellen</h3>
              <span className="text-xs font-semibold px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full">
                Schritt {step} von 3
              </span>
            </header>

            <div className="p-6 space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Minecraft-Version auswählen
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['1.20.4', '1.20.2', '1.20.1', '1.19.4'].map((version) => (
                      <button
                        key={version}
                        onClick={() => setMcVersion(version)}
                        className={`p-4 rounded-xl border font-medium text-left transition-all flex justify-between items-center ${
                          mcVersion === version
                            ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300'
                            : 'border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        Minecraft {version}
                        {mcVersion === version && <Check className="w-4 h-4 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Modloader
                  </label>
                  <div className="p-4 rounded-xl border border-indigo-500 bg-indigo-600/10 text-indigo-300 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">Fabric</h4>
                      <p className="text-xs text-slate-400 mt-1">Schnell, leichtgewichtig und ideal für Anfänger.</p>
                    </div>
                    <Check className="w-5 h-5 text-indigo-400" />
                  </div>
                  <p className="text-xs text-slate-500">Weitere Modloader (Forge, NeoForge) folgen in späteren Versionen.</p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Mod-Name</label>
                    <input
                      type="text"
                      placeholder="z. B. Mein Super Item"
                      value={modName}
                      onChange={(e) => handleModNameChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Mod-ID (Eindeutiger Bezeichner)</label>
                    <input
                      type="text"
                      placeholder="z. B. meinsuperitem"
                      value={modId}
                      onChange={(e) => validateAndSetModId(e.target.value)}
                      className={`w-full bg-slate-950 border rounded-xl p-3 text-white focus:outline-none ${
                        modIdError ? 'border-red-500' : 'border-slate-800 focus:border-indigo-500'
                      }`}
                    />
                    {modIdError && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {modIdError}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Autor</label>
                      <input
                        type="text"
                        placeholder="Dein Name"
                        value={modAuthor}
                        onChange={(e) => setModAuthor(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Version</label>
                      <input
                        type="text"
                        value={modVersion}
                        onChange={(e) => setModVersion(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Projektordner</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        placeholder="Ordner auswählen..."
                        value={projectPath}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-400"
                      />
                      <button
                        onClick={handleSelectFolder}
                        className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium flex items-center gap-2"
                      >
                        <Folder className="w-4 h-4" /> Durchsuchen
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="p-6 border-t border-slate-800 flex justify-between bg-slate-900/50">
              <button
                onClick={() => {
                  if (step > 1) setStep(step - 1);
                  else setIsModalOpen(false);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white font-medium text-sm"
              >
                {step === 1 ? 'Abbrechen' : 'Zurück'}
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-600/20"
                >
                  Weiter
                </button>
              ) : (
                <button
                  onClick={handleCreateProject}
                  disabled={!modName || !modId || !projectPath || !!modIdError}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20"
                >
                  Projekt Erstellen
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}