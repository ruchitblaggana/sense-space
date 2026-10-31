// SenseSpace — Local persistence (IndexedDB + localStorage)
// Versioned schema with migration and safe fallbacks.

import type { DeviceConfig, Experiment, SavedDesign, SimulationResult, UISettings } from './types';

const DB_NAME = 'sensespace';
const DB_VERSION = 1;
const STORE_DESIGNS = 'designs';
const STORE_EXPERIMENTS = 'experiments';
const STORE_RESULTS = 'results';
const STORE_META = 'meta';

const SETTINGS_KEY = 'sensespace:settings';
const SCHEMA_KEY = 'sensespace:schema-version';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DESIGNS)) db.createObjectStore(STORE_DESIGNS, { keyPath: 'config.id' });
      if (!db.objectStoreNames.contains(STORE_EXPERIMENTS)) db.createObjectStore(STORE_EXPERIMENTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_RESULTS)) db.createObjectStore(STORE_RESULTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDB().then((db) => {
    if (!db) return null;
    return new Promise((resolve) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const r = fn(s);
      r.onsuccess = () => resolve(r.result as T);
      r.onerror = () => resolve(null);
    });
  });
}

// --- Designs ---------------------------------------------------

export async function saveDesign(d: SavedDesign): Promise<boolean> {
  const res = await tx(STORE_DESIGNS, 'readwrite', (s) => s.put(d));
  return res !== null;
}

export async function getDesign(id: string): Promise<SavedDesign | null> {
  return tx(STORE_DESIGNS, 'readonly', (s) => s.get(id));
}

export async function getAllDesigns(): Promise<SavedDesign[]> {
  const res = await tx<SavedDesign[]>(STORE_DESIGNS, 'readonly', (s) => s.getAll());
  return res ?? [];
}

export async function deleteDesign(id: string): Promise<boolean> {
  const res = await tx(STORE_DESIGNS, 'readwrite', (s) => s.delete(id));
  return res !== null;
}

// --- Experiments -----------------------------------------------

export async function saveExperiment(e: Experiment): Promise<boolean> {
  const res = await tx(STORE_EXPERIMENTS, 'readwrite', (s) => s.put(e));
  return res !== null;
}

export async function getAllExperiments(): Promise<Experiment[]> {
  const res = await tx<Experiment[]>(STORE_EXPERIMENTS, 'readonly', (s) => s.getAll());
  return res ?? [];
}

export async function deleteExperiment(id: string): Promise<boolean> {
  const res = await tx(STORE_EXPERIMENTS, 'readwrite', (s) => s.delete(id));
  return res !== null;
}

// --- Results ---------------------------------------------------

export async function saveResult(id: string, result: SimulationResult): Promise<boolean> {
  const res = await tx(STORE_RESULTS, 'readwrite', (s) => s.put({ id, result }));
  return res !== null;
}

export async function getResult(id: string): Promise<SimulationResult | null> {
  const row = await tx<{ id: string; result: SimulationResult }>(STORE_RESULTS, 'readonly', (s) => s.get(id));
  return row?.result ?? null;
}

// --- Settings (localStorage) -----------------------------------

const DEFAULT_SETTINGS: UISettings = {
  reducedMotion: false,
  muted: false,
  showGrid: true,
  showLabels: true,
  theme: 'paper',
  tutorialCompleted: false,
};

export function loadSettings(): UISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: UISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or unavailable */
  }
}

export function getSchemaVersion(): number {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function setSchemaVersion(v: number): void {
  try {
    localStorage.setItem(SCHEMA_KEY, String(v));
  } catch {
    /* noop */
  }
}

// --- Reset -----------------------------------------------------

export async function resetAllData(): Promise<void> {
  const db = await openDB();
  if (db) {
    try {
      db.transaction(STORE_DESIGNS, 'readwrite').objectStore(STORE_DESIGNS).clear();
      db.transaction(STORE_EXPERIMENTS, 'readwrite').objectStore(STORE_EXPERIMENTS).clear();
      db.transaction(STORE_RESULTS, 'readwrite').objectStore(STORE_RESULTS).clear();
    } catch {
      /* noop */
    }
  }
  try {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(SCHEMA_KEY);
  } catch {
    /* noop */
  }
}

export async function isStorageAvailable(): Promise<boolean> {
  const db = await openDB();
  return db !== null;
}

// --- Export / Import validation --------------------------------

export interface ExportBundle {
  app: 'sensespace';
  version: number;
  exportedAt: number;
  designs: SavedDesign[];
  experiments: Experiment[];
}

export function validateImport(raw: unknown): { ok: boolean; bundle?: ExportBundle; error?: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'File is not a valid JSON object.' };
  const b = raw as Partial<ExportBundle>;
  if (b.app !== 'sensespace') return { ok: false, error: 'Not a SenseSpace export bundle.' };
  if (typeof b.version !== 'number') return { ok: false, error: 'Missing bundle version.' };
  if (!Array.isArray(b.designs)) return { ok: false, error: 'Designs list is missing or invalid.' };
  if (!Array.isArray(b.experiments)) return { ok: false, error: 'Experiments list is missing or invalid.' };
  // shallow-validate each design has a config with an id and components
  for (const d of b.designs) {
    if (!d?.config?.id || !Array.isArray(d.config.components)) {
      return { ok: false, error: 'One or more designs are malformed.' };
    }
  }
  for (const e of b.experiments) {
    if (!e?.id || typeof e.title !== 'string') {
      return { ok: false, error: 'One or more experiments are malformed.' };
    }
  }
  return { ok: true, bundle: b as ExportBundle };
}

export function makeExportBundle(designs: SavedDesign[], experiments: Experiment[]): ExportBundle {
  return {
    app: 'sensespace',
    version: 1,
    exportedAt: Date.now(),
    designs,
    experiments,
  };
}

export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
