/**
 * Stock price fetching with 5-minute cache.
 * Quotes come from the Supabase `stock-price` edge function (Yahoo/Finnhub server-side).
 */

import { canLookup, recordLookup } from "./pro";

export interface StockQuote {
  ticker: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  fetchedAt: number; // timestamp ms
  // Extended market data
  week52High: number | null;
  week52Low: number | null;
  todayOpen: number | null;
  todayHigh: number | null;
  todayLow: number | null;
  todayVolume: number | null;
  avgVolume: number | null;
}

const CACHE_KEY = "dca-price-cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const TICKER_RE = /^[A-Z]{1,5}(\.[A-Z]{1,4})?$/;

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

  if (!TICKER_RE.test(upper)) {
    return { ok: false, error: "Invalid ticker" };
  }

  const cached = getCached(upper);
  if (cached) return { ok: true, quote: cached, fromCache: true };

  if (!canLookup()) {
    return { ok: false, error: "Daily lookup limit reached" };
  }

  try {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!projectUrl || !anonKey) {
      return { ok: false, error: "Missing Supabase URL or key" };
    }

    const resp = await fetch(
      `${projectUrl}/functions/v1/stock-price?ticker=${encodeURIComponent(upper)}`,
      {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      }
    );

    if (!resp.ok) {
      if (resp.status === 401) {
        return { ok: false, error: "Unauthorized — use Supabase anon key in .env" };
      }
      const errData = (await resp.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: errData.error || "Price unavailable" };
    }

    const data = (await resp.json()) as Record<string, unknown>;
    if (typeof data.error === "string") {
      return { ok: false, error: data.error };
    }
    if (typeof data.price !== "number") {
      return { ok: false, error: "Price unavailable" };
    }

    const quote: StockQuote = {
      ticker: String(data.ticker ?? upper),
      price: data.price,
      previousClose: typeof data.previousClose === "number" ? data.previousClose : 0,
      change: typeof data.change === "number" ? data.change : 0,
      changePercent: typeof data.changePercent === "number" ? data.changePercent : 0,
      fetchedAt: Date.now(),
      week52High: typeof data.week52High === "number" ? data.week52High : null,
      week52Low: typeof data.week52Low === "number" ? data.week52Low : null,
      todayOpen: typeof data.todayOpen === "number" ? data.todayOpen : null,
      todayHigh: typeof data.todayHigh === "number" ? data.todayHigh : null,
      todayLow: typeof data.todayLow === "number" ? data.todayLow : null,
      todayVolume: typeof data.todayVolume === "number" ? data.todayVolume : null,
      avgVolume: typeof data.avgVolume === "number" ? data.avgVolume : null,
    };
    setCache(quote);
    recordLookup();
    return { ok: true, quote, fromCache: false };
  } catch {
    return { ok: false, error: "Network error — price unavailable" };
  }
}

/** Read a cached quote without fetching */
export function getCachedQuote(ticker: string): StockQuote | null {
  const cache = readCache();
  return cache[ticker.toUpperCase()] ?? null;
}
