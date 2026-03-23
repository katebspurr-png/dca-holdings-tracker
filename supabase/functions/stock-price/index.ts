// deno-lint-ignore-file
// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchYahoo(ticker: string): Promise<Response | null> {
  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`,
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

function buildJsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const resp = await fetchYahoo(ticker);
    let yahooStatus: number | null = null;
    if (resp) {
      yahooStatus = resp.status;
      const data = await resp.json();
      const chart = data?.chart?.result?.[0];
      if (chart) {
        const meta = chart.meta;
        const price = meta?.regularMarketPrice;
        if (typeof price === "number") {
          const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
          const change = price - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

          const quotes = chart.indicators?.quote?.[0] ?? {};
          const highs: number[] = (quotes.high ?? []).filter((v: number | null) => v != null);
          const lows: number[] = (quotes.low ?? []).filter((v: number | null) => v != null);
          const volumes: number[] = (quotes.volume ?? []).filter((v: number | null) => v != null);
          const opens: number[] = (quotes.open ?? []).filter((v: number | null) => v != null);

          return buildJsonResponse({
            ticker,
            price,
            previousClose,
            change,
            changePercent,
            source: "yahoo",
            week52High: meta.fiftyTwoWeekHigh ?? null,
            week52Low: meta.fiftyTwoWeekLow ?? null,
            todayOpen: opens.at(-1) ?? null,
            todayHigh: highs.at(-1) ?? null,
            todayLow: lows.at(-1) ?? null,
            todayVolume: volumes.at(-1) ?? null,
            avgVolume: meta.averageDailyVolume3Month ?? null,
          });
        }
      }
      if (yahooStatus !== 200) {
        console.error("stock-price: Yahoo failed", { ticker, status: yahooStatus });
      }
    }

    const finnhubResult = await fetchFinnhub(ticker);
    if (finnhubResult) {
      return buildJsonResponse(finnhubResult);
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