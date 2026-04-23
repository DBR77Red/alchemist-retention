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

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
  }
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

interface SimulationContextValue {
  config: SimulationConfig;
  result: SimulationResult | null;
  isRunning: boolean;
  updateConfig: (partial: Partial<SimulationConfig>) => void;
  runSim: () => void;
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

  useEffect(() => {
    saveToStorage(CONFIG_KEY, config);
  }, [config]);

  useEffect(() => {
    if (result) saveToStorage(RESULT_KEY, result);
  }, [result]);

  const updateConfig = useCallback((partial: Partial<SimulationConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const runSim = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runSimulation(config);
      setResult(res);
      setIsRunning(false);
    }, 300);
  }, [config]);

  return (
    <SimulationContext.Provider
      value={{ config, result, isRunning, updateConfig, runSim }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}
