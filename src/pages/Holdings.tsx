import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2,
  TrendingDown, TrendingUp, DollarSign, FileSpreadsheet,
  ChevronRight, ChevronDown, RefreshCw, Briefcase, ArrowUpDown,
} from "lucide-react";
import { useRefreshPrices, formatLastRefreshed } from "@/hooks/use-refresh-prices";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import CsvImportDialog from "@/components/CsvImportDialog";
import {
  getHoldings, addHolding, editHolding, removeHolding,
  getScenariosForHolding,
  type Holding, type Scenario, currencyPrefix, exchangeLabel, apiTicker,
} from "@/lib/storage";
import { fetchStockPrice, getCachedQuote, type StockQuote } from "@/lib/stock-price";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SORT_KEY = "dca-holdings-sort";
type SortMode = "az" | "position" | "loss" | "gain";

const SORT_LABELS: Record<SortMode, string> = {
  az: "A → Z",
  position: "Largest Position",
  loss: "Biggest Loss",
  gain: "Biggest Gain",
};

const CACHE_KEY = "dca-price-cache";

function readPriceCache(): Record<string, StockQuote> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getCachedPrice(ticker: string, exchange: string): number | null {
  const cache = readPriceCache();
  const key = apiTicker(ticker, exchange as any).toUpperCase();
  const entry = cache[key];
  return entry ? entry.price : null;
}

