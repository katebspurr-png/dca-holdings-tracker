/** After first completion of the pre-app demo welcome, Try Demo skips straight to /demo. */
export const DEMO_WELCOME_DISMISSED_KEY = "positionpilot-demo-welcome-dismissed";

export function isDemoWelcomeDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEMO_WELCOME_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoWelcomeDismissed() {
  try {
    localStorage.setItem(DEMO_WELCOME_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearDemoWelcomeDismissed() {
  try {
    localStorage.removeItem(DEMO_WELCOME_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

/** First-time Try Demo → welcome screen; returning → bootstrap demo immediately. */
export function getDemoEntryPath(): "/demo-welcome" | "/demo" {
  return isDemoWelcomeDismissed() ? "/demo" : "/demo-welcome";
}
