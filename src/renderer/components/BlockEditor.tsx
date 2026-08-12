import React, { useState } from 'react';

const api = (window as any).electronAPI;

interface Props {
  projectPath: string;
  modId: string;
  onClose?: () => void;
  onCreated?: (result: any) => void;
}

export default function BlockEditor({ projectPath, modId, onClose, onCreated }: Props) {
  const [blockName, setBlockName] = useState('');
  const [hardness, setHardness] = useState(1.5);
  const [resistance, setResistance] = useState(6.0);
  const [soundGroup, setSoundGroup] = useState('stone');
  const [tool, setTool] = useState('pickaxe');
  const [harvestLevel, setHarvestLevel] = useState(0);
  const [texturePath, setTexturePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickTexture = async () => {
    const p = await api.selectFile([{ name: 'Images', extensions: ['png', 'jpg', 'webp'] }]);
    if (p) setTexturePath(p);
  };

  const validate = () => {
    if (!blockName.trim()) return 'Block-Name darf nicht leer sein.';
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(modId)) return 'Ungültige Mod-ID für Java-Package.';
    return null;
  };

  const handleCreate = async () => {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setBusy(true);
    const payload = {
      projectPath,
      modId,
      blockName,
      hardness,
      resistance,
      sound: soundGroup,
      tool,
      harvestLevel,
      texturePath,
    };
    const res = await api.createBlock(payload);
    setBusy(false);
    if (res.success) {
      onCreated && onCreated(res);
      onClose && onClose();
    } else if (res.conflict) {
      setError(`Konflikt: Datei existiert bereits - ${res.path}`);
    } else {
      setError(res.error || 'Unbekannter Fehler');
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl max-w-xl mx-auto">
      <h3 className="text-lg font-bold mb-3">Block Editor</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-300">Block-Name</label>
          <input value={blockName} onChange={e => setBlockName(e.target.value)} className="w-full rounded p-2 bg-slate-950 border border-slate-800" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sm text-slate-300">Hardness</label>
            <input type="number" value={hardness} step="0.1" onChange={e => setHardness(Number(e.target.value))} className="w-full rounded p-2 bg-slate-950 border border-slate-800" />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Resistance</label>
            <input type="number" value={resistance} step="0.1" onChange={e => setResistance(Number(e.target.value))} className="w-full rounded p-2 bg-slate-950 border border-slate-800" />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Harvest Level</label>
            <input type="number" value={harvestLevel} onChange={e => setHarvestLevel(Number(e.target.value))} className="w-full rounded p-2 bg-slate-950 border border-slate-800" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm text-slate-300">Sound Group</label>
            <select value={soundGroup} onChange={e => setSoundGroup(e.target.value)} className="w-full rounded p-2 bg-slate-950 border border-slate-800">
              <option value="stone">stone</option>
              <option value="wood">wood</option>
              <option value="metal">metal</option>
              <option value="ground">ground</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300">Tool Type</label>
            <select value={tool} onChange={e => setTool(e.target.value)} className="w-full rounded p-2 bg-slate-950 border border-slate-800">
              <option value="pickaxe">Pickaxe</option>
              <option value="axe">Axe</option>
              <option value="shovel">Shovel</option>
              <option value="hand">Hand</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300">Texture</label>
          <div className="flex items-center gap-2">
            <button onClick={pickTexture} className="px-3 py-2 bg-indigo-600 rounded">Choose</button>
            <input value={texturePath || ''} readOnly className="flex-1 rounded p-2 bg-slate-950 border border-slate-800" />
          </div>
          {texturePath && (
            <div className="mt-2"><img src={`file://${texturePath}`} alt="preview" style={{ width: 64, height: 64 }} /></div>
          )}
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 bg-slate-700 rounded">Abbrechen</button>
          <button onClick={handleCreate} disabled={busy} className="px-4 py-2 bg-emerald-600 rounded text-white">Erstellen</button>
        </div>
      </div>
    </div>
  );
}
