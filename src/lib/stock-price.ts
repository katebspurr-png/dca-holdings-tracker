/**
 * Stock price fetching with 5-minute cache.
 * Quotes are fetched directly from Yahoo Finance chart API in the browser (no edge function).
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
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upper)}?interval=1d&range=5d`;
    const resp = await fetch(yahooUrl);

    if (!resp.ok) {
      return { ok: false, error: "Price unavailable" };
    }

    const data = (await resp.json()) as {
      chart?: { result?: Array<Record<string, unknown>>; error?: { description?: string } };
    };

    if (data.chart?.error?.description) {
      return { ok: false, error: "Price unavailable" };
    }

    const chart = data.chart?.result?.[0];
    if (!chart) {
      return { ok: false, error: "Price unavailable" };
    }

    const meta = chart.meta as Record<string, unknown> | undefined;
    if (!meta) {
      return { ok: false, error: "Price unavailable" };
    }

    const price =
      n(meta.regularMarketPrice) ??
      n(meta.regularMarketPreviousClose) ??
      lastClose(chart);

    if (price == null || price <= 0) {
      return { ok: false, error: "Price unavailable" };
    }

    const previousClose =
      n(meta.chartPreviousClose) ??
      n(meta.previousClose) ??
      n(meta.regularMarketPreviousClose) ??
      price;

    const change = price - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    const quote: StockQuote = {
      ticker: String(meta.symbol ?? upper).toUpperCase(),
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
  } catch {
    return { ok: false, error: "Network error — price unavailable" };
  }
}

/** Read a cached quote without fetching */
export function getCachedQuote(ticker: string): StockQuote | null {
  const cache = readCache();
  return cache[ticker.toUpperCase()] ?? null;
}
