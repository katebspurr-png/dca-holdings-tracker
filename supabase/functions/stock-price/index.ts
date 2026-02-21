// deno-lint-ignore-file
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticker = url.searchParams.get("ticker")?.toUpperCase();

    if (!ticker || !/^[A-Z]{1,5}(\.[A-Z]{1,4})?$/.test(ticker)) {
      return new Response(JSON.stringify({ error: "Invalid ticker" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Yahoo Finance with 1-year daily data for extended market info
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;

    let yahooOk = false;
    try {
      const resp = await fetch(yahooUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (resp.ok) {
        const data = await resp.json();
        const chart = data?.chart?.result?.[0];
        if (chart) {
          const meta = chart.meta;
          const price = meta.regularMarketPrice;
          const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
          const change = price - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

          // Extract OHLCV from indicators
          const quotes = chart.indicators?.quote?.[0] ?? {};
          const closes: number[] = (quotes.close ?? []).filter((v: number | null) => v != null);
          const highs: number[] = (quotes.high ?? []).filter((v: number | null) => v != null);
          const lows: number[] = (quotes.low ?? []).filter((v: number | null) => v != null);
          const volumes: number[] = (quotes.volume ?? []).filter((v: number | null) => v != null);
          const opens: number[] = (quotes.open ?? []).filter((v: number | null) => v != null);

          // 52-week high/low from the full year of data
          const week52High = highs.length > 0 ? Math.max(...highs) : null;
          const week52Low = lows.length > 0 ? Math.min(...lows) : null;

          // Today's OHLC (last entry)
          const todayOpen = opens.length > 0 ? opens[opens.length - 1] : null;
          const todayHigh = highs.length > 0 ? highs[highs.length - 1] : null;
          const todayLow = lows.length > 0 ? lows[lows.length - 1] : null;
          const todayVolume = volumes.length > 0 ? volumes[volumes.length - 1] : null;

          // Average daily volume (last 30 trading days)
          const recentVolumes = volumes.slice(-30);
          const avgVolume = recentVolumes.length > 0
            ? recentVolumes.reduce((a: number, b: number) => a + b, 0) / recentVolumes.length
            : null;

          return new Response(JSON.stringify({
            ticker, price, previousClose, change, changePercent, source: "yahoo",
            week52High, week52Low,
            todayOpen, todayHigh, todayLow, todayVolume,
            avgVolume,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch {
      // Fall through to Alpha Vantage
    }

    // Fallback: Alpha Vantage (no extended data)
    try {
      const avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=demo`;
      const avResp = await fetch(avUrl);
      if (avResp.ok) {
        const avData = await avResp.json();
        const quote = avData["Global Quote"];
        if (quote && quote["05. price"]) {
          return new Response(JSON.stringify({
            ticker,
            price: parseFloat(quote["05. price"]),
            previousClose: parseFloat(quote["08. previous close"] || "0"),
            change: parseFloat(quote["09. change"] || "0"),
            changePercent: parseFloat((quote["10. change percent"] || "0").replace("%", "")),
            source: "alphavantage",
            week52High: null, week52Low: null,
            todayOpen: null, todayHigh: null, todayLow: null, todayVolume: null,
            avgVolume: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch {
      // Fall through
    }

    return new Response(JSON.stringify({ error: "Price unavailable" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});