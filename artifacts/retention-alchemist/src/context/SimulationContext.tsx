import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  runSimulation,
  getDefaultConfig,
  type SimulationConfig,
  type SimulationResult,
} from "@/services/simulationEngine";

const CONFIG_KEY = "retention_alchemist_config";
const RESULT_KEY = "retention_alchemist_result";
const PRESETS_KEY = "retention_alchemist_presets";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export interface Preset {
  id: string;
  name: string;
  config: SimulationConfig;
  d1: number;
  d7: number;
  d30: number;
  savedAt: number;
}

interface SimulationContextValue {
  config: SimulationConfig;
  result: SimulationResult | null;
  isRunning: boolean;
  configDirty: boolean;
  updateConfig: (partial: Partial<SimulationConfig>) => void;
  runSim: () => void;
  presets: Preset[];
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, newName: string) => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SimulationConfig>(() =>
    loadFromStorage(CONFIG_KEY, getDefaultConfig())
  );
  const [result, setResult] = useState<SimulationResult | null>(() =>
    loadFromStorage(RESULT_KEY, null)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);
  const [presets, setPresets] = useState<Preset[]>(() =>
    loadFromStorage(PRESETS_KEY, [])
  );

  useEffect(() => {
    saveToStorage(CONFIG_KEY, config);
  }, [config]);

  useEffect(() => {
    if (result) saveToStorage(RESULT_KEY, result);
  }, [result]);

  useEffect(() => {
    saveToStorage(PRESETS_KEY, presets);
  }, [presets]);

  const updateConfig = useCallback((partial: Partial<SimulationConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setConfigDirty(true);
  }, []);

  const runSim = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runSimulation(config);
      setResult(res);
      setConfigDirty(false);
      setIsRunning(false);
    }, 400);
  }, [config]);

  const savePreset = useCallback(
    (name: string) => {
      if (!result || configDirty) return;
      const preset: Preset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim() || "Unnamed Preset",
        config: { ...config },
        d1: result.d1,
        d7: result.d7,
        d30: result.d30,
        savedAt: Date.now(),
      };
      setPresets((prev) => [preset, ...prev]);
    },
    [config, result, configDirty]
  );

  const loadPreset = useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      setConfig({ ...preset.config });
      const res = runSimulation(preset.config);
      setResult(res);
      setConfigDirty(false);
    },
    [presets]
  );

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const renamePreset = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p))
    );
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        config,
        result,
        isRunning,
        configDirty,
        updateConfig,
        runSim,
        presets,
        savePreset,
        loadPreset,
        deletePreset,
        renamePreset,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx)
    throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}
