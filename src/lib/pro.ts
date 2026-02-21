/**
 * Pro / freemium utilities.
 */

// Set to true to re-enable freemium lookup limits and Pro upgrade flow
export const ENABLE_LOOKUP_LIMIT = false;

const PRO_KEY = "isPro";
const LOOKUP_KEY = "dca-price-lookups";

export function isPro(): boolean {
  return localStorage.getItem(PRO_KEY) === "true";
}

export function setPro(value: boolean) {
  localStorage.setItem(PRO_KEY, value ? "true" : "false");
}

interface LookupUsage {
  date: string;
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(): LookupUsage {
  try {
    const raw = localStorage.getItem(LOOKUP_KEY);
    if (!raw) return { date: today(), count: 0 };
    const parsed = JSON.parse(raw) as LookupUsage;
    if (parsed.date !== today()) return { date: today(), count: 0 };
    return parsed;
  } catch {
    return { date: today(), count: 0 };
  }
}

function setUsage(usage: LookupUsage) {
  localStorage.setItem(LOOKUP_KEY, JSON.stringify(usage));
}

export const FREE_LIMIT = 5;

export function lookupsRemaining(): number {
  if (isPro()) return Infinity;
  const usage = getUsage();
  return Math.max(0, FREE_LIMIT - usage.count);
}

export function canLookup(): boolean {
  if (!ENABLE_LOOKUP_LIMIT) return true;
  return isPro() || lookupsRemaining() > 0;
}

export function recordLookup() {
  if (!ENABLE_LOOKUP_LIMIT) return;
  if (isPro()) return;
  const usage = getUsage();
  usage.count += 1;
  usage.date = today();
  setUsage(usage);
}
