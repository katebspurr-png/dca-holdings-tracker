import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearDemoModeSessionFlag,
  getRealHoldings,
  initializeDemoStorageIfNeeded,
  isDemoModeSessionActive,
  notifyStorageChange,
  resetDemoToInitialSample,
  setDemoModeSessionActive,
} from "@/lib/storage";

type DemoModeContextValue = {
  isDemoMode: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
  resetDemo: () => void;
};

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isDemoMode, setIsDemoMode] = useState(() => isDemoModeSessionActive());

  const enterDemo = useCallback(() => {
    setDemoModeSessionActive(true);
    initializeDemoStorageIfNeeded();
    setIsDemoMode(true);
    notifyStorageChange();
  }, []);

  const exitDemo = useCallback(() => {
    clearDemoModeSessionFlag();
    setIsDemoMode(false);
    notifyStorageChange();

    const path = window.location.pathname;
    const m = path.match(/^\/holdings\/([^/]+)/);
    if (m?.[1]) {
      const id = m[1];
      const realIds = new Set(getRealHoldings().map((h) => h.id));
      if (!realIds.has(id)) {
        navigate("/", { replace: true });
      }
    }
  }, [navigate]);

  const resetDemo = useCallback(() => {
    resetDemoToInitialSample();
  }, []);

  const value = useMemo(
    () => ({ isDemoMode, enterDemo, exitDemo, resetDemo }),
    [isDemoMode, enterDemo, exitDemo, resetDemo],
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    throw new Error("useDemoMode must be used within DemoModeProvider");
  }
  return ctx;
}
