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

    // Try Yahoo Finance first
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;

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

          return new Response(JSON.stringify({
            ticker, price, previousClose, change, changePercent, source: "yahoo",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch {
      // Fall through to Alpha Vantage
    }

    // Fallback: Alpha Vantage
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
