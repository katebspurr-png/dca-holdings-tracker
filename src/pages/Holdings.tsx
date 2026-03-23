import { useState, useCallback, useMemo, useEffect } from "react";
import Onboarding, { getOnboardingDone } from "@/components/onboarding";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  FileSpreadsheet,
  ChevronRight,
  RefreshCw,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
  MoreHorizontal,
  SlidersHorizontal,
  Gauge,
  Zap,
  ArrowDownRight,
} from "lucide-react";
import { useRefreshPrices, formatLastRefreshed } from "@/hooks/use-refresh-prices";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import CsvImportDialog from "@/components/CsvImportDialog";
import {
  getHoldings,
  addHolding,
  editHolding,
  removeHolding,
  getScenariosForHolding,
  type Holding,
  type Scenario,
  currencyPrefix,
  apiTicker,
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

const AVATAR_PALETTE = [
  "bg-white text-black",
  "bg-[#76b900] text-white",
  "bg-[#627eea] text-white",
  "bg-[#e31937] text-white",
] as const;

function avatarClassForTicker(ticker: string): string {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h + ticker.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]!;
}

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
  const key = apiTicker(ticker, exchange as "US" | "TSX").toUpperCase();
  const entry = cache[key];
  return entry ? entry.price : null;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Holdings() {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(() => !getOnboardingDone());
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

  const livePrices = useMemo(() => {
    const prices: Record<string, number | null> = {};
    holdings.forEach((h) => {
      prices[h.id] = getCachedPrice(h.ticker, h.exchange ?? "US");
    });
    return prices;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, tick]);

  const latestDca = useMemo(() => {
    const map: Record<string, Scenario | null> = {};
    holdings.forEach((h) => {
      const scenarios = getScenariosForHolding(h.id);
      map[h.id] = scenarios.length > 0 ? scenarios[0]! : null;
    });
    return map;
  }, [holdings, tick]);

  const getPnl = (h: Holding) => {
    const price = livePrices[h.id];
    if (price == null) return null;
    const pnl = (price - h.avg_cost) * h.shares;
    const pnlPct = h.avg_cost > 0 ? ((price - h.avg_cost) / h.avg_cost) * 100 : 0;
    return { pnl, pnlPct, price };
  };

  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings];
    switch (sortMode) {
      case "az":
        sorted.sort((a, b) => a.ticker.localeCompare(b.ticker));
        break;
      case "position":
        sorted.sort((a, b) => b.shares * b.avg_cost - a.shares * a.avg_cost);
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

  const [fetchingTickers, setFetchingTickers] = useState<Set<string>>(new Set());
  const fetchPrice = useCallback(async (ticker: string, exchange: string) => {
    const sym = apiTicker(ticker, exchange as "US" | "TSX");
    setFetchingTickers((prev) => new Set(prev).add(ticker));
    const result = await fetchStockPrice(sym);
    setFetchingTickers((prev) => {
      const n = new Set(prev);
      n.delete(ticker);
      return n;
    });
    if (result.ok) {
      refresh();
    } else {
      toast.error(`${ticker}: ${"error" in result ? result.error : "Price unavailable"}`);
    }
  }, []);

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const displayDollar = (n: number) => `$${fmt(n)}`;

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
      {showOnboarding && (
        <Onboarding onDone={() => setShowOnboarding(false)} />
      )}
      {holdings.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 pb-24 pt-20 text-center">
          <div className="mb-4 rounded-full bg-stitch-card p-4 ring-1 ring-stitch-border">
            <TrendingDown className="h-10 w-10 text-stitch-muted" />
          </div>
          <h3 className="text-lg font-semibold text-white">No holdings yet</h3>
          <p className="mt-2 max-w-sm text-sm text-stitch-muted">
            Add your first holding to start tracking average cost and DCA scenarios.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              className="bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
              onClick={() => setCsvOpen(true)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </div>
        </div>
      ) : (
        <>
          <header className="mb-8 px-4 pt-12 text-center sm:px-6 md:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              Modernized DCA
              <br />
              Portfolio Dashboard
            </h1>
          </header>

          <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col gap-4 px-4 sm:px-6 md:px-8">
            {selectMode && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stitch-border bg-stitch-card px-3 py-2 text-xs">
                <button type="button" onClick={toggleSelectAll} className="text-stitch-muted-soft hover:text-white">
                  {selected.size === holdings.length ? "Deselect all" : "Select all"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selected.size === 0}
                    onClick={() => setBulkDeleting(true)}
                    className="font-medium text-stitch-danger disabled:opacity-40"
                  >
                    Delete ({selected.size})
                  </button>
                  <button type="button" onClick={exitSelectMode} className="text-stitch-muted hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Total Portfolio */}
            <section className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
              <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
              <div className="relative z-10 mb-4 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-white">Total Portfolio</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-stitch-pill ring-0 focus:outline-none"
                      aria-label="Portfolio menu"
                    >
                      <MoreHorizontal className="h-4 w-4 text-stitch-accent" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="z-50 border-stitch-border bg-stitch-card text-white"
                  >
                    <DropdownMenuItem
                      className="focus:bg-stitch-pill focus:text-white"
                      onClick={() => refreshAllPrices()}
                      disabled={refreshingAll}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${refreshingAll ? "animate-spin" : ""}`} />
                      Refresh prices
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-stitch-pill focus:text-white"
                      onClick={() => navigate("/update-prices")}
                    >
                      Update Prices page
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-stitch-pill focus:text-white"
                      onClick={() => setCsvOpen(true)}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Import CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-stitch-pill focus:text-white"
                      onClick={() => setSelectMode(true)}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Select holdings
                    </DropdownMenuItem>
                    {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                      <DropdownMenuItem
                        key={mode}
                        className="focus:bg-stitch-pill focus:text-white"
                        onClick={() => handleSortChange(mode)}
                      >
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        Sort: {SORT_LABELS[mode]}
                        {sortMode === mode ? " ✓" : ""}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative z-10 mb-6 flex items-end justify-between">
                <div>
                  <p className="mb-1 text-[15px] text-stitch-muted">Current Value:</p>
                  <p className="text-[34px] font-bold leading-none text-stitch-accent">
                    {hasAnyPrice ? displayDollar(totalMarketValue) : "—"}
                  </p>
                </div>
                <PortfolioSparkline positive={totalPnl >= 0} />
              </div>

              <div className="relative z-10 flex justify-between">
                <div>
                  <p className="mb-1 text-[15px] text-stitch-muted">Total Invested:</p>
                  <p className="text-[20px] font-medium text-white">{displayDollar(totalCostBasis)}</p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-[15px] text-stitch-muted">P&amp;L:</p>
                  <p
                    className={`text-[20px] font-medium ${
                      !hasAnyPrice ? "text-stitch-muted" : totalPnl >= 0 ? "text-stitch-accent" : "text-stitch-danger"
                    }`}
                  >
                    {hasAnyPrice
                      ? `${totalPnl >= 0 ? "+" : ""}${displayDollar(totalPnl)} (${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%)`
                      : "—"}
                  </p>
                </div>
              </div>
              {lastRefreshed && (
                <p className="relative z-10 mt-3 text-[10px] text-stitch-muted/70">
                  Updated {formatLastRefreshed(lastRefreshed)}
                </p>
              )}
            </section>

            <NextBestMove holdings={holdings} livePrices={livePrices} navigate={navigate} />

            <section className="mt-2">
              <DcaOpportunities holdings={holdings} livePrices={livePrices} navigate={navigate} />
            </section>

            <StrategyImpact holdings={holdings} />

            {/* Asset grid */}
            <section className="grid grid-cols-2 gap-4">
              {sortedHoldings.map((h) => {
                const ex = (h.exchange ?? "US") as "US" | "TSX";
                const cp = currencyPrefix(ex);
                const price = livePrices[h.id];
                const scenario = latestDca[h.id];
                const isSelected = selected.has(h.id);
                const underwater = price != null && price < h.avg_cost;
                const sliderColor = !price ? "text-stitch-muted" : underwater ? "text-stitch-accent" : "text-stitch-danger";

                return (
                  <article
                    key={h.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => (selectMode ? toggleSelect(h.id) : navigate(`/holdings/${h.id}`))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectMode ? toggleSelect(h.id) : navigate(`/holdings/${h.id}`);
                      }
                    }}
                    className={`relative flex flex-col rounded-[24px] border border-stitch-border bg-stitch-card p-4 shadow-md outline-none transition-opacity ${
                      isSelected ? "ring-2 ring-stitch-accent/60" : ""
                    }`}
                  >
                    {selectMode && (
                      <div className="absolute right-2 top-2">
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-stitch-accent" />
                        ) : (
                          <Square className="h-5 w-5 text-stitch-muted/50" />
                        )}
                      </div>
                    )}
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarClassForTicker(h.ticker)}`}
                        >
                          {h.ticker.slice(0, 1)}
                        </div>
                        <span className="text-[15px] font-bold">{h.ticker}</span>
                      </div>
                      <button
                        type="button"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/holdings/${h.id}?tab=strategy`);
                        }}
                        aria-label="Strategy"
                      >
                        <SlidersHorizontal className={`h-4 w-4 ${sliderColor}`} />
                      </button>
                    </div>

                    <p className="mb-2 text-[22px] font-bold">
                      {price != null ? `${cp}${fmt(price)}` : "—"}
                    </p>

                    {!selectMode && price == null && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchPrice(h.ticker, ex);
                        }}
                        disabled={fetchingTickers.has(h.ticker)}
                        className="mb-2 text-left text-[11px] font-medium text-stitch-accent hover:underline"
                      >
                        {fetchingTickers.has(h.ticker) ? "Loading…" : "Get price"}
                      </button>
                    )}

                    <div className="mb-3 flex items-center justify-between text-[13px] text-stitch-muted">
                      <span>Your Average:</span>
                      <span className="text-stitch-muted-soft">{cp}{fmt(h.avg_cost)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/holdings/${h.id}?tab=strategy`);
                      }}
                      className="mb-3 flex w-full items-center justify-between rounded-xl bg-stitch-accent px-3 py-2 text-left text-[13px] font-semibold text-black"
                    >
                      <span className="leading-tight">
                        Target Average:
                        <br />
                        <span className="text-[15px]">
                          {scenario ? `${cp}${fmt(scenario.new_avg_cost)}` : "Plan in Strategy"}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </button>

                    <p className="flex-1 text-[12px] leading-tight text-stitch-muted">
                      Buy to Reach Target:
                      <br />
                      {scenario && scenario.buy_price != null ? (
                        <>
                          <span className="text-stitch-muted-soft">
                            {fmt(scenario.shares_to_buy)} shares at {cp}
                            {fmt(scenario.buy_price)}
                          </span>
                          <br />
                          {underwater && price != null && price > 0 && (
                            <span className="text-stitch-accent">
                              (+{(((h.avg_cost - price) / price) * 100).toFixed(1)}% vs. market)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-stitch-muted-soft/80">Save a scenario on the Strategy tab</span>
                      )}
                    </p>

                    {!selectMode && (
                      <div className="mt-2 flex gap-2 border-t border-stitch-border/50 pt-2">
                        <button
                          type="button"
                          className="text-[11px] text-stitch-muted hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(h);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 inline h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-stitch-danger/90 hover:text-stitch-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(h);
                          }}
                        >
                          <Trash2 className="mr-1 inline h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          </main>

          <div className="fixed bottom-24 right-4 z-50 sm:right-6 md:right-8">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-full border border-stitch-border bg-stitch-pill py-3 pl-4 pr-5 shadow-xl transition-colors hover:bg-[#3a3a3c]"
            >
              <Plus className="h-5 w-5 text-stitch-accent" strokeWidth={2.5} />
              <span className="font-semibold text-stitch-accent">Add Stock</span>
            </button>
          </div>
        </>
      )}

      <HoldingFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        loading={false}
        onSubmit={(data) => (editing ? handleUpdate(data) : handleCreate(data))}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.ticker} and all its data?</AlertDialogTitle>
            <AlertDialogDescription className="text-stitch-muted">
              This will permanently delete the stock position and all saved calculations for {deleting?.ticker}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stitch-border bg-transparent text-white hover:bg-stitch-pill">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting.id)}
              className="bg-stitch-danger text-white hover:bg-stitch-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleting} onOpenChange={(open) => !open && setBulkDeleting(false)}>
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size} holding{selected.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stitch-muted">
              This will permanently delete{" "}
              {selected.size === holdings.length
                ? "all holdings"
                : `${selected.size} selected holding${selected.size !== 1 ? "s" : ""}`}{" "}
              and their saved calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stitch-border bg-transparent text-white hover:bg-stitch-pill">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-stitch-danger text-white hover:bg-stitch-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImported={() => refresh()} />
    </div>
  );
}

