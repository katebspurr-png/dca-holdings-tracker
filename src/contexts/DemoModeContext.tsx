import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { clearPreAuthGuidedState, DEMO_FULL_RESET_EVENT } from "@/lib/preAuthDemoTour";
import { clearPreAuthSaveUpsellFlag } from "@/lib/preAuthDemoUpsell";
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
  const { session } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(() => isDemoModeSessionActive());
  const hadSessionRef = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== "undefined") {
      try {
        if (localStorage.getItem("positionpilot-force-demo") === "1" && !isDemoModeSessionActive()) {
          setDemoModeSessionActive(true);
          initializeDemoStorageIfNeeded();
          setIsDemoMode(true);
          notifyStorageChange();
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const hasSession = Boolean(session?.user);
    if (hasSession && !hadSessionRef.current) {
      clearDemoModeSessionFlag();
      setIsDemoMode(false);
      notifyStorageChange();
    }
    hadSessionRef.current = hasSession;
  }, [session?.user?.id]);

  const enterDemo = useCallback(() => {
    setDemoModeSessionActive(true);
    initializeDemoStorageIfNeeded();
    if (!session) {
      clearPreAuthGuidedState();
      clearPreAuthSaveUpsellFlag();
    }
    setIsDemoMode(true);
    notifyStorageChange();
  }, [session]);

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
    clearPreAuthGuidedState();
    clearPreAuthSaveUpsellFlag();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(DEMO_FULL_RESET_EVENT));
    }
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
