import { useState, useMemo } from "react";
import { getHoldings, currencyPrefix, apiTicker, type Holding } from "@/lib/storage";
import { getCachedQuote, type StockQuote } from "@/lib/stock-price";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RotateCcw, Save } from "lucide-react";

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

  // Initialize prices from cache
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

  // Sync when initialPrices change (e.g. after save/reset)
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
        <header className="border-b border-border">
          <div className="mx-auto max-w-4xl px-6 py-5">
            <h1 className="text-2xl font-bold tracking-tight">Update Market Prices</h1>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="text-muted-foreground">No holdings yet. Add a holding before updating prices.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">Update Market Prices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update current market prices for your holdings. These prices are used to calculate market value and unrealized gain/loss.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-5">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right w-32">Current Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Gain/Loss ($)</TableHead>
                  <TableHead className="text-right">Gain/Loss (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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

                  const colorClass = gainLoss != null
                    ? gainLoss > 0
                      ? "text-primary"
                      : gainLoss < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    : "text-muted-foreground";

                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-mono font-semibold">{h.ticker}</TableCell>
                      <TableCell className="text-right font-mono">{shares.toFixed(4)}</TableCell>
                      <TableCell className="text-right font-mono">{cp}{fmt(avgCost)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          className="w-28 ml-auto text-right font-mono"
                          value={prices[h.id] || ""}
                          onChange={(e) => setPrice(h.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {marketValue != null ? `${cp}${fmt(marketValue)}` : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${colorClass}`}>
                        {gainLoss != null
                          ? `${gainLoss >= 0 ? "+" : ""}${cp}${fmt(gainLoss)}`
                          : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${colorClass}`}>
                        {gainLossPct != null
                          ? `${gainLossPct >= 0 ? "+" : ""}${fmtPct(gainLossPct)}%`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset changes
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-1.5 h-4 w-4" />
            Save price updates
          </Button>
        </div>
      </main>
    </div>
  );
}