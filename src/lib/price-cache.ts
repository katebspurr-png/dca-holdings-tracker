import { apiTicker, type Exchange } from "@/lib/storage";
import type { StockQuote } from "@/lib/stock-price";

const CACHE_KEY = "dca-price-cache";

/** Read full Yahoo cache blob from localStorage (same key as stock-price fetch path). */
export function readPriceCache(): Record<string, StockQuote> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Last cached price for a holding’s API symbol, or null if missing. */
export function getCachedPrice(ticker: string, exchange: Exchange | undefined): number | null {
  const cache = readPriceCache();
  const key = apiTicker(ticker, exchange ?? "US").toUpperCase();
  const entry = cache[key];
  return entry?.price ?? null;
}
