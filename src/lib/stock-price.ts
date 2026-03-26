/**
 * Stock price fetching with 5-minute cache.
 * Prefers the Supabase `stock-price` edge function (server-side Yahoo + Finnhub fallback)
 * when configured; falls back to direct Yahoo chart API in the browser.
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

/** TSX tickers use `.TO` (e.g. `SHOP.TO`); Yahoo chart API accepts these symbols. */
const TICKER_RE = /^[A-Z0-9]{1,6}(\.[A-Z]{1,4})?$/;

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

function n(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/** Last non-null close from OHLC arrays (fallback when meta has no live price). */
function lastClose(chart: Record<string, unknown>): number | null {
  const indicators = chart.indicators as { quote?: Array<{ close?: (number | null)[] }> } | undefined;
  const closes = indicators?.quote?.[0]?.close;
  if (!Array.isArray(closes)) return null;
  for (let i = closes.length - 1; i >= 0; i--) {
    const v = n(closes[i]);
    if (v != null) return v;
  }
  return null;
}

/** Map Supabase edge `stock-price` JSON to StockQuote (same fields as Yahoo path). */
function quoteFromEdgePayload(upper: string, data: Record<string, unknown>): StockQuote | null {
  const price = n(data.price);
  if (price == null || price <= 0) return null;

  const previousClose = n(data.previousClose) ?? price;
  const change = n(data.change) ?? price - previousClose;
  const changePercent =
    n(data.changePercent) ?? (previousClose !== 0 ? (change / previousClose) * 100 : 0);

  return {
    ticker: (typeof data.ticker === "string" ? data.ticker : upper).toUpperCase(),
    price,
    previousClose,
    change,
    changePercent,
    fetchedAt: Date.now(),
    week52High: n(data.week52High),
    week52Low: n(data.week52Low),
    todayOpen: n(data.todayOpen),
    todayHigh: n(data.todayHigh),
    todayLow: n(data.todayLow),
    todayVolume: n(data.todayVolume),
    avgVolume: n(data.avgVolume),
  };
}

/**
 * Edge Functions with verify_jwt only accept the legacy anon JWT (`eyJ...`).
 * New `sb_publishable_*` keys are not JWTs and produce 401 on `/functions/v1/*`.
 * Prefer `VITE_SUPABASE_ANON_KEY` from Dashboard → Settings → API (anon public).
 */
function supabaseJwtForEdge(): string | null {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const pub = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (anon?.startsWith("eyJ")) return anon;
  if (pub?.startsWith("eyJ")) return pub;
  return null;
}

async function fetchStockPriceViaEdge(upper: string): Promise<StockQuote | null> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  if (!base) return null;

  const jwt = supabaseJwtForEdge();
  const anyPublicKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if (!jwt && !anyPublicKey) return null;

  const headers: Record<string, string> = {};
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
    headers.apikey = jwt;
  } else if (anyPublicKey) {
    // With [functions.stock-price] verify_jwt = false, only apikey is needed (publishable keys are not JWTs).
    headers.apikey = anyPublicKey;
  }

  const url = `${base}/functions/v1/stock-price?ticker=${encodeURIComponent(upper)}`;
  try {
    const resp = await fetch(url, { headers });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Record<string, unknown>;
    if (data.error) return null;
    return quoteFromEdgePayload(upper, data);
  } catch {
    return null;
  }
}

export type FetchResult =
  | { ok: true; quote: StockQuote; fromCache: boolean }
  | { ok: false; error: string };

export type FetchStockPriceOptions = {
  /** When true, skip the 5-minute cache read so explicit refresh always hits the network. */
  bypassCache?: boolean;
};

export async function fetchStockPrice(
  ticker: string,
  options?: FetchStockPriceOptions
): Promise<FetchResult> {
  const upper = ticker.toUpperCase();

  if (!TICKER_RE.test(upper)) {
    return { ok: false, error: "Invalid ticker" };
  }

  if (!options?.bypassCache) {
    const cached = getCached(upper);
    if (cached) return { ok: true, quote: cached, fromCache: true };
  }

  if (!canLookup()) {
    return { ok: false, error: "Daily lookup limit reached" };
  }

  try {
    const edgeQuote = await fetchStockPriceViaEdge(upper);
    if (edgeQuote) {
      setCache(edgeQuote);
      recordLookup();
      return { ok: true, quote: edgeQuote, fromCache: false };
    }

    const yahooCandidates = upper.endsWith(".TO")
      ? [upper, upper.slice(0, -3) + ".V"]
      : [upper];

    for (const yahooSym of yahooCandidates) {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=5d`;
      const resp = await fetch(yahooUrl);

      if (!resp.ok) continue;

      const data = (await resp.json()) as {
        chart?: { result?: Array<Record<string, unknown>>; error?: { description?: string } };
      };

      if (data.chart?.error?.description) continue;

      const chart = data.chart?.result?.[0];
      if (!chart) continue;

      const meta = chart.meta as Record<string, unknown> | undefined;
      if (!meta) continue;

      const price =
        n(meta.regularMarketPrice) ??
        n(meta.regularMarketPreviousClose) ??
        lastClose(chart);

      if (price == null || price <= 0) continue;

      const previousClose =
        n(meta.chartPreviousClose) ??
        n(meta.previousClose) ??
        n(meta.regularMarketPreviousClose) ??
        price;

      const change = price - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      const quote: StockQuote = {
        ticker: upper,
        price,
        previousClose,
        change,
        changePercent,
        fetchedAt: Date.now(),
        week52High: n(meta.fiftyTwoWeekHigh),
        week52Low: n(meta.fiftyTwoWeekLow),
        todayOpen: n(meta.regularMarketOpen),
        todayHigh: n(meta.regularMarketDayHigh),
        todayLow: n(meta.regularMarketDayLow),
        todayVolume: n(meta.regularMarketVolume),
        avgVolume: n(meta.averageDailyVolume10Day) ?? n(meta.averageDailyVolume3Month),
      };

      setCache(quote);
      recordLookup();
      return { ok: true, quote, fromCache: false };
    }

    return { ok: false, error: "Price unavailable" };
  } catch {
    return { ok: false, error: "Network error — price unavailable" };
  }
}

/** Read a cached quote without fetching */
export function getCachedQuote(ticker: string): StockQuote | null {
  const cache = readCache();
  return cache[ticker.toUpperCase()] ?? null;
}
