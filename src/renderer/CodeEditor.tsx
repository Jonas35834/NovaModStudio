import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Folder, FileCode, FileJson, FileText, ChevronRight, ChevronDown, Save, RefreshCw, Trash2, FilePlus } from 'lucide-react';

const api = (window as any).electronAPI;

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

interface CodeEditorProps {
  projectPath: string;
}

export default function CodeEditor({ projectPath }: CodeEditorProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProjectTree();
  }, [projectPath]);

  const loadProjectTree = async () => {
    const res = await api.readProjectTree(projectPath);
    if (res.success) {
      setTree(res.tree);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const openFile = async (filePath: string) => {
    const res = await api.readFileContent(filePath);
    if (res.success) {
      setSelectedFilePath(filePath);
      setFileContent(res.content);
      setOriginalContent(res.content);
      setIsSaved(true);
    }
  };

  const handleSave = async () => {
    if (!selectedFilePath) return;
    const res = await api.saveFileContent({
      filePath: selectedFilePath,
      content: fileContent,
    });
    if (res.success) {
      setOriginalContent(fileContent);
      setIsSaved(true);
    } else {
      alert(`Fehler beim Speichern: ${res.error}`);
    }
  };

  const handleCreateNewFile = async () => {
    const filename = prompt('Name der neuen Datei (z. B. CustomItem.java):');
    if (!filename) return;

    const targetDir = selectedFilePath
      ? selectedFilePath.substring(0, selectedFilePath.lastIndexOf('\\'))
      : projectPath;

    const newFilePath = `${targetDir}\\${filename}`;
    const res = await api.createFile({ filePath: newFilePath });

    if (res.success) {
      await loadProjectTree();
      openFile(newFilePath);
    } else {
      alert(`Fehler beim Erstellen der Datei: ${res.error}`);
    }
  };

  const handleDeleteFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Möchtest du "${filePath.split('\\').pop()}" wirklich löschen?`)) {
      const res = await api.deleteFile(filePath);
      if (res.success) {
        if (selectedFilePath === filePath) {
          setSelectedFilePath(null);
          setFileContent('');
        }
        await loadProjectTree();
      }
    }
  };

  const getLanguage = (fileName: string) => {
    if (fileName.endsWith('.java')) return 'java';
    if (fileName.endsWith('.json')) return 'json';
    if (fileName.endsWith('.gradle') || fileName.endsWith('.properties')) return 'groovy';
    return 'plaintext';
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.java')) return <FileCode className="w-4 h-4 text-amber-400 shrink-0" />;
    if (fileName.endsWith('.json')) return <FileJson className="w-4 h-4 text-emerald-400 shrink-0" />;
    return <FileText className="w-4 h-4 text-indigo-400 shrink-0" />;
  };

  const renderTree = (nodes: FileNode[]) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders[node.path];

      if (node.isDirectory) {
        return (
          <div key={node.path} className="pl-2">
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-slate-800/80 cursor-pointer text-slate-300 font-medium text-xs"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div className="border-l border-slate-800/80 ml-3">
                {renderTree(node.children)}
              </div>
            )}
          </div>
        );
      }

      const isSelected = selectedFilePath === node.path;

      return (
        <div
          key={node.path}
          onClick={() => openFile(node.path)}
          className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer text-xs ml-4 transition-colors ${
            isSelected ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
          </div>
          <button
            onClick={(e) => handleDeleteFile(node.path, e)}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-140px)] border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
      {/* Dateibaum (Links) */}
      <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dateibaum</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateNewFile}
              title="Neue Datei erstellen"
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button
              onClick={loadProjectTree}
              title="Aktualisieren"
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {tree.length > 0 ? renderTree(tree) : (
            <p className="text-xs text-slate-500 p-4">Keine Dateien gefunden.</p>
          )}
        </div>
      </div>

      {/* Editorbereich (Rechts) */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {selectedFilePath ? (
          <>
            <header className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span className="text-indigo-400 font-bold">{selectedFilePath.split('\\').pop()}</span>
                {!isSaved && <span className="text-amber-400 font-bold">* (ungespeichert)</span>}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaved}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
              >
                <Save className="w-3.5 h-3.5" /> Speichern
              </button>
            </header>

            <div className="flex-1">
              <Editor
                height="100%"
                theme="vs-dark"
                language={getLanguage(selectedFilePath)}
                value={fileContent}
                onChange={(val) => {
                  const newContent = val || '';
                  setFileContent(newContent);
                  setIsSaved(newContent === originalContent);
                }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
            <FileCode className="w-12 h-12 mb-3 text-slate-700" />
            <p className="text-sm font-medium">Wähle eine Datei aus dem Dateibaum links aus,</p>
            <p className="text-xs text-slate-600 mt-1">um ihren Code anzusehen und zu bearbeiten.</p>
          </div>
        )}
      </div>
    </div>
  );
}