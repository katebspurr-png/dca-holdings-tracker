/**
 * Stock price fetching with 5-minute cache.
 * Uses the stock-price edge function to avoid CORS.
 */

import { canLookup, recordLookup } from "./pro";

export interface StockQuote {
  ticker: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  fetchedAt: number; // timestamp ms
}

const CACHE_KEY = "dca-price-cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function readCache(): Record<string, StockQuote> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, StockQuote>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function getCached(ticker: string): StockQuote | null {
  const cache = readCache();
  const entry = cache[ticker];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL) return null;
  return entry;
}

function setCache(quote: StockQuote) {
  const cache = readCache();
  cache[quote.ticker] = quote;
  writeCache(cache);
}

export type FetchResult =
  | { ok: true; quote: StockQuote; fromCache: boolean }
  | { ok: false; error: string };

export async function fetchStockPrice(ticker: string): Promise<FetchResult> {
  const upper = ticker.toUpperCase();

  // Check cache first (free, doesn't count)
  const cached = getCached(upper);
  if (cached) return { ok: true, quote: cached, fromCache: true };

  // Check rate limit
  if (!canLookup()) {
    return { ok: false, error: "Daily lookup limit reached" };
  }

  try {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const resp = await fetch(
      `${projectUrl}/functions/v1/stock-price?ticker=${upper}`,
      {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      }
    );

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      return { ok: false, error: errData.error || "Price unavailable" };
    }

    const result = await resp.json();
    const quote: StockQuote = {
      ticker: upper,
      price: result.price,
      previousClose: result.previousClose,
      change: result.change,
      changePercent: result.changePercent,
      fetchedAt: Date.now(),
    };

    setCache(quote);
    recordLookup();
    return { ok: true, quote, fromCache: false };
  } catch {
    return { ok: false, error: "Network error — price unavailable" };
  }
}
