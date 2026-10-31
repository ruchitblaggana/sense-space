// SenseSpace — Global application store (React context)
// Manages active config, saved designs, experiments, settings, and toasts.

import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DeviceConfig, Experiment, SavedDesign, SimulationResult, UISettings } from './types';
import {
  createDefaultConfig,
  EXAMPLE_EXPERIMENT,
  uid,
} from './defaults';
import {
  deleteDesign as dbDeleteDesign,
  deleteExperiment as dbDeleteExperiment,
  getAllDesigns,
  getAllExperiments,
  getSchemaVersion,
  isStorageAvailable,
  loadSettings,
  resetAllData,
  saveDesign,
  saveExperiment,
  saveSettings,
  setSchemaVersion,
} from './storage';

export type ViewKey =
  | 'home'
  | 'bench'
  | 'simulation'
  | 'journal'
  | 'playground'
  | 'comparison'
  | 'gallery'
  | 'learn'
  | 'about';

export interface Toast {
  id: string;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'error';
}

interface StoreValue {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  config: DeviceConfig;
  setConfig: (c: DeviceConfig) => void;
  updateConfig: (patch: Partial<DeviceConfig>) => void;
  savedDesigns: SavedDesign[];
  experiments: Experiment[];
  settings: UISettings;
  updateSettings: (patch: Partial<UISettings>) => void;
  storageOk: boolean;
  toasts: Toast[];
  notify: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
  // design ops
  saveCurrentDesign: (name?: string) => Promise<void>;
  loadDesign: (config: DeviceConfig) => void;
  duplicateDesign: (id: string) => Promise<void>;
  removeDesign: (id: string) => Promise<void>;
  // experiment ops
  saveCurrentExperiment: (e: Experiment) => Promise<void>;
  removeExperiment: (id: string) => Promise<void>;
  // last simulation result for linking
  lastResult: SimulationResult | null;
  setLastResult: (r: SimulationResult | null) => void;
  resetData: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used within StoreProvider');
  return v;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewKey>('home');
  const [config, setConfigState] = useState<DeviceConfig>(() => createDefaultConfig());
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [settings, setSettings] = useState<UISettings>(() => loadSettings());
  const [storageOk, setStorageOk] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastResult, setLastResult] = useState<SimulationResult | null>(null);

  const notify = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Initialize: load saved designs, experiments, seed defaults if empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await isStorageAvailable();
      if (!ok) {
        setStorageOk(false);
        notify('Saved designs and experiments are unavailable because browser storage is not accessible.', 'warning');
        return;
      }
      const designs = await getAllDesigns();
      const exps = await getAllExperiments();
      if (cancelled) return;

      // Seed default design + example experiment on first launch
      if (designs.length === 0) {
        const defaultDesign: SavedDesign = {
          config: createDefaultConfig(),
          linkedExperimentIds: [],
          notes: 'The default SenseSpace prototype. A good starting point for experiments.',
        };
        await saveDesign(defaultDesign);
        designs.push(defaultDesign);
      }
      if (exps.length === 0) {
        const ex: Experiment = {
          ...EXAMPLE_EXPERIMENT,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          status: 'draft',
          configSnapshot: createDefaultConfig(),
          configName: 'SenseSpace Prototype S1',
        };
        await saveExperiment(ex);
        exps.push(ex);
      }

      setSavedDesigns(designs);
      setExperiments(exps);

      // schema version stamp
      if (getSchemaVersion() === 0) setSchemaVersion(1);
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  // Persist settings
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  useEffect(() => {
    saveSettings(settingsRef.current);
  }, [settings]);

  const setConfig = useCallback((c: DeviceConfig) => {
    setConfigState({ ...c, modifiedAt: Date.now() });
  }, []);

  const updateConfig = useCallback((patch: Partial<DeviceConfig>) => {
    setConfigState((c) => ({ ...c, ...patch, modifiedAt: Date.now() }));
  }, []);

  const updateSettings = useCallback((patch: Partial<UISettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const refreshDesigns = useCallback(async () => {
    const d = await getAllDesigns();
    setSavedDesigns(d);
  }, []);

  const saveCurrentDesign = useCallback(
    async (name?: string) => {
      const cfg = name ? { ...config, name, modifiedAt: Date.now() } : config;
      const design: SavedDesign = {
        config: cfg,
        linkedExperimentIds: [],
        notes: '',
      };
      const ok = await saveDesign(design);
      if (ok) {
        await refreshDesigns();
        notify('Design saved to gallery.', 'success');
      } else {
        notify('Could not save design — storage unavailable.', 'error');
      }
    },
    [config, notify, refreshDesigns],
  );

  const loadDesign = useCallback(
    (c: DeviceConfig) => {
      setConfig({ ...c, modifiedAt: Date.now() });
      notify(`Loaded "${c.name}".`, 'success');
    },
    [notify, setConfig],
  );

  const duplicateDesign = useCallback(
    async (id: string) => {
      const d = savedDesigns.find((x) => x.config.id === id);
      if (!d) return;
      const copy: DeviceConfig = {
        ...d.config,
        id: uid('config'),
        name: `${d.config.name} (copy)`,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      await saveDesign({ config: copy, linkedExperimentIds: [], notes: d.notes });
      await refreshDesigns();
      notify('Design duplicated.', 'success');
    },
    [savedDesigns, notify, refreshDesigns],
  );

  const removeDesign = useCallback(
    async (id: string) => {
      await dbDeleteDesign(id);
      await refreshDesigns();
      notify('Design deleted.', 'info');
    },
    [notify, refreshDesigns],
  );

  const refreshExperiments = useCallback(async () => {
    const e = await getAllExperiments();
    setExperiments(e);
  }, []);

  const saveCurrentExperiment = useCallback(
    async (e: Experiment) => {
      const toSave = { ...e, modifiedAt: Date.now() };
      await saveExperiment(toSave);
      await refreshExperiments();
    },
    [refreshExperiments],
  );

  const removeExperiment = useCallback(
    async (id: string) => {
      await dbDeleteExperiment(id);
      await refreshExperiments();
      notify('Experiment removed.', 'info');
    },
    [notify, refreshExperiments],
  );

  const resetData = useCallback(async () => {
    const { resetAllData } = await import('./storage');
    await resetAllData();
    setSavedDesigns([]);
    setExperiments([]);
    setSettings(loadSettings());
    notify('All local data has been reset.', 'info');
  }, [notify]);

  const value = useMemo<StoreValue>(
    () => ({
      view,
      setView,
      config,
      setConfig,
      updateConfig,
      savedDesigns,
      experiments,
      settings,
      updateSettings,
      storageOk,
      toasts,
      notify,
      dismissToast,
      saveCurrentDesign,
      loadDesign,
      duplicateDesign,
      removeDesign,
      saveCurrentExperiment,
      removeExperiment,
      lastResult,
      setLastResult,
      resetData,
    }),
    [
      view,
      config,
      savedDesigns,
      experiments,
      settings,
      storageOk,
      toasts,
      notify,
      dismissToast,
      setConfig,
      updateConfig,
      saveCurrentDesign,
      loadDesign,
      duplicateDesign,
      removeDesign,
      saveCurrentExperiment,
      removeExperiment,
      lastResult,
      resetData,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
