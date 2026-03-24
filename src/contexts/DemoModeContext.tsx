import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEMO_FULL_RESET_EVENT,
  PRE_AUTH_GUIDED_STORAGE_EVENT,
  resetPreAuthGuidedToStart,
  savePreAuthGuidedState,
} from "@/lib/preAuthDemoTour";
import { PRE_AUTH_GUIDED_DEMO_STEPS } from "@/walkthrough/preAuthGuidedDemoSteps";
import { clearDemoWelcomeDismissed } from "@/lib/demoWelcome";
import { clearPreAuthConversionDismissed } from "@/lib/preAuthConversionModal";
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

export type EnterDemoOptions = {
  /** If true, pre-auth guided coach stays off after entering demo. */
  skipPreAuthGuidedTour?: boolean;
};

type DemoModeContextValue = {
  isDemoMode: boolean;
  enterDemo: (options?: EnterDemoOptions) => void;
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
          resetPreAuthGuidedToStart();
          window.dispatchEvent(new Event(PRE_AUTH_GUIDED_STORAGE_EVENT));
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

  const enterDemo = useCallback((options?: EnterDemoOptions) => {
    setDemoModeSessionActive(true);
    initializeDemoStorageIfNeeded();
    if (!session) {
      if (options?.skipPreAuthGuidedTour) {
        const last = PRE_AUTH_GUIDED_DEMO_STEPS.length - 1;
        savePreAuthGuidedState({ stepIndex: last, finished: true });
      } else {
        resetPreAuthGuidedToStart();
        clearPreAuthConversionDismissed();
      }
      clearPreAuthSaveUpsellFlag();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PRE_AUTH_GUIDED_STORAGE_EVENT));
      }
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
    resetPreAuthGuidedToStart();
    clearPreAuthSaveUpsellFlag();
    clearDemoWelcomeDismissed();
    clearPreAuthConversionDismissed();
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