function PortfolioSparkline({ positive }: { positive: boolean }) {
  const stroke = positive ? "#C4FB35" : "#ff453a";
  const fillId = positive ? "stitch-graph-grad-pos" : "stitch-graph-grad-neg";
  return (
    <div className="relative h-16 w-32">
      <svg className="h-full w-full overflow-visible" viewBox="0 0 100 50" aria-hidden>
        <defs>
          <linearGradient id={fillId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 45 C 10 35, 20 40, 30 30 C 40 20, 50 35, 60 25 C 70 15, 80 20, 90 5 L 100 0 L 100 50 L 0 50 Z"
          fill={`url(#${fillId})`}
        />
        <path
          d="M 0 45 C 10 35, 20 40, 30 30 C 40 20, 50 35, 60 25 C 70 15, 80 20, 90 5 L 100 0"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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
  const [showAll, setShowAll] = useState(false);

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
  const top = scored[0];
  const rest = scored.slice(1);
  const visibleRest = showAll ? rest : rest.slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="h-4.5 w-4.5 text-primary" />
        <h2 className="section-label">
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
                className="w-full rounded-xl border p-4 text-left card-glow glow-primary hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Best Opportunity</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.35rem", letterSpacing: "-0.02em", lineHeight: 1 }}>{h.ticker}</span>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      ${TEST_INVESTMENT} → Avg drops {cp}{fmt(top.improvement)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                      Avg {cp}{fmt(h.avg_cost)} · Price {cp}{fmt(top.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "2.5rem", color: "hsl(160 60% 52%)", letterSpacing: "-0.02em", lineHeight: 1 }}>{top.score}</span>
                    <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">/100</span>
                  </div>
                </div>
              </button>
            );
          })()}

          {/* ── Remaining opportunities — compact rows ── */}
          {rest.length > 0 && (
            <div className="space-y-0.5">
              {visibleRest.map(({ holding: h, price, score, improvement }) => {
                const cp = currencyPrefix((h.exchange ?? "US") as any);
                return (
                  <button
                    key={h.id}
                    onClick={() => navigate(`/holdings/${h.id}?tab=strategy`)}
                    className="w-full flex items-center gap-3 rounded-lg bg-card hover:bg-muted/30 border border-border px-3 py-2.5 text-left transition-colors"
                  >
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1rem", color: "hsl(160 60% 52% / 0.65)", width: 28, textAlign: "right" as const, flexShrink: 0 }}>{score}</span>
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
              {rest.length > 3 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="w-full text-center text-[11px] text-muted-foreground/50 hover:text-muted-foreground py-1.5 transition-colors"
                >
                  {showAll ? "Show less" : `Show all ${rest.length} opportunities`}
                </button>
              )}
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
        <h2 className="section-label">
          Next Best Move
        </h2>
      </div>
      <button
        onClick={() => navigate(`/holdings/${h.id}?tab=strategy`)}
        className="w-full rounded-xl border p-4 text-left card-glow glow-primary hover:border-primary/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", lineHeight: 1 }}>{h.ticker}</span>
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
        <h2 className="section-label">
          Strategy Impact
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Positions Improved</p>
          <p className="mt-1" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em", lineHeight: 1 }}>{improved.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Reduction</p>
          <p className="mt-1 text-primary" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em", lineHeight: 1 }}>${fmt(avgReduction)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Cost Reduction</p>
          <p className="mt-1 text-primary" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em", lineHeight: 1 }}>${fmt(totalReduction)}</p>
        </div>
      </div>
    </section>
  );
}
