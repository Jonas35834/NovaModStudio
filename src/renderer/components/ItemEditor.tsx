import React, { useState } from 'react';

const api = (window as any).electronAPI;

interface Props {
  projectPath: string;
  modId: string;
  onClose?: () => void;
  onCreated?: (result: any) => void;
}

export default function ItemEditor({ projectPath, modId, onClose, onCreated }: Props) {
  const [itemName, setItemName] = useState('');
  const [maxStack, setMaxStack] = useState(64);
  const [tooltip, setTooltip] = useState('');
  const [tab, setTab] = useState('misc');
  const [texturePath, setTexturePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickTexture = async () => {
    const p = await api.selectFile([{ name: 'Images', extensions: ['png', 'jpg', 'webp'] }]);
    if (p) setTexturePath(p);
  };

  const validate = () => {
    if (!itemName.trim()) return 'Item-Name darf nicht leer sein.';
    if (maxStack < 1 || maxStack > 64) return 'MaxStack muss zwischen 1 und 64 liegen.';
    // Mod-ID Java identifier-ish validation
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
      itemName,
      maxStack,
      tooltip,
      tab,
      texturePath,
    };
    const res = await api.createItem(payload);
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
      <h3 className="text-lg font-bold mb-3">Item Editor</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-300">Item-Name</label>
          <input value={itemName} onChange={e => setItemName(e.target.value)} className="w-full rounded p-2 bg-slate-950 border border-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-slate-300">MaxStack</label>
          <input type="number" value={maxStack} min={1} max={64} onChange={e => setMaxStack(Number(e.target.value))} className="w-32 rounded p-2 bg-slate-950 border border-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Tooltip (optional)</label>
          <textarea value={tooltip} onChange={e => setTooltip(e.target.value)} className="w-full rounded p-2 bg-slate-950 border border-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Creative Tab</label>
          <select value={tab} onChange={e => setTab(e.target.value)} className="w-48 rounded p-2 bg-slate-950 border border-slate-800">
            <option value="misc">Misc</option>
            <option value="combat">Combat</option>
            <option value="building">Building</option>
            <option value="tools">Tools</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-300">Texture</label>
          <div className="flex items-center gap-2">
            <button onClick={pickTexture} className="px-3 py-2 bg-indigo-600 rounded">Choose</button>
            <input value={texturePath || ''} readOnly className="flex-1 rounded p-2 bg-slate-950 border border-slate-800" />
          </div>
          {texturePath && (
            <div className="mt-2">
              <img src={`file://${texturePath}`} alt="preview" style={{ width: 64, height: 64 }} />
            </div>
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
