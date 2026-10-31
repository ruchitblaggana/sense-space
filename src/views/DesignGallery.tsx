// SenseSpace — Design Gallery
// Browse, compare, duplicate, rename, delete, export, and import saved device designs.

import { useRef, useState } from 'react';
import { Copy, Download, GalleryVerticalEnd, Pencil, Plus, Trash2, Upload, Check } from 'lucide-react';
import { useStore } from '../store';
import type { SavedDesign } from '../types';
import { createDefaultConfig, uid } from '../defaults';
import { downloadJSON, makeExportBundle, validateImport } from '../storage';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Notice, SectionLabel } from '../components/ui';
import { DevicePreview } from '../components/SimulationArena';

export function DesignGallery() {
  const { savedDesigns, config, setConfig, saveCurrentDesign, loadDesign, duplicateDesign, removeDesign, experiments, notify } = useStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport(design: SavedDesign) {
    const bundle = makeExportBundle([design], []);
    downloadJSON(`${design.config.name.replace(/\s+/g, '-').toLowerCase()}.json`, bundle);
    notify('Design exported.', 'success');
  }

  function handleExportAll() {
    const bundle = makeExportBundle(savedDesigns, experiments);
    downloadJSON('sensespace-export.json', bundle);
    notify('All designs exported.', 'success');
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const result = validateImport(raw);
      if (!result.ok || !result.bundle) {
        notify(result.error ?? 'Invalid file.', 'error');
        return;
      }
      // Import each design with a new ID to avoid overwriting
      for (const d of result.bundle.designs) {
        const newConfig = { ...d.config, id: uid('config'), createdAt: Date.now(), modifiedAt: Date.now() };
        await saveCurrentDesign(newConfig.name);
        // Note: saveCurrentDesign uses current config; for import we need to set then save
        setConfig(newConfig);
        await saveCurrentDesign(newConfig.name);
      }
      notify(`Imported ${result.bundle.designs.length} design(s).`, 'success');
    } catch {
      notify('Could not read file. Ensure it is valid JSON.', 'error');
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <SectionLabel>Design Gallery</SectionLabel>
          <h1 className="font-display text-3xl text-ink mt-1">Saved prototypes</h1>
          <p className="text-sm text-muted mt-1">Your collection of device designs. Duplicate, compare, export, and import.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import
          </Button>
          <Button variant="secondary" onClick={handleExportAll} disabled={savedDesigns.length === 0}>
            <Download size={16} /> Export all
          </Button>
          <Button variant="teal" onClick={() => { setConfig(createDefaultConfig()); saveCurrentDesign('New Design'); }}>
            <Plus size={16} /> New design
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {savedDesigns.length === 0 ? (
        <Card className="p-6">
          <EmptyState title="No saved designs yet" icon={<GalleryVerticalEnd size={32} />}>
            Configure a device in the Design Bench and save it, or import a previously exported configuration.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedDesigns.map((d) => (
            <Card key={d.config.id} className="p-4 flex flex-col">
              <div className="flex items-center justify-center mb-3 bg-grid-fine rounded-lg py-4">
                <DevicePreview config={d.config} size={180} />
              </div>
              {renameId === d.config.id ? (
                <div className="flex gap-1 mb-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    className="flex-1 bg-paper border border-line rounded-lg px-2 py-1 text-sm"
                  />
                  <Button size="sm" variant="teal" onClick={() => {
                    loadDesign({ ...d.config, name: renameValue });
                    setRenameId(null);
                  }}>
                    <Check size={12} />
                  </Button>
                </div>
              ) : (
                <h3 className="font-display text-lg text-ink mb-0.5 truncate">{d.config.name}</h3>
              )}
              <p className="text-xs text-muted mb-2 line-clamp-2 flex-1">{d.config.description.slice(0, 100)}…</p>
              <dl className="text-xs space-y-0.5 mb-3 font-mono">
                <div className="flex justify-between"><dt className="text-muted">Components</dt><dd className="text-ink">{d.config.components.length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Modified</dt><dd className="text-ink">{new Date(d.config.modifiedAt).toLocaleDateString()}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-1 pt-2 border-t border-line">
                <Button size="sm" variant="secondary" onClick={() => loadDesign(d.config)}>Open</Button>
                <Button size="sm" variant="ghost" onClick={() => duplicateDesign(d.config.id)} aria-label="Duplicate design"><Copy size={13} /></Button>
                <Button size="sm" variant="ghost" onClick={() => { setRenameId(d.config.id); setRenameValue(d.config.name); }} aria-label="Rename design"><Pencil size={13} /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleExport(d)} aria-label="Export design"><Download size={13} /></Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(d.config.id)} aria-label="Delete design"><Trash2 size={13} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Notice tone="info">
        Imported configurations are validated before use and assigned new IDs so they cannot overwrite your existing records.
      </Notice>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this design?"
        message="This will permanently remove the saved design. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) removeDesign(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