function getCachedQuoteForHolding(ticker: string, exchange: string): StockQuote | null {
  const key = apiTicker(ticker, exchange as any).toUpperCase();
  return getCachedQuote(key);
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toFixed(0);
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Holdings() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);
  const [tick, setTick] = useState(0);
  const [csvOpen, setCsvOpen] = useState(false);
  const { refreshing: refreshingAll, refreshAll, lastRefreshed } = useRefreshPrices();
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    return (localStorage.getItem(SORT_KEY) as SortMode) || "az";
  });
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const refresh = () => setTick((t) => t + 1);

  const holdings = getHoldings();

  // Live prices from cache
  const livePrices = useMemo(() => {
    const prices: Record<string, number | null> = {};
    holdings.forEach((h) => {
      prices[h.id] = getCachedPrice(h.ticker, h.exchange ?? "US");
    });
    return prices;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, tick]);

  // Latest DCA scenario per holding
  const latestDca = useMemo(() => {
    const map: Record<string, Scenario | null> = {};
    holdings.forEach((h) => {
      const scenarios = getScenariosForHolding(h.id);
      map[h.id] = scenarios.length > 0 ? scenarios[0] : null;
    });
    return map;
  }, [holdings, tick]);

  // P&L calculation
  const getPnl = (h: Holding) => {
    const price = livePrices[h.id];
    if (price == null) return null;
    const pnl = (price - h.avg_cost) * h.shares;
    const pnlPct = h.avg_cost > 0 ? ((price - h.avg_cost) / h.avg_cost) * 100 : 0;
    return { pnl, pnlPct, price };
  };

  // Sorting
  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings];
    switch (sortMode) {
      case "az":
        sorted.sort((a, b) => a.ticker.localeCompare(b.ticker));
        break;
      case "position":
        sorted.sort((a, b) => (b.shares * b.avg_cost) - (a.shares * a.avg_cost));
        break;
      case "loss": {
        sorted.sort((a, b) => {
          const pa = getPnl(a);
          const pb = getPnl(b);
          return (pa?.pnl ?? 0) - (pb?.pnl ?? 0);
        });
        break;
      }
      case "gain": {
        sorted.sort((a, b) => {
          const pa = getPnl(a);
          const pb = getPnl(b);
          return (pb?.pnl ?? 0) - (pa?.pnl ?? 0);
        });
        break;
      }
    }
    return sorted;
  }, [holdings, sortMode, livePrices]);

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode);
    localStorage.setItem(SORT_KEY, mode);
  };

  // ── Portfolio dashboard metrics ──────────────────────────────
  const totalHoldingsCount = holdings.length;
  const totalShares = holdings.reduce((sum, h) => sum + Number(h.shares), 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + Number(h.shares) * Number(h.avg_cost), 0);
  const weightedAvgCost = totalShares > 0 ? totalCostBasis / totalShares : 0;

  // Holdings sorted by cost basis for summary table
  const holdingsByCostBasis = useMemo(() => {
    return [...holdings]
      .map((h) => ({ ...h, costBasis: Number(h.shares) * Number(h.avg_cost) }))
      .sort((a, b) => b.costBasis - a.costBasis);
  }, [holdings]);

  // ── Portfolio summary ──────────────────────────────────────
  const usdHoldings = holdings.filter((h) => (h.exchange ?? "US") === "US");
  const cadHoldings = holdings.filter((h) => (h.exchange ?? "US") === "TSX");
  const totalUsdInvested = usdHoldings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const totalCadInvested = cadHoldings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const hasMixed = totalUsdInvested > 0 && totalCadInvested > 0;

  const usdValue = usdHoldings.reduce((sum, h) => {
    const p = livePrices[h.id];
    return sum + (p != null ? h.shares * p : h.shares * h.avg_cost);
  }, 0);
  const cadValue = cadHoldings.reduce((sum, h) => {
    const p = livePrices[h.id];
    return sum + (p != null ? h.shares * p : h.shares * h.avg_cost);
  }, 0);
  const usdPnl = usdValue - totalUsdInvested;
  const cadPnl = cadValue - totalCadInvested;
  const usdPnlPct = totalUsdInvested > 0 ? (usdPnl / totalUsdInvested) * 100 : 0;
  const cadPnlPct = totalCadInvested > 0 ? (cadPnl / totalCadInvested) * 100 : 0;
  const hasAnyPrice = holdings.some((h) => livePrices[h.id] != null);

  // ── Refresh all prices ─────────────────────────────────────
  const refreshAllPrices = useCallback(async () => {
    const result = await refreshAll(() => refresh());
    if (result.failed.length === 0) {
      toast.success("Market prices refreshed");
    } else if (result.success > 0) {
      toast.success(`Refreshed ${result.success} of ${result.total} prices. Failed: ${result.failed.join(", ")}`);
    } else {
      toast.error("Could not refresh prices");
    }
  }, [refreshAll]);

  // ── Single price fetch ─────────────────────────────────────
  const [fetchingTickers, setFetchingTickers] = useState<Set<string>>(new Set());
  const fetchPrice = useCallback(async (ticker: string, exchange: string) => {
    const sym = apiTicker(ticker, exchange as any);
    setFetchingTickers((prev) => new Set(prev).add(ticker));
    const result = await fetchStockPrice(sym);
    setFetchingTickers((prev) => { const n = new Set(prev); n.delete(ticker); return n; });
    if (result.ok) {
      refresh();
    } else {
      toast.error(`${ticker}: ${'error' in result ? result.error : "Price unavailable"}`);
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────
  const handleCreate = (data: Omit<Holding, "id" | "created_at">) => {
    addHolding(data);
    setFormOpen(false);
    toast.success("Stock added");
    refresh();
  };

  const handleUpdate = (data: Omit<Holding, "id" | "created_at">) => {
    if (!editing) return;
    editHolding(editing.id, data);
    setEditing(null);
    setFormOpen(false);
    toast.success("Holding updated");
    refresh();
  };

  const handleDelete = (id: string) => {
    removeHolding(id);
    setDeleting(null);
    toast.success("Stock deleted");
    refresh();
  };


  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">DCA Down</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-5">
        {/* ── Portfolio Summary (collapsible) ── */}
        {holdings.length > 0 && (
          <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-5 space-y-4">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setSummaryExpanded((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Portfolio Summary
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{holdings.length} stock{holdings.length !== 1 ? "s" : ""}</span>
                {summaryExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {hasMixed ? (
              <div className="space-y-2">
                <SummaryRow
                  label="USD"
                  prefix="$"
                  invested={totalUsdInvested}
                  value={hasAnyPrice ? usdValue : null}
                  pnl={hasAnyPrice ? usdPnl : null}
                  pnlPct={hasAnyPrice ? usdPnlPct : null}
                />
                <SummaryRow
                  label="CAD"
                  prefix="C$"
                  invested={totalCadInvested}
                  value={hasAnyPrice ? cadValue : null}
                  pnl={hasAnyPrice ? cadPnl : null}
                  pnlPct={hasAnyPrice ? cadPnlPct : null}
                />
              </div>
            ) : (
              <SummaryRow
                label=""
                prefix={totalCadInvested > 0 ? "C$" : "$"}
                invested={totalUsdInvested + totalCadInvested}
                value={hasAnyPrice ? usdValue + cadValue : null}
                pnl={hasAnyPrice ? usdPnl + cadPnl : null}
                pnlPct={hasAnyPrice && (totalUsdInvested + totalCadInvested) > 0 ? ((usdPnl + cadPnl) / (totalUsdInvested + totalCadInvested)) * 100 : null}
              />
            )}

            {/* Dashboard Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Total Holdings" value={String(totalHoldingsCount)} />
              <MetricCard label="Total Shares" value={totalShares.toFixed(4)} />
              <MetricCard label="Total Cost Basis" value={`$${fmt(totalCostBasis)}`} />
              <MetricCard label="Weighted Avg Cost" value={totalShares > 0 ? `$${fmt(weightedAvgCost)}` : "—"} />
            </div>

            {summaryExpanded && (
              <>
                {/* Summary by Holding */}
                <div className="overflow-x-auto">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    By Holding
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticker</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Avg Cost</TableHead>
                        <TableHead className="text-right">Cost Basis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdingsByCostBasis.map((h) => {
                        const cp = currencyPrefix((h.exchange ?? "US") as any);
                        return (
                          <TableRow key={h.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/holdings/${h.id}`)}>
                            <TableCell className="font-mono font-semibold">{h.ticker}</TableCell>
                            <TableCell className="text-right font-mono">{Number(h.shares).toFixed(4)}</TableCell>
                            <TableCell className="text-right font-mono">{cp}{fmt(Number(h.avg_cost))}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{cp}{fmt(h.costBasis)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  {lastRefreshed && (
                    <span className="text-[11px] text-muted-foreground opacity-70">
                      Last refreshed {formatLastRefreshed(lastRefreshed)}
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); refreshAllPrices(); }} disabled={refreshingAll} className="ml-auto">
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshingAll ? "animate-spin" : ""}`} />
                    {refreshingAll ? "Refreshing…" : "Refresh Prices"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Sort + Add Stock row ── */}
        {holdings.length > 0 && (
          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="text-muted-foreground">
                  <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                  Sort: {SORT_LABELS[sortMode]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg z-50">
                {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => handleSortChange(mode)}
                    className={sortMode === mode ? "font-semibold text-primary" : ""}
                  >
                    {SORT_LABELS[mode]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); refreshAllPrices(); }} disabled={refreshingAll}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshingAll ? "animate-spin" : ""}`} />
                {refreshingAll ? "Refreshing…" : "Refresh Prices"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Stock
              </Button>
            </div>
          </div>
        )}

        {/* ── Stock Cards ── */}
        {sortedHoldings.length > 0 ? (
          <div className="space-y-3">
            {sortedHoldings.map((h) => {
              const ex = (h.exchange ?? "US") as any;
              const cp = currencyPrefix(ex);
              const price = livePrices[h.id];
              const pnlData = getPnl(h);
              const dca = latestDca[h.id];
              const invested = h.shares * h.avg_cost;
              const isFetching = fetchingTickers.has(h.ticker);

              // Border accent color
              const borderColor = pnlData
                ? pnlData.pnl >= 0
                  ? "border-l-primary"
                  : "border-l-destructive"
                : "border-l-border";

              return (
                <div
                  key={h.id}
                  className={`group rounded-lg border border-border ${borderColor} border-l-[3px] bg-card hover:bg-muted/40 transition-colors cursor-pointer relative overflow-visible`}
                  onClick={() => navigate(`/holdings/${h.id}`)}
                >
                  <div className="p-4 pr-10 space-y-2">
                    {/* Header row: ticker + price */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg font-bold font-mono tracking-tight">{h.ticker}</span>
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full uppercase">
                          {exchangeLabel(ex)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {price != null ? (
                          <span className="text-base font-bold font-mono">{cp}{fmt(price)}</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); fetchPrice(h.ticker, ex); }}
                            disabled={isFetching}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium whitespace-nowrap flex-shrink-0"
                          >
                            {isFetching ? "…" : "Get Price"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Holdings row */}
                    <p className="text-xs text-muted-foreground">
                      {fmt(h.shares)} shares · Avg {cp}{fmt(h.avg_cost)} · Invested {cp}{fmt(invested)}
                    </p>

                    {/* P&L row */}
                    {pnlData ? (
                      <p className={`text-sm font-mono font-semibold ${pnlData.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                        {pnlData.pnl >= 0 ? "+" : ""}{cp}{fmt(pnlData.pnl)} ({pnlData.pnlPct >= 0 ? "+" : ""}{pnlData.pnlPct.toFixed(1)}%)
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">Fetch price to see P&L</p>
                    )}

                    {/* 52-Week Range Bar */}
                    {(() => {
                      const q = getCachedQuoteForHolding(h.ticker, ex);
                      if (!q || q.week52High == null || q.week52Low == null) return null;
                      const range = q.week52High - q.week52Low;
                      if (range <= 0) return null;
                      const pct = ((q.price - q.week52Low) / range) * 100;
                      const clampedPct = Math.max(0, Math.min(100, pct));
                      const nearLow = pct < 25;
                      const nearHigh = pct > 75;
                      const barColor = nearLow ? "bg-primary" : nearHigh ? "bg-orange-500" : "bg-muted-foreground/40";
                      const dotColor = nearLow ? "bg-primary" : nearHigh ? "bg-orange-500" : "bg-foreground";
                      return (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                            <span>{cp}{fmt(q.week52Low)}</span>
                            <div className="flex-1 relative h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`absolute inset-y-0 left-0 rounded-full ${barColor} opacity-40`} style={{ width: `${clampedPct}%` }} />
                              <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${dotColor} border-2 border-card shadow-sm`} style={{ left: `calc(${clampedPct}% - 5px)` }} />
                            </div>
                            <span>{cp}{fmt(q.week52High)}</span>
                          </div>
                          {nearLow && <span className="text-[10px] font-medium text-primary">Near 52w low</span>}
                          {nearHigh && <span className="text-[10px] font-medium text-orange-500">Near 52w high</span>}
                        </div>
                      );
                    })()}

                    {/* High Volume badge */}
                    {(() => {
                      const q = getCachedQuoteForHolding(h.ticker, ex);
                      if (!q || q.todayVolume == null || q.avgVolume == null || q.avgVolume <= 0) return null;
                      if (q.todayVolume > q.avgVolume * 2) {
                        return <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/40 w-fit">High Volume</Badge>;
                      }
                      return null;
                    })()}

                    {/* DCA summary row */}
                    <div className="rounded-md bg-muted/50 px-3 py-1.5 -mx-1">
                      {dca ? (
                        <p className="text-xs font-mono text-muted-foreground">
                          <span className="font-semibold text-foreground/80">DCA:</span>{" "}
                          Buy {Number(dca.shares_to_buy).toFixed(1)} shares at {cp}{Number(dca.buy_price ?? dca.input1_value).toFixed(2)} →{" "}
                          avg {cp}{Number(dca.new_avg_cost).toFixed(2)}{" "}
                          <span className="text-primary">(↓{cp}{fmt(h.avg_cost - dca.new_avg_cost)} / {((h.avg_cost - dca.new_avg_cost) / h.avg_cost * 100).toFixed(1)}%)</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">No DCA plan — tap to calculate</p>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />

                  {/* Action buttons — always visible on mobile, hover on desktop */}
                  <div className="absolute right-8 top-3 flex items-center gap-0.5 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(h); setFormOpen(true); }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-card hover:bg-muted transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleting(h); }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-card hover:bg-destructive/10 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="rounded-full bg-muted p-4">
              <TrendingDown className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">No holdings yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add your first holding to start tracking your average cost and DCA scenarios.
              </p>
            </div>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </div>
        )}

        {/* Data management moved to Settings tab */}
      </main>

      <HoldingFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        initial={editing}
        loading={false}
        onSubmit={(data) => editing ? handleUpdate(data) : handleCreate(data)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.ticker} and all its data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the stock position and all saved calculations for {deleting?.ticker}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={() => refresh()}
      />
    </div>
  );
}

function SummaryRow({
  label,
  prefix,
  invested,
  value,
  pnl,
  pnlPct,
}: {
  label: string;
  prefix: string;
  invested: number;
  value: number | null;
  pnl: number | null;
  pnlPct: number | null;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex items-center gap-4 flex-wrap text-sm">
      {label && (
        <span className="text-xs font-semibold uppercase text-muted-foreground w-8">{label}</span>
      )}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Invested:</span>
        <span className="font-mono font-semibold">{prefix}{fmt(invested)}</span>
      </div>
      {value != null && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Value:</span>
          <span className="font-mono font-semibold">{prefix}{fmt(value)}</span>
        </div>
      )}
      {pnl != null && pnlPct != null && (
        <span className={`font-mono font-semibold ${pnl >= 0 ? "text-primary" : "text-destructive"}`}>
          {pnl >= 0 ? "+" : ""}{prefix}{fmt(pnl)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
        </span>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-mono font-semibold mt-1">{value}</p>
    </div>
  );
}
