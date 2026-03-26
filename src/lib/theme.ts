export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

/** Dispatched on `window` when the stored theme preference changes (same-tab updates). */
export const THEME_PREFERENCE_CHANGE_EVENT = "positionpilot-theme-preference-change";

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export function resolveEffectiveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemeToDocument(effective: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", effective === "dark");
}

/** Read storage, apply resolved class, return preference (for subscribers). */
export function applyStoredTheme(): ThemePreference {
  const pref = getStoredTheme();
  applyThemeToDocument(resolveEffectiveTheme(pref));
  return pref;
}

export function setThemePreference(pref: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, pref);
  applyThemeToDocument(resolveEffectiveTheme(pref));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(THEME_PREFERENCE_CHANGE_EVENT));
  }
}

export function subscribeSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
