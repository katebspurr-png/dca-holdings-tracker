const UPS_KEY = "positionpilot-preauth-save-upsell-seen";

export function hasSeenPreAuthSaveUpsell(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(UPS_KEY) === "1";
}

export function markPreAuthSaveUpsellSeen() {
  localStorage.setItem(UPS_KEY, "1");
}

export function clearPreAuthSaveUpsellFlag() {
  localStorage.removeItem(UPS_KEY);
}
