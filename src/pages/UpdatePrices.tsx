import { useState, useMemo, useCallback } from "react";
import { getHoldings, currencyPrefix, apiTicker, type Holding } from "@/lib/storage";
import { getCachedQuote, type StockQuote } from "@/lib/stock-price";
import { useToast } from "@/hooks/use-toast";
import { useRefreshPrices, formatLastRefreshed } from "@/hooks/use-refresh-prices";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save, RefreshCw } from "lucide-react";

const CACHE_KEY = "dca-price-cache";

function readPriceCache(): Record<string, StockQuote> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePriceCache(cache: Record<string, StockQuote>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getCachedPriceForHolding(h: Holding): number | null {
  const key = apiTicker(h.ticker, (h.exchange ?? "US") as any).toUpperCase();
  const q = getCachedQuote(key);
  return q ? q.price : null;
}

/* ── Computed row data ─────────────────────────────────── */
function computeRow(h: Holding, priceStr: string) {
  const shares = Number(h.shares);
  const avgCost = Number(h.avg_cost);
  const costBasis = shares * avgCost;
  const priceVal = parseFloat(priceStr || "");
  const hasPrice = !isNaN(priceVal) && priceVal > 0;
  const marketValue = hasPrice ? shares * priceVal : null;
  const gainLoss = marketValue != null ? marketValue - costBasis : null;
  const gainLossPct =
    gainLoss != null && costBasis > 0 ? (gainLoss / costBasis) * 100 : null;
  return { shares, avgCost, costBasis, priceVal, hasPrice, marketValue, gainLoss, gainLossPct };
}

function glColor(val: number | null) {
  if (val == null) return "text-stitch-muted";
  if (val > 0) return "text-stitch-accent";
  if (val < 0) return "text-destructive";
  return "text-stitch-muted";
}

/* ── Page ──────────────────────────────────────────────── */
export default function UpdatePrices() {
  const { toast } = useToast();
  const [tick, setTick] = useState(0);

  const holdings = useMemo(() => {
    void tick;
    return getHoldings().sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [tick]);

  const initialPrices = useMemo(() => {
    const map: Record<string, string> = {};
    holdings.forEach((h) => {
      const cached = getCachedPriceForHolding(h);
      map[h.id] = cached != null ? String(cached) : "";
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, tick]);

  const [prices, setPrices] = useState<Record<string, string>>(initialPrices);

  const [lastInitial, setLastInitial] = useState(initialPrices);
  if (initialPrices !== lastInitial) {
    setPrices(initialPrices);
    setLastInitial(initialPrices);
  }

  const setPrice = useCallback((id: string, val: string) => {
    setPrices((prev) => ({ ...prev, [id]: val }));
  }, []);

  const hasChanges = useMemo(
    () => holdings.some((h) => prices[h.id] !== initialPrices[h.id]),
    [holdings, prices, initialPrices]
  );

  const editedCount = useMemo(
    () => holdings.filter((h) => prices[h.id] !== initialPrices[h.id]).length,
    [holdings, prices, initialPrices]
  );

  /* ── Totals ──────────────────────────────────────────── */
  const totals = useMemo(() => {
    let totalMV = 0;
    let totalCost = 0;
    let hasMV = false;
    holdings.forEach((h) => {
      const r = computeRow(h, prices[h.id]);
      totalCost += r.costBasis;
      if (r.marketValue != null) {
        totalMV += r.marketValue;
        hasMV = true;
      } else {
        totalMV += r.costBasis;
      }
    });
    const pnl = hasMV ? totalMV - totalCost : null;
    const pnlPct = pnl != null && totalCost > 0 ? (pnl / totalCost) * 100 : null;
    return { totalMV: hasMV ? totalMV : null, pnl, pnlPct };
  }, [holdings, prices]);

  /* ── Save / Reset ────────────────────────────────────── */
  const handleSave = () => {
    const cache = readPriceCache();
    holdings.forEach((h) => {
      const val = parseFloat(prices[h.id]);
      if (isNaN(val) || val <= 0) return;
      const key = apiTicker(h.ticker, (h.exchange ?? "US") as any).toUpperCase();
      const existing = cache[key];
      cache[key] = {
        ticker: key,
        price: val,
        previousClose: existing?.previousClose ?? val,
        change: existing ? val - existing.previousClose : 0,
        changePercent:
          existing && existing.previousClose > 0
            ? ((val - existing.previousClose) / existing.previousClose) * 100
            : 0,
        fetchedAt: Date.now(),
        week52High: existing?.week52High ?? null,
        week52Low: existing?.week52Low ?? null,
        todayOpen: existing?.todayOpen ?? null,
        todayHigh: existing?.todayHigh ?? null,
        todayLow: existing?.todayLow ?? null,
        todayVolume: existing?.todayVolume ?? null,
        avgVolume: existing?.avgVolume ?? null,
      };
    });
    writePriceCache(cache);
    toast({ title: "Market prices updated" });
    setTick((t) => t + 1);
  };

  const handleReset = () => setTick((t) => t + 1);

  const { refreshing, refreshAll, lastRefreshed } = useRefreshPrices();

  const handleRefreshAll = useCallback(async () => {
    const result = await refreshAll(() => setTick((t) => t + 1));
    if (result.failed.length === 0) {
      toast({ title: "Market prices refreshed" });
    } else if (result.success > 0) {
      toast({
        title: "Some prices were refreshed, but a few tickers could not be updated",
        description: `Failed: ${result.failed.join(", ")}`,
      });
    } else {
      toast({ title: "Could not refresh prices", variant: "destructive" });
    }
  }, [refreshAll, toast]);

  /* ── Empty state ─────────────────────────────────────── */
  if (holdings.length === 0) {
    return (
      <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
        <header className="mb-6 px-4 pt-12 text-center sm:px-6 md:px-8">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">Update Market Prices</h1>
        </header>
        <main className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 md:px-8">
          <p className="text-sm text-stitch-muted">No holdings yet. Add a holding before updating prices.</p>
        </main>
      </div>
    );
  }


  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1080px] px-4 pb-5 pt-10 sm:px-6 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Update Market Prices</h1>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshAll}
                disabled={refreshing}
                className="h-8 gap-1.5 border-stitch-border bg-stitch-pill text-xs text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh Prices"}
              </Button>
            </div>
            <p className="mt-0.5 text-[13px] text-stitch-muted">
              Quickly refresh the current price for your holdings.
              {lastRefreshed && (
                <span className="ml-2 text-[11px] opacity-70">
                  Last refreshed {formatLastRefreshed(lastRefreshed)}
                </span>
              )}
            </p>
          </div>

          {/* Live totals */}
          <div className="flex items-baseline gap-5 text-right">
            {totals.totalMV != null && (
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-stitch-muted">Market Value</span>
                <span className="font-[family-name:var(--font-mono)] text-base font-semibold tabular-nums text-white">
                  ${fmt(totals.totalMV)}
                </span>
              </div>
            )}
            {totals.pnl != null && (
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-stitch-muted">Unrealized P/L</span>
                <span
                  className={`text-base font-semibold font-[family-name:var(--font-mono)] tabular-nums ${glColor(totals.pnl)}`}
                >
                  {totals.pnl >= 0 ? "+" : ""}${fmt(totals.pnl)}
                  {totals.pnlPct != null && (
                    <span className="text-xs font-normal ml-1.5 opacity-70">
                      {totals.pnlPct >= 0 ? "+" : ""}{fmtPct(totals.pnlPct)}%
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop watchlist ─────────────────────────────── */}
      <div className="mx-auto max-w-[1080px] px-5 hidden md:block">
        {/* Column headers */}
        <div className="grid grid-cols-[minmax(80px,1.2fr)_5.5rem_5.5rem_7rem_7rem_5rem] gap-x-4 px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-stitch-muted/70 border-b border-stitch-border">
          <span>Ticker</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Avg Cost</span>
          <span className="text-right">Price</span>
          <span className="text-right">Gain/Loss</span>
          <span className="text-right">%</span>
        </div>

        {holdings.map((h) => {
          const cp = currencyPrefix((h.exchange ?? "US") as any);
          const r = computeRow(h, prices[h.id]);
          const isEdited = prices[h.id] !== initialPrices[h.id];
          const color = glColor(r.gainLoss);

          return (
            <div
              key={h.id}
              className={`group grid grid-cols-[minmax(80px,1.2fr)_5.5rem_5.5rem_7rem_7rem_5rem] gap-x-4 items-center px-2 py-[9px] border-b border-stitch-border/40 transition-colors hover:bg-stitch-pill/35 ${
                isEdited ? "bg-stitch-accent/15" : ""
              }`}
            >
              {/* Ticker + MV */}
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="truncate text-[15px] font-bold tracking-tight text-white font-[family-name:var(--font-mono)]">
                  {h.ticker}
                </span>
                {r.marketValue != null && (
                  <span className="text-[10px] text-stitch-muted/60 font-[family-name:var(--font-mono)] tabular-nums whitespace-nowrap">
                    {cp}{fmt(r.marketValue)}
                  </span>
                )}
                {isEdited && (
                  <span className="text-[9px] text-stitch-accent/80 bg-stitch-accent/20 rounded px-1 py-px">
                    edited
                  </span>
                )}
              </div>

              {/* Shares */}
              <span className="text-right text-[12px] text-stitch-muted font-[family-name:var(--font-mono)] tabular-nums">
                {r.shares.toFixed(4)}
              </span>

              {/* Avg cost */}
              <span className="text-right text-[12px] text-stitch-muted font-[family-name:var(--font-mono)] tabular-nums">
                {cp}{fmt(r.avgCost)}
              </span>

              {/* Editable price */}
              <div className="flex justify-end">
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  className="w-full text-right text-[13px] font-medium font-[family-name:var(--font-mono)] tabular-nums bg-stitch-pill/50 rounded-md border border-stitch-border/60 focus:border-stitch-accent focus:bg-stitch-pill focus:ring-1 focus:ring-stitch-accent/30 outline-none py-1 px-2 transition-all placeholder:text-stitch-muted/40"
                  value={prices[h.id] || ""}
                  onChange={(e) => setPrice(h.id, e.target.value)}
                />
              </div>

              {/* Gain/loss $ */}
              <span
                className={`text-right text-[12px] font-medium font-[family-name:var(--font-mono)] tabular-nums ${color}`}
              >
                {r.gainLoss != null
                  ? `${r.gainLoss >= 0 ? "+" : ""}${cp}${fmt(r.gainLoss)}`
                  : "—"}
              </span>

              {/* Gain/loss % */}
              <span
                className={`text-right text-[11px] font-[family-name:var(--font-mono)] tabular-nums ${color} opacity-80`}
              >
                {r.gainLossPct != null
                  ? `${r.gainLossPct >= 0 ? "+" : ""}${fmtPct(r.gainLossPct)}%`
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Mobile cards ──────────────────────────────────── */}
      <div className="mx-auto max-w-[1080px] px-4 md:hidden space-y-px">
        {holdings.map((h) => {
          const cp = currencyPrefix((h.exchange ?? "US") as any);
          const r = computeRow(h, prices[h.id]);
          const isEdited = prices[h.id] !== initialPrices[h.id];
          const color = glColor(r.gainLoss);

          return (
            <div
              key={h.id}
              className={`px-3 py-3 border-b border-stitch-border/30 transition-colors ${
                isEdited ? "bg-stitch-accent/15" : ""
              }`}
            >
              {/* Top row: ticker + price input */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold tracking-tight text-white font-[family-name:var(--font-mono)]">
                    {h.ticker}
                  </span>
                  {isEdited && (
                    <span className="text-[9px] text-stitch-accent/80 bg-stitch-accent/20 rounded px-1 py-px">
                      edited
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  className="w-28 text-right text-[13px] font-medium font-[family-name:var(--font-mono)] tabular-nums bg-stitch-pill/50 rounded-md border border-stitch-border/60 focus:border-stitch-accent focus:bg-stitch-pill focus:ring-1 focus:ring-stitch-accent/30 outline-none py-1 px-2 transition-all placeholder:text-stitch-muted/40"
                  value={prices[h.id] || ""}
                  onChange={(e) => setPrice(h.id, e.target.value)}
                />
              </div>

              {/* Secondary row */}
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-stitch-muted/70 font-[family-name:var(--font-mono)] tabular-nums">
                  {r.shares.toFixed(4)} shares · avg {cp}{fmt(r.avgCost)}
                </span>
                <div className={`flex items-baseline gap-1.5 ${color}`}>
                  {r.gainLoss != null ? (
                    <>
                      <span className="text-[11px] font-medium font-[family-name:var(--font-mono)] tabular-nums">
                        {r.gainLoss >= 0 ? "+" : ""}{cp}{fmt(r.gainLoss)}
                      </span>
                      <span className="text-[10px] font-[family-name:var(--font-mono)] tabular-nums opacity-70">
                        {r.gainLossPct != null
                          ? `${r.gainLossPct >= 0 ? "+" : ""}${fmtPct(r.gainLossPct)}%`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-stitch-muted">—</span>
                  )}
                </div>
              </div>

              {/* Market value */}
              {r.marketValue != null && (
                <div className="text-[10px] text-stitch-muted/50 mt-0.5 font-[family-name:var(--font-mono)] tabular-nums">
                  MV {cp}{fmt(r.marketValue)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Sticky save bar ───────────────────────────────── */}
      {hasChanges && (
        <div className="fixed bottom-16 left-0 right-0 z-30 animate-in slide-in-from-bottom-2 duration-200">
          <div className="mx-auto max-w-[1080px] px-5">
            <div className="flex items-center justify-between rounded-2xl border border-stitch-border bg-stitch-card/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
              <span className="text-xs text-stitch-muted">
                {editedCount} price{editedCount !== 1 ? "s" : ""} edited
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs text-stitch-muted hover:bg-stitch-pill/50 hover:text-white"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-8 bg-stitch-accent text-xs font-semibold text-black hover:bg-stitch-accent/90"
                >
                  <Save className="mr-1 h-3 w-3" />
                  Save prices
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
