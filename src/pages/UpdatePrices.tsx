import { useState, useMemo } from "react";
import { getHoldings, currencyPrefix, apiTicker, type Holding } from "@/lib/storage";
import { getCachedQuote, type StockQuote } from "@/lib/stock-price";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save, AlertCircle } from "lucide-react";

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

  const setPrice = (id: string, val: string) => {
    setPrices((prev) => ({ ...prev, [id]: val }));
  };

  const hasChanges = useMemo(() => {
    return holdings.some((h) => prices[h.id] !== initialPrices[h.id]);
  }, [holdings, prices, initialPrices]);

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
        changePercent: existing && existing.previousClose > 0
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

  const handleReset = () => {
    setTick((t) => t + 1);
  };

  if (holdings.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <h1 className="text-lg font-semibold tracking-tight font-[family-name:var(--font-heading)]">Update Prices</h1>
        </div>
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">No holdings yet. Add a holding before updating prices.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="mx-auto max-w-2xl px-4 pt-5 pb-3">
        <h1 className="text-lg font-semibold tracking-tight font-[family-name:var(--font-heading)]">Update Prices</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Edit current prices to update market value and gain/loss.
        </p>
      </div>

      {/* Unsaved indicator */}
      {hasChanges && (
        <div className="mx-auto max-w-2xl px-4 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            <span>Unsaved changes</span>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="mx-auto max-w-2xl px-4 hidden md:block">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_5rem_5rem_6.5rem_6.5rem_5rem] gap-x-3 px-1 pb-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
          <span>Ticker</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Avg Cost</span>
          <span className="text-right">Price</span>
          <span className="text-right">Gain/Loss</span>
          <span className="text-right">%</span>
        </div>

        {/* Rows */}
        {holdings.map((h) => {
          const cp = currencyPrefix((h.exchange ?? "US") as any);
          const shares = Number(h.shares);
          const avgCost = Number(h.avg_cost);
          const costBasis = shares * avgCost;
          const priceVal = parseFloat(prices[h.id] || "");
          const hasPrice = !isNaN(priceVal) && priceVal > 0;
          const marketValue = hasPrice ? shares * priceVal : null;
          const gainLoss = marketValue != null ? marketValue - costBasis : null;
          const gainLossPct = gainLoss != null && costBasis > 0
            ? (gainLoss / costBasis) * 100
            : null;
          const isEdited = prices[h.id] !== initialPrices[h.id];

          const glColor = gainLoss != null
            ? gainLoss > 0
              ? "text-primary"
              : gainLoss < 0
                ? "text-destructive"
                : "text-muted-foreground"
            : "text-muted-foreground";

          return (
            <div
              key={h.id}
              className={`grid grid-cols-[1fr_5rem_5rem_6.5rem_6.5rem_5rem] gap-x-3 items-center px-1 py-2 border-b border-border/50 transition-colors ${isEdited ? "bg-accent/40" : ""}`}
            >
              <div>
                <span className="font-semibold text-sm font-[family-name:var(--font-mono)]">{h.ticker}</span>
                {marketValue != null && (
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    MV {cp}{fmt(marketValue)}
                  </span>
                )}
              </div>
              <span className="text-right text-xs text-muted-foreground font-[family-name:var(--font-mono)]">
                {shares.toFixed(4)}
              </span>
              <span className="text-right text-xs text-muted-foreground font-[family-name:var(--font-mono)]">
                {cp}{fmt(avgCost)}
              </span>
              <div className="flex justify-end">
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  className="w-full text-right text-sm font-[family-name:var(--font-mono)] bg-transparent border-b border-input focus:border-ring focus:outline-none py-0.5 px-1 transition-colors placeholder:text-muted-foreground/50"
                  value={prices[h.id] || ""}
                  onChange={(e) => setPrice(h.id, e.target.value)}
                />
              </div>
              <span className={`text-right text-xs font-[family-name:var(--font-mono)] font-medium ${glColor}`}>
                {gainLoss != null
                  ? `${gainLoss >= 0 ? "+" : ""}${cp}${fmt(gainLoss)}`
                  : "—"}
              </span>
              <span className={`text-right text-[11px] font-[family-name:var(--font-mono)] ${glColor}`}>
                {gainLossPct != null
                  ? `${gainLossPct >= 0 ? "+" : ""}${fmtPct(gainLossPct)}%`
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile cards */}
      <div className="mx-auto max-w-2xl px-4 md:hidden space-y-1">
        {holdings.map((h) => {
          const cp = currencyPrefix((h.exchange ?? "US") as any);
          const shares = Number(h.shares);
          const avgCost = Number(h.avg_cost);
          const costBasis = shares * avgCost;
          const priceVal = parseFloat(prices[h.id] || "");
          const hasPrice = !isNaN(priceVal) && priceVal > 0;
          const marketValue = hasPrice ? shares * priceVal : null;
          const gainLoss = marketValue != null ? marketValue - costBasis : null;
          const gainLossPct = gainLoss != null && costBasis > 0
            ? (gainLoss / costBasis) * 100
            : null;
          const isEdited = prices[h.id] !== initialPrices[h.id];

          const glColor = gainLoss != null
            ? gainLoss > 0
              ? "text-primary"
              : gainLoss < 0
                ? "text-destructive"
                : "text-muted-foreground"
            : "text-muted-foreground";

          return (
            <div
              key={h.id}
              className={`rounded-md px-3 py-2.5 border-b border-border/40 transition-colors ${isEdited ? "bg-accent/40" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-sm font-[family-name:var(--font-mono)]">{h.ticker}</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  className="w-28 text-right text-sm font-[family-name:var(--font-mono)] bg-transparent border-b border-input focus:border-ring focus:outline-none py-0.5 px-1 transition-colors placeholder:text-muted-foreground/50"
                  value={prices[h.id] || ""}
                  onChange={(e) => setPrice(h.id, e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground font-[family-name:var(--font-mono)]">
                <span>{shares.toFixed(4)} shares · avg {cp}{fmt(avgCost)}</span>
                <div className={`flex gap-2 font-medium ${glColor}`}>
                  {gainLoss != null ? (
                    <>
                      <span>{gainLoss >= 0 ? "+" : ""}{cp}{fmt(gainLoss)}</span>
                      <span className="text-[10px]">
                        {gainLossPct != null ? `${gainLossPct >= 0 ? "+" : ""}${fmtPct(gainLossPct)}%` : ""}
                      </span>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
              {marketValue != null && (
                <div className="text-[10px] text-muted-foreground/70 mt-0.5 font-[family-name:var(--font-mono)]">
                  MV {cp}{fmt(marketValue)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30">
        <div className="mx-auto max-w-2xl px-4">
          <div className={`flex justify-end gap-2 py-2.5 px-3 rounded-lg transition-all ${hasChanges ? "bg-card/95 backdrop-blur border border-border shadow-lg" : ""}`}>
            {hasChanges && (
              <>
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs">
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset
                </Button>
                <Button size="sm" onClick={handleSave} className="h-8 text-xs">
                  <Save className="mr-1 h-3 w-3" />
                  Save prices
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
