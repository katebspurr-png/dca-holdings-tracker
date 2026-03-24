/** After "Keep exploring" or "Create account", we don't re-show until tour restarts or demo re-enters. */
const KEY = "positionpilot-preauth-conversion-dismissed";

export function isPreAuthConversionDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setPreAuthConversionDismissed() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearPreAuthConversionDismissed() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
