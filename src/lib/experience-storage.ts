import { getCurrentUserId } from "@/lib/storage";
export type UserLevel = "beginner" | "intermediate" | "advanced";

export type ExperiencePrefs = {
  userLevel: UserLevel;
  classificationDone: boolean;
  guidedDemoStepIndex: number;
  guidedDemoFinished: boolean;
  hasInteractedOnce: boolean;
  firstInteractionAt?: string;
};

export function defaultExperiencePrefs(): ExperiencePrefs {
  return {
    userLevel: "intermediate",
    classificationDone: false,
    guidedDemoStepIndex: 0,
    guidedDemoFinished: false,
    hasInteractedOnce: false,
  };
}

export function experienceStorageKey(): string {
  const uid = getCurrentUserId();
  return uid ? `positionpilot-experience-${uid}` : `positionpilot-experience-local`;
}

export function loadExperiencePrefs(): ExperiencePrefs {
  const base = defaultExperiencePrefs();
  try {
    const raw = localStorage.getItem(experienceStorageKey());
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ExperiencePrefs> & { isDemoMode?: boolean };
    const { isDemoMode: _legacy, ...rest } = parsed;
    void _legacy;
    return { ...base, ...rest };
  } catch {
    return base;
  }
}

export function saveExperiencePrefs(prefs: ExperiencePrefs) {
  localStorage.setItem(experienceStorageKey(), JSON.stringify(prefs));
}

export function patchExperiencePrefs(patch: Partial<ExperiencePrefs>) {
  const next = { ...loadExperiencePrefs(), ...patch };
  saveExperiencePrefs(next);
  return next;
}

export function scoreToUserLevel(total: number): UserLevel {
  if (total <= 2) return "beginner";
  if (total <= 4) return "intermediate";
  return "advanced";
}
