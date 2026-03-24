// deno-lint-ignore-file
// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function n(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/** Last non-null close from OHLC (TSX / thin names often lack regularMarketPrice in meta). */
function lastCloseFromChart(chart: Record<string, unknown>): number | null {
  const indicators = chart.indicators as { quote?: Array<{ close?: (number | null)[] }> } | undefined;
  const closes = indicators?.quote?.[0]?.close;
  if (!Array.isArray(closes)) return null;
  for (let i = closes.length - 1; i >= 0; i--) {
    const v = n(closes[i]);
    if (v != null) return v;
  }
  return null;
}

async function fetchYahoo(ticker: string, range: string): Promise<Response | null> {
  const enc = encodeURIComponent(ticker);
  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=${range}`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=${range}`,
  ];

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://finance.yahoo.com",
    "Referer": "https://finance.yahoo.com",
  };

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const resp = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) return resp;
    } catch {
      clearTimeout(timeout);
    }
  }
  return null;
}

/** Match client-side Yahoo parsing so TSX (.TO) works when live price is missing from meta. */
function quoteFromYahooChart(ticker: string, chart: Record<string, unknown>): Record<string, unknown> | null {
  const meta = chart.meta as Record<string, unknown> | undefined;
  if (!meta) return null;

  const price =
    n(meta.regularMarketPrice) ??
    n(meta.regularMarketPreviousClose) ??
    lastCloseFromChart(chart);

  if (price == null || price <= 0) return null;

  const previousClose =
    n(meta.chartPreviousClose) ??
    n(meta.previousClose) ??
    n(meta.regularMarketPreviousClose) ??
    price;

  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  const quotes = chart.indicators?.quote?.[0] ?? {};
  const highs: number[] = (quotes.high ?? []).filter((v: number | null) => v != null);
  const lows: number[] = (quotes.low ?? []).filter((v: number | null) => v != null);
  const volumes: number[] = (quotes.volume ?? []).filter((v: number | null) => v != null);
  const opens: number[] = (quotes.open ?? []).filter((v: number | null) => v != null);

  return {
    ticker,
    price,
    previousClose,
    change,
    changePercent,
    source: "yahoo",
    week52High: meta.fiftyTwoWeekHigh ?? null,
    week52Low: meta.fiftyTwoWeekLow ?? null,
    todayOpen: n(meta.regularMarketOpen) ?? opens.at(-1) ?? null,
    todayHigh: n(meta.regularMarketDayHigh) ?? highs.at(-1) ?? null,
    todayLow: n(meta.regularMarketDayLow) ?? lows.at(-1) ?? null,
    todayVolume: n(meta.regularMarketVolume) ?? volumes.at(-1) ?? null,
    avgVolume: meta.averageDailyVolume10Day ?? meta.averageDailyVolume3Month ?? null,
  };
}

function buildJsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Yahoo uses `.TO` for TSX and `.V` for TSX Venture. Holdings marked "TSX" often need `.V`.
 */
function tsxVentureAlternate(ticker: string): string | null {
  if (ticker.endsWith(".TO")) return ticker.slice(0, -3) + ".V";
  return null;
}

/** Yahoo (two ranges) then Finnhub for one symbol. */
async function resolveQuote(ticker: string): Promise<Record<string, unknown> | null> {
  let yahooStatus: number | null = null;
  let quoteBody: Record<string, unknown> | null = null;

  for (const range of ["5d", "1mo"] as const) {
    const resp = await fetchYahoo(ticker, range);
    if (!resp) continue;
    yahooStatus = resp.status;
    let data: { chart?: { result?: Array<Record<string, unknown>> } };
    try {
      data = await resp.json();
    } catch {
      continue;
    }
    const chart = data?.chart?.result?.[0];
    if (chart) {
      quoteBody = quoteFromYahooChart(ticker, chart);
      if (quoteBody) break;
    }
    if (yahooStatus !== 200) {
      console.error("stock-price: Yahoo failed", { ticker, status: yahooStatus, range });
    }
  }

  if (quoteBody) return quoteBody;

  const finnhubResult = await fetchFinnhub(ticker);
  if (finnhubResult) return finnhubResult;

  return null;
}

async function fetchFinnhub(ticker: string): Promise<Record<string, unknown> | null> {
  const apiKey = Deno.env.get("FINNHUB_API_KEY");
  if (!apiKey) return null;

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json();
    const c = data?.c;
    if (typeof c !== "number" || c === 0) return null;
    const pc = data?.pc ?? c;
    const d = typeof data?.d === "number" ? data.d : c - pc;
    const dp = typeof data?.dp === "number" ? data.dp : (pc ? ((c - pc) / pc) * 100 : 0);
    return {
      ticker,
      price: c,
      previousClose: pc,
      change: d,
      changePercent: dp,
      source: "finnhub",
      week52High: null,
      week52Low: null,
      todayOpen: typeof data?.o === "number" ? data.o : null,
      todayHigh: typeof data?.h === "number" ? data.h : null,
      todayLow: typeof data?.l === "number" ? data.l : null,
      todayVolume: null,
      avgVolume: null,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticker = url.searchParams.get("ticker")?.toUpperCase();

    if (!ticker || !/^[A-Z0-9]{1,6}(\.[A-Z]{1,4})?$/.test(ticker)) {
      return new Response(JSON.stringify({ error: "Invalid ticker" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let quoteBody = await resolveQuote(ticker);
    if (!quoteBody) {
      const venture = tsxVentureAlternate(ticker);
      if (venture) {
        quoteBody = await resolveQuote(venture);
      }
    }

    if (quoteBody) {
      return buildJsonResponse(quoteBody);
    }

    return new Response(JSON.stringify({ error: "Price unavailable (try again later)" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stock-price: Internal error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});