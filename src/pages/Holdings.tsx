import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2,
  TrendingDown, TrendingUp, DollarSign, FileSpreadsheet,
  ChevronRight, ChevronDown, RefreshCw, Briefcase, ArrowUpDown,
  Gauge, Activity, BarChart3, Wallet, CheckSquare, Square, X, Zap, ArrowDownRight,
} from "lucide-react";
import { useRefreshPrices, formatLastRefreshed } from "@/hooks/use-refresh-prices";
import { Button } from "@/components/ui/button";
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
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  // ── Portfolio metrics ──────────────────────────────────
  const usdHoldings = holdings.filter((h) => (h.exchange ?? "US") === "US");
  const cadHoldings = holdings.filter((h) => (h.exchange ?? "US") === "TSX");
  const totalUsdInvested = usdHoldings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const totalCadInvested = cadHoldings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const totalCostBasis = totalUsdInvested + totalCadInvested;
  const hasAnyPrice = holdings.some((h) => livePrices[h.id] != null);

  const usdValue = usdHoldings.reduce((sum, h) => {
    const p = livePrices[h.id];
    return sum + (p != null ? h.shares * p : h.shares * h.avg_cost);
  }, 0);
  const cadValue = cadHoldings.reduce((sum, h) => {
    const p = livePrices[h.id];
    return sum + (p != null ? h.shares * p : h.shares * h.avg_cost);
  }, 0);
  const totalMarketValue = usdValue + cadValue;
  const totalPnl = totalMarketValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

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
  const handleCreate = (data: Omit<Holding, "id" | "created_at" | "initial_avg_cost">) => {
    addHolding(data);
    setFormOpen(false);
    toast.success("Stock added");
    refresh();
  };

  const handleUpdate = (data: Omit<Holding, "id" | "created_at" | "initial_avg_cost">) => {
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

  const handleBulkDelete = () => {
    selected.forEach((id) => removeHolding(id));
    toast.success(`Deleted ${selected.size} holding${selected.size !== 1 ? "s" : ""}`);
    setSelected(new Set());
    setSelectMode(false);
    setBulkDeleting(false);
    refresh();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === holdings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(holdings.map((h) => h.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">DCA.</span>{" "}
            <span className="text-foreground">Strategy Engine</span>
          </h1>
          {holdings.length > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={refreshAllPrices} disabled={refreshingAll}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshingAll ? "animate-spin" : ""}`} />
                {refreshingAll ? "…" : "Refresh"}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {holdings.length === 0 ? (
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
            <div className="flex items-center gap-3">
              <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Stock
              </Button>
              <Button variant="outline" size="lg" onClick={() => setCsvOpen(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════════
                SECTION 1 — Portfolio Health
               ════════════════════════════════════════════════ */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Portfolio Health
                </h2>
                {lastRefreshed && (
                  <span className="ml-auto text-[10px] text-muted-foreground/50">
                    Updated {formatLastRefreshed(lastRefreshed)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <HealthCard
                  icon={<Wallet className="h-4 w-4" />}
                  label="Market Value"
                  value={hasAnyPrice ? `$${fmt(totalMarketValue)}` : "—"}
                />
                <HealthCard
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Cost Basis"
                  value={`$${fmt(totalCostBasis)}`}
                />
                <HealthCard
                  icon={hasAnyPrice && totalPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  label="Unrealized P/L"
                  value={hasAnyPrice ? `${totalPnl >= 0 ? "+" : ""}$${fmt(totalPnl)}` : "—"}
                  sub={hasAnyPrice ? `${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(1)}%` : undefined}
                  accent={hasAnyPrice ? (totalPnl >= 0 ? "positive" : "negative") : undefined}
                />
                <HealthCard
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Holdings"
                  value={String(holdings.length)}
                />
              </div>
            </section>

            {/* ════════════════════════════════════════════════
                SECTION 1.5 — Next Best Move
               ════════════════════════════════════════════════ */}
            <NextBestMove holdings={holdings} livePrices={livePrices} navigate={navigate} />

            {/* ════════════════════════════════════════════════
                SECTION 2 — DCA Opportunities
               ════════════════════════════════════════════════ */}
            <section>
              <DcaOpportunities holdings={holdings} livePrices={livePrices} navigate={navigate} />
            </section>

            {/* ════════════════════════════════════════════════
                SECTION 2.5 — Strategy Impact
               ════════════════════════════════════════════════ */}
            <StrategyImpact holdings={holdings} />

            {/* Divider */}
            <div className="border-t border-border" />

            {/* ════════════════════════════════════════════════
                SECTION 3 — Your Holdings
               ════════════════════════════════════════════════ */}
            <section>
              {/* Section header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4.5 w-4.5 text-muted-foreground" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Your Holdings
                  </h2>
                </div>

                {selectMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selected.size === holdings.length ? "Deselect All" : "Select All"}
                    </button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8"
                      disabled={selected.size === 0}
                      onClick={() => setBulkDeleting(true)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      <span className="text-xs">Delete ({selected.size})</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={exitSelectMode}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="text-muted-foreground h-8 px-2" onClick={() => setSelectMode(true)}>
                      <CheckSquare className="mr-1 h-3 w-3" />
                      <span className="text-xs">Select</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-muted-foreground h-8 px-2">
                          <ArrowUpDown className="mr-1 h-3 w-3" />
                          <span className="text-xs">{SORT_LABELS[sortMode]}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border border-border shadow-lg z-50">
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
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setCsvOpen(true)}>
                      <FileSpreadsheet className="mr-1 h-3 w-3" />
                      <span className="text-xs">CSV</span>
                    </Button>
                    <Button size="sm" className="h-8" onClick={() => { setEditing(null); setFormOpen(true); }}>
                      <Plus className="mr-1 h-3 w-3" />
                      <span className="text-xs">Add</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Holdings list */}
              <div className="space-y-1">
                {sortedHoldings.map((h) => {
                  const ex = (h.exchange ?? "US") as any;
                  const cp = currencyPrefix(ex);
                  const price = livePrices[h.id];
                  const pnlData = getPnl(h);
                  const isFetching = fetchingTickers.has(h.ticker);
                  const isSelected = selected.has(h.id);

                  return (
                    <div
                      key={h.id}
                      className={`group rounded-lg border border-border ${isSelected ? "bg-destructive/5" : "bg-card hover:bg-muted/30"} transition-colors cursor-pointer relative`}
                      onClick={() => selectMode ? toggleSelect(h.id) : navigate(`/holdings/${h.id}`)}
                    >
                      <div className={`px-4 py-3 ${selectMode ? "pl-3" : "pr-10"}`}>
                        <div className="flex items-center gap-3">
                          {selectMode && (
                            <div className="shrink-0">
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-destructive" />
                              ) : (
                                <Square className="h-5 w-5 text-muted-foreground/40" />
                              )}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Row: ticker | shares | avg | price | P/L */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-bold font-mono tracking-tight">{h.ticker}</span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full uppercase">{exchangeLabel(ex)}</span>
                              </div>
                              {pnlData ? (
                                <span className={`text-sm font-mono font-semibold shrink-0 ${pnlData.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                                  {pnlData.pnl >= 0 ? "+" : ""}{cp}{fmt(pnlData.pnl)}
                                </span>
                              ) : (
                                !selectMode && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); fetchPrice(h.ticker, ex); }}
                                    disabled={isFetching}
                                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium shrink-0"
                                  >
                                    {isFetching ? "…" : "Get Price"}
                                  </button>
                                )
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono mt-0.5">
                              <span>{fmt(h.shares)} sh</span>
                              <span className="text-muted-foreground/30">·</span>
                              <span>Avg {cp}{fmt(h.avg_cost)}</span>
                              {price != null && (
                                <>
                                  <span className="text-muted-foreground/30">·</span>
                                  <span>Price {cp}{fmt(price)}</span>
                                </>
                              )}
                              {pnlData && (
                                <>
                                  <span className="text-muted-foreground/30">·</span>
                                  <span className={pnlData.pnl >= 0 ? "text-primary" : "text-destructive"}>
                                    {pnlData.pnlPct >= 0 ? "+" : ""}{pnlData.pnlPct.toFixed(1)}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!selectMode && (
                        <>
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                          <div className="absolute right-8 top-2 flex items-center gap-0.5 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
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

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleting} onOpenChange={(open) => !open && setBulkDeleting(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} holding{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selected.size === holdings.length ? "all holdings" : `${selected.size} selected holding${selected.size !== 1 ? "s" : ""}`} and their saved calculations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selected.size} holding{selected.size !== 1 ? "s" : ""}
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

/* ── Health Card ─────────────────────────────────────────── */
function HealthCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: "positive" | "negative";
}) {
  const accentColor = accent === "positive"
    ? "text-primary"
    : accent === "negative"
    ? "text-destructive"
    : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold leading-none display-num ${accentColor}`}>{value}</p>
      {sub && (
        <p className={`text-xs font-mono font-medium ${accentColor}`}>{sub}</p>
      )}
    </div>
  );
}

/* ── DCA Opportunities ──────────────────────────────────── */
function DcaOpportunities({
  holdings,
  livePrices,
  navigate,
}: {
  holdings: Holding[];
  livePrices: Record<string, number | null>;
  navigate: (path: string) => void;
}) {
  const TEST_INVESTMENT = 500;

  const scored = useMemo(() => {
    const raw = holdings
      .map((h) => {
        const price = livePrices[h.id];
        if (price == null || price <= 0) return null;
        if (price >= h.avg_cost) return { holding: h, price, improvement: 0, score: 0 };
        const sharesBought = TEST_INVESTMENT / price;
        const newAvg = (h.shares * h.avg_cost + TEST_INVESTMENT) / (h.shares + sharesBought);
        const improvement = h.avg_cost - newAvg;
        return { holding: h, price, improvement: Math.max(0, improvement), score: 0 };
      })
      .filter(Boolean) as { holding: Holding; price: number; improvement: number; score: number }[];

    const maxImprovement = Math.max(...raw.map((r) => r.improvement), 0.001);
    for (const r of raw) {
      r.score = Math.round((r.improvement / maxImprovement) * 100);
    }
    return raw.sort((a, b) => b.score - a.score);
  }, [holdings, livePrices]);

  if (holdings.length === 0) return null;

  const hasAnyPrice = scored.length > 0;

  const getBandLabel = (score: number) => {
    if (score >= 80) return "Strong opportunity";
    if (score >= 60) return "Good opportunity";
    if (score >= 40) return "Neutral";
    if (score >= 20) return "Weak";
    return "Inefficient";
  };

  const top = scored[0];
  const rest = scored.slice(1);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="h-4.5 w-4.5 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          DCA Opportunities
        </h2>
        <span className="ml-auto text-[10px] text-muted-foreground/40">$500 test investment</span>
      </div>

      {!hasAnyPrice ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Add current prices to evaluate DCA opportunities.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* ── Best Opportunity — featured card ── */}
          {top && top.score > 0 && (() => {
            const h = top.holding;
            const cp = currencyPrefix((h.exchange ?? "US") as any);
            return (
              <button
                key={h.id}
                onClick={() => navigate(`/holdings/${h.id}?tab=strategy`)}
                className="w-full rounded-xl border border-primary/20 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Best Opportunity</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-mono font-bold">{h.ticker}</span>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      ${TEST_INVESTMENT} → Avg drops {cp}{fmt(top.improvement)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                      Avg {cp}{fmt(h.avg_cost)} · Price {cp}{fmt(top.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-mono font-bold text-primary leading-none">{top.score}</span>
                    <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">/100</span>
                  </div>
                </div>
              </button>
            );
          })()}

          {/* ── Remaining opportunities — compact rows ── */}
          {rest.length > 0 && (
            <div className="space-y-0.5">
              {rest.map(({ holding: h, price, score, improvement }) => {
                const cp = currencyPrefix((h.exchange ?? "US") as any);
                return (
                  <button
                    key={h.id}
                    onClick={() => navigate(`/holdings/${h.id}?tab=strategy`)}
                    className="w-full flex items-center gap-3 rounded-lg bg-card hover:bg-muted/30 border border-border px-3 py-2.5 text-left transition-colors"
                  >
                    <span className="text-sm font-mono font-bold text-muted-foreground w-8 text-right shrink-0">{score}</span>
                    <span className="text-sm font-mono font-semibold w-16 shrink-0">{h.ticker}</span>
                    <span className="text-[11px] text-muted-foreground font-mono flex-1 truncate">
                      {improvement > 0
                        ? `$${TEST_INVESTMENT} → avg drops ${cp}${fmt(improvement)}`
                        : "No benefit at current price"}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[9px] text-muted-foreground/40 text-center pt-1">
            Analytical indicator only — not financial advice
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Next Best Move ─────────────────────────────────────── */
function NextBestMove({
  holdings,
  livePrices,
  navigate,
}: {
  holdings: Holding[];
  livePrices: Record<string, number | null>;
  navigate: (path: string) => void;
}) {
  const TEST_INVESTMENT = 500;

  const best = useMemo(() => {
    let top: { holding: Holding; price: number; newAvg: number; improvement: number } | null = null;
    let maxImprovement = 0;

    for (const h of holdings) {
      const price = livePrices[h.id];
      if (price == null || price <= 0 || price >= h.avg_cost) continue;
      const sharesBought = TEST_INVESTMENT / price;
      const newAvg = (h.shares * h.avg_cost + TEST_INVESTMENT) / (h.shares + sharesBought);
      const improvement = h.avg_cost - newAvg;
      if (improvement > maxImprovement) {
        maxImprovement = improvement;
        top = { holding: h, price, newAvg, improvement };
      }
    }
    return top;
  }, [holdings, livePrices]);

  if (!best) return null;

  const h = best.holding;
  const cp = currencyPrefix((h.exchange ?? "US") as any);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Next Best Move
        </h2>
      </div>
      <button
        onClick={() => navigate(`/holdings/${h.id}?tab=strategy`)}
        className="w-full rounded-xl border border-primary/15 bg-primary/[0.04] p-4 text-left hover:bg-primary/[0.08] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-mono font-bold">{h.ticker}</span>
            <p className="text-sm font-mono text-foreground mt-1">
              ${TEST_INVESTMENT} → Avg becomes {cp}{fmt(best.newAvg)}
            </p>
            <p className="flex items-center gap-1 text-sm font-mono font-medium text-primary mt-0.5">
              <ArrowDownRight className="h-3.5 w-3.5" />
              Improves avg by {cp}{fmt(best.improvement)}
            </p>
            <p className="text-[10px] text-muted-foreground/50 font-mono mt-1.5">
              Current avg {cp}{fmt(h.avg_cost)} · Price {cp}{fmt(best.price)}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        </div>
      </button>
    </section>
  );
}

/* ── Strategy Impact ────────────────────────────────────── */
function StrategyImpact({ holdings }: { holdings: Holding[] }) {
  const improved = holdings.filter((h) => h.initial_avg_cost > h.avg_cost);
  if (improved.length === 0) return null;

  const totalReduction = improved.reduce((sum, h) => sum + (h.initial_avg_cost - h.avg_cost) * h.shares, 0);
  const avgReduction = improved.reduce((sum, h) => sum + (h.initial_avg_cost - h.avg_cost), 0) / improved.length;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Strategy Impact
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Positions Improved</p>
          <p className="text-lg font-mono font-bold mt-1">{improved.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Reduction</p>
          <p className="text-lg font-mono font-bold text-primary mt-1">${fmt(avgReduction)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Cost Reduction</p>
          <p className="text-lg font-mono font-bold text-primary mt-1">${fmt(totalReduction)}</p>
        </div>
      </div>
    </section>
  );
}
