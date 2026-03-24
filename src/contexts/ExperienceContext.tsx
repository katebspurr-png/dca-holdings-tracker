import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import {
  type ExperiencePrefs,
  type UserLevel,
  defaultExperiencePrefs,
  loadExperiencePrefs,
  saveExperiencePrefs,
  scoreToUserLevel,
} from "@/lib/experience-storage";
import { getRealHoldings } from "@/lib/storage";
import { setOnboardingDone } from "@/components/onboarding";
import { GUIDED_DEMO_STEPS } from "@/walkthrough/guidedDemoSteps";

export type ClassificationAnswers = {
  q1: 0 | 1 | 2;
  q2: 0 | 1 | 2;
  q3?: 0 | 1 | 2;
};

type ExperienceContextValue = {
  userLevel: UserLevel;
  setUserLevel: (level: UserLevel) => void;
  isDemoMode: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
  classificationDone: boolean;
  completeClassification: (answers: ClassificationAnswers) => void;
  skipClassification: () => void;
  showTooltips: boolean;
  showSubtleHints: boolean;
  hasInteractedOnce: boolean;
  markInteracted: () => void;
  guidedDemoActive: boolean;
  guidedDemoStepIndex: number;
  advanceGuidedDemo: () => void;
  skipGuidedDemo: () => void;
  resetGuidedDemo: () => void;
  prefs: ExperiencePrefs;
  refreshPrefs: () => void;
  trySamplePortfolio: () => void;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function computeLevel(a: ClassificationAnswers): UserLevel {
  const q3 = a.q3 ?? 1;
  return scoreToUserLevel(a.q1 + a.q2 + q3);
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { isDemoMode, enterDemo, exitDemo } = useDemoMode();
  const [prefs, setPrefsState] = useState<ExperiencePrefs>(defaultExperiencePrefs);
  const [storageTick, setStorageTick] = useState(0);

  const refreshPrefs = useCallback(() => {
    setPrefsState(loadExperiencePrefs());
    setStorageTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!session) {
      setPrefsState(defaultExperiencePrefs());
      return;
    }
    setPrefsState(loadExperiencePrefs());
  }, [session?.user?.id, storageTick]);

  const persist = useCallback((next: ExperiencePrefs) => {
    saveExperiencePrefs(next);
    setPrefsState(next);
  }, []);

  const setUserLevel = useCallback(
    (userLevel: UserLevel) => {
      persist({ ...loadExperiencePrefs(), userLevel });
    },
    [persist],
  );

  const completeClassification = useCallback(
    (answers: ClassificationAnswers) => {
      const userLevel = computeLevel(answers);
      const prev = loadExperiencePrefs();
      const next: ExperiencePrefs = {
        ...prev,
        userLevel,
        classificationDone: true,
        guidedDemoStepIndex: 0,
        guidedDemoFinished: userLevel !== "beginner",
      };
      if (userLevel === "advanced") {
        setOnboardingDone();
      }
      saveExperiencePrefs(next);
      setPrefsState(next);
      if (userLevel === "beginner" && getRealHoldings().length === 0) {
        enterDemo();
      }
    },
    [enterDemo],
  );

  const skipClassification = useCallback(() => {
    const prev = loadExperiencePrefs();
    const next: ExperiencePrefs = {
      ...prev,
      userLevel: "intermediate",
      classificationDone: true,
    };
    saveExperiencePrefs(next);
    setPrefsState(next);
  }, []);

  const markInteracted = useCallback(() => {
    const prev = loadExperiencePrefs();
    if (prev.hasInteractedOnce) return;
    persist({
      ...prev,
      hasInteractedOnce: true,
      firstInteractionAt: new Date().toISOString(),
    });
  }, [persist]);

  const advanceGuidedDemo = useCallback(() => {
    const prev = loadExperiencePrefs();
    const last = GUIDED_DEMO_STEPS.length - 1;
    const idx = prev.guidedDemoStepIndex;
    if (idx >= last) {
      persist({ ...prev, guidedDemoStepIndex: last, guidedDemoFinished: true });
      return;
    }
    persist({ ...prev, guidedDemoStepIndex: idx + 1 });
  }, [persist]);

  const skipGuidedDemo = useCallback(() => {
    persist({ ...loadExperiencePrefs(), guidedDemoFinished: true });
  }, [persist]);

  const resetGuidedDemo = useCallback(() => {
    persist({
      ...loadExperiencePrefs(),
      guidedDemoStepIndex: 0,
      guidedDemoFinished: false,
    });
  }, [persist]);

  const trySamplePortfolio = useCallback(() => {
    enterDemo();
    persist({
      ...loadExperiencePrefs(),
      guidedDemoStepIndex: 0,
      guidedDemoFinished: false,
    });
  }, [enterDemo, persist]);

  const value = useMemo((): ExperienceContextValue => {
    const showTooltips = prefs.userLevel === "beginner";
    const showSubtleHints = prefs.userLevel === "intermediate";
    const guidedDemoActive =
      prefs.userLevel === "beginner" && isDemoMode && !prefs.guidedDemoFinished;

    return {
      userLevel: prefs.userLevel,
      setUserLevel,
      isDemoMode,
      enterDemo,
      exitDemo,
      classificationDone: prefs.classificationDone,
      completeClassification,
      skipClassification,
      showTooltips,
      showSubtleHints,
      hasInteractedOnce: prefs.hasInteractedOnce,
      markInteracted,
      guidedDemoActive,
      guidedDemoStepIndex: prefs.guidedDemoStepIndex,
      advanceGuidedDemo,
      skipGuidedDemo,
      resetGuidedDemo,
      prefs,
      refreshPrefs,
      trySamplePortfolio,
    };
  }, [
    prefs,
    isDemoMode,
    enterDemo,
    exitDemo,
    setUserLevel,
    completeClassification,
    skipClassification,
    markInteracted,
    advanceGuidedDemo,
    skipGuidedDemo,
    resetGuidedDemo,
    refreshPrefs,
    trySamplePortfolio,
  ]);

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience() {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience must be used within ExperienceProvider");
  return ctx;
}
