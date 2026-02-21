import { useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Calculator, RotateCcw, Download, Upload,
  TrendingDown, TrendingUp, DollarSign, BarChart3, FileSpreadsheet, Shuffle,
  ChevronRight, RefreshCw, Briefcase, ArrowDownAZ, ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import { ENABLE_LOOKUP_LIMIT } from "@/lib/pro";
import ProSettings from "@/components/ProSettings";
import CsvImportDialog from "@/components/CsvImportDialog";
import {
  getHoldings, addHolding, editHolding, removeHolding,
  getScenariosForHolding, resetAll, exportData, importData,
  type Holding, type Scenario, currencyPrefix, exchangeLabel, apiTicker,
} from "@/lib/storage";
import { fetchStockPrice, type StockQuote } from "@/lib/stock-price";
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

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Holdings() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);
  const [tick, setTick] = useState(0);
  const [csvOpen, setCsvOpen] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    return (localStorage.getItem(SORT_KEY) as SortMode) || "az";
  });
  const fileRef = useRef<HTMLInputElement>(null);

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
    setRefreshingAll(true);
    const symbols = holdings.map((h) => apiTicker(h.ticker, (h.exchange ?? "US") as any));
    const results = await Promise.allSettled(symbols.map((t) => fetchStockPrice(t)));
    let fetched = 0;
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.ok) fetched++;
    });
    setRefreshingAll(false);
    toast.success(`Fetched prices for ${fetched} of ${symbols.length} stocks`);
    refresh();
  }, [holdings]);

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

  const handleReset = useCallback(() => {
    resetAll();
    toast.success("Reset to demo data");
    refresh();
  }, []);

  const handleExport = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dca-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result as string);
        toast.success("Data imported");
        refresh();
      } catch {
        toast.error("Invalid backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">DCA Down</h1>
          <div className="flex items-center gap-1">
            <Button onClick={() => navigate("/what-if")} size="sm" variant="ghost">
              <Shuffle className="mr-1.5 h-4 w-4" />
              What-If
            </Button>
            <Button onClick={() => navigate("/scenarios")} size="sm" variant="ghost">
              <BarChart3 className="mr-1.5 h-4 w-4" />
              All Scenarios
            </Button>
            {ENABLE_LOOKUP_LIMIT && <ProSettings onChanged={refresh} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-5">
        {/* ── Portfolio Summary Card ── */}
        {holdings.length > 0 && (
          <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Portfolio Summary
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{holdings.length} stock{holdings.length !== 1 ? "s" : ""}</span>
                <Button size="sm" variant="outline" onClick={refreshAllPrices} disabled={refreshingAll}>
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshingAll ? "animate-spin" : ""}`} />
                  {refreshingAll ? "Fetching…" : "Refresh All"}
                </Button>
              </div>
            </div>

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
                  className={`group rounded-lg border border-border ${borderColor} border-l-[3px] bg-card hover:bg-muted/40 transition-colors cursor-pointer relative`}
                  onClick={() => navigate(`/holdings/${h.id}/dca`)}
                >
                  <div className="p-4 pr-10 space-y-2">
                    {/* Header row: ticker + price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
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
                            className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
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

                  {/* Action buttons (on hover) */}
                  <div className="absolute right-8 top-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(h); setFormOpen(true); }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleting(h); }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
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
              <h3 className="text-lg font-semibold">Add your first stock to get started</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Track your positions, calculate DCA targets, and run What-If scenarios to optimize your portfolio.
              </p>
            </div>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </div>
        )}

        {/* Data management buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <Button onClick={handleReset} size="sm" variant="outline">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset Everything
          </Button>
          <Button onClick={handleExport} size="sm" variant="outline">
            <Download className="mr-1.5 h-4 w-4" />
            Export Data
          </Button>
          <Button onClick={() => fileRef.current?.click()} size="sm" variant="outline">
            <Upload className="mr-1.5 h-4 w-4" />
            Import Data
          </Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
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
