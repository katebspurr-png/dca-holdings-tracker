import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "dca-sim-include-fees";

type SimFeesContextValue = {
  includeFees: boolean;
  setIncludeFees: (v: boolean) => void;
};

const SimFeesContext = createContext<SimFeesContextValue | null>(null);

export function SimFeesProvider({ children }: { children: ReactNode }) {
  const [includeFees, setIncludeFees] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, includeFees ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, [includeFees]);

  return (
    <SimFeesContext.Provider value={{ includeFees, setIncludeFees }}>
      {children}
    </SimFeesContext.Provider>
  );
}

export function useSimFees() {
  const ctx = useContext(SimFeesContext);
  if (!ctx) {
    throw new Error("useSimFees must be used within SimFeesProvider");
  }
  return ctx;
}
