const PRE_AUTH_GUIDED_KEY = "positionpilot-preauth-guided-demo";

/** Dispatched when demo sample + pre-auth tour + upsell flags are reset. */
export const DEMO_FULL_RESET_EVENT = "positionpilot-demo-full-reset";

/** Dispatched when pre-auth guided tour storage changes (e.g. enter demo / skip tour). */
export const PRE_AUTH_GUIDED_STORAGE_EVENT = "positionpilot-preauth-guided-storage";

export type PreAuthGuidedState = {
  stepIndex: number;
  finished: boolean;
};

export function defaultPreAuthGuidedState(): PreAuthGuidedState {
  return { stepIndex: 0, finished: false };
}

export function loadPreAuthGuidedState(): PreAuthGuidedState {
  const base = defaultPreAuthGuidedState();
  try {
    const raw = localStorage.getItem(PRE_AUTH_GUIDED_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<PreAuthGuidedState>;
    return {
      stepIndex: typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0,
      finished: Boolean(parsed.finished),
    };
  } catch {
    return base;
  }
}

export function savePreAuthGuidedState(next: PreAuthGuidedState) {
  localStorage.setItem(PRE_AUTH_GUIDED_KEY, JSON.stringify(next));
}

/** Explicit step 1 — avoids “missing key” edge cases and stale finished flags after re-entering demo. */
export function resetPreAuthGuidedToStart() {
  savePreAuthGuidedState({ stepIndex: 0, finished: false });
}

export function clearPreAuthGuidedState() {
  localStorage.removeItem(PRE_AUTH_GUIDED_KEY);
}
